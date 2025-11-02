import json
import os
import boto3
import stripe
import logging
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

# --- Initialize Clients and Environment Variables ---
logger = logging.getLogger()
logger.setLevel(logging.INFO)

stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')
webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL')

# Initialize AWS clients
ses_client = boto3.client('ses', region_name='ca-central-1')
dynamodb = boto3.resource('dynamodb')
iot_client = boto3.client('iot-data')

# Get resources from environment variables
DYNAMODB_TABLE_NAME = os.environ.get('DYNAMODB_TABLE_NAME')
PRINTER_TOPIC = os.environ.get('PRINTER_TOPIC')
orders_table = dynamodb.Table(DYNAMODB_TABLE_NAME) if DYNAMODB_TABLE_NAME else None

# --- Helper Functions ---
def replace_floats_with_decimals(obj):
    if isinstance(obj, list):
        return [replace_floats_with_decimals(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: replace_floats_with_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, float):
        return Decimal(str(obj))
    else:
        return obj

def safe_decimal_from_metadata(value):
    if value is None or value == '':
        return None
    try:
        return Decimal(str(value))
    except (ValueError, TypeError):
        logger.warning(f"Could not convert '{value}' to Decimal")
        return None

# --- Email Sending Logic ---
def send_receipt_email(recipient_email, order_details, payment_details, items_list):
    if not recipient_email:
        logger.warning("No recipient email found. Skipping receipt.")
        return False
    
    if not SENDER_EMAIL:
        logger.error("SENDER_EMAIL environment variable not set. Cannot send email.")
        return False

    try:
        with open('emailtemplate.html', 'r', encoding='utf-8') as f:
            html_template = f.read()

        # --- SERVER-SIDE FORMATTING FOR NEW TEMPLATE ---
        
        # 1. Format Amount
        total_decimal = order_details.get('total', Decimal('0.00'))
        amount_text = f"CA${total_decimal:.2f}"

        # 2. Format Date
        date_text = "N/A"
        paid_at_iso = order_details.get('paidAt_iso')
        if paid_at_iso:
            try:
                date_obj = datetime.fromisoformat(paid_at_iso.replace('Z', '+00:00'))
                date_text = date_obj.strftime('%b %d, %Y') # Format: Oct 09, 2025
            except (ValueError, TypeError) as e:
                logger.error(f"Could not parse date {paid_at_iso}: {e}")

        # 3. Generate Payment Method Chips HTML
        chips_html = ''
        card_details = payment_details.get('card', {})
        brand = str(card_details.get('brand', 'card')).lower()
        last4 = card_details.get('last4', '')
        wallet = card_details.get('wallet')
        if wallet:
            wallet_type = str(wallet.get('type') if isinstance(wallet, dict) else wallet).lower()
            if 'apple_pay' in wallet_type:
                chips_html = '<div style="display: inline-block; border-radius: 9999px; background-color: #000000; padding: 4px 10px; font-size: 12px; font-weight: 500; color: #ffffff;">Apple Pay</div>'
        else:
            if brand == 'visa':
                chips_html = f'<div style="display: inline-block; border-radius: 9999px; background-color: #2563eb; padding: 4px 10px; font-size: 12px; font-weight: 500; color: #ffffff;">VISA •••• {last4}</div>'
            elif brand == 'mastercard':
                chips_html = f'<div style="display: inline-block; border-radius: 9999px; background-color: #ea580c; padding: 4px 10px; font-size: 12px; font-weight: 500; color: #ffffff;">Mastercard •••• {last4}</div>'
            elif brand == 'amex':
                chips_html = f'<div style="display: inline-block; border-radius: 9999px; background-color: #0284c7; padding: 4px 10px; font-size: 12px; font-weight: 500; color: #ffffff;">AMEX •••• {last4}</div>'
            else:
                chips_html = f'<div style="display: inline-block; border-radius: 9999px; background-color: #334155; padding: 4px 10px; font-size: 12px; font-weight: 500; color: #ffffff;">Card •••• {last4}</div>'

        # 4. Generate Itemized List HTML
        items_html_rows = []
        for item in items_list:
            quantity = item.get('quantity', 1)
            name = item.get('menuItem', {}).get('name', 'N/A')
            price = Decimal(item.get('finalPrice', '0.00'))
            item_row_html = f"""
                <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #0f172a;">{quantity}x {name}</td>
                    <td style="padding: 8px 0; font-size: 14px; color: #0f172a; text-align: right;">CA${price:.2f}</td>
                </tr>
            """
            items_html_rows.append(item_row_html)
        final_items_html = ''.join(items_html_rows)

        # --- REPLACE ALL PLACEHOLDERS ---
        html_body = html_template
        html_body = html_body.replace('__RECEIPT_ID_PLACEHOLDER__', order_details.get('orderId', 'N/A'))
        html_body = html_body.replace('__ITEMS_LIST_PLACEHOLDER__', final_items_html)
        html_body = html_body.replace('__AMOUNT_PLACEHOLDER__', amount_text)
        html_body = html_body.replace('__DATE_PLACEHOLDER__', date_text)
        html_body = html_body.replace('__PAYMENT_METHOD_CHIPS_PLACEHOLDER__', chips_html)
        
        subtotal = Decimal(order_details.get('subtotalCents', 0)) / 100
        tax = Decimal(order_details.get('taxTotalCents', 0)) / 100
        html_body = html_body.replace('__SUBTOTAL_PLACEHOLDER__', f'CA${subtotal:.2f}')
        html_body = html_body.replace('__TAX_PLACEHOLDER__', f'CA${tax:.2f}')

        # Send the email
        response = ses_client.send_email(
            Source=SENDER_EMAIL,
            Destination={'ToAddresses': [recipient_email]},
            Message={
                'Subject': {'Data': f"Your Momotaro Sushi Receipt [{order_details.get('orderId')}]", 'Charset': 'UTF-8'},
                'Body': {'Html': {'Data': html_body, 'Charset': 'UTF-8'}}
            }
        )
        logger.info(f"Successfully sent receipt to {recipient_email}. MessageId: {response['MessageId']}")
        return True
    except FileNotFoundError:
        logger.error("emailtemplate.html not found. Make sure it's in the deployment package.")
        return False
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}", exc_info=True)
        return False

# --- Core Order Processing Logic ---
def process_order(order_data, payment_details):
    order_id = order_data.get('order_id')
    logger.info(f"Processing order: {order_id}")

    transaction_time = order_data.get('transaction_timestamp')
    order_date_iso = datetime.fromtimestamp(transaction_time, tz=timezone.utc).isoformat() if transaction_time else datetime.now(timezone.utc).isoformat()

    order_data_decimal = replace_floats_with_decimals(order_data)
    total_price = Decimal(str(order_data_decimal.get('total', '0'))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    # --- PARSE ITEMS JSON ---
    items_json = order_data_decimal.get('items_json')
    items = []
    if items_json:
        try:
            items = replace_floats_with_decimals(json.loads(items_json))
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"Could not parse items_json: {e}")

    # 1. Save to DynamoDB
    item_to_save_in_db = {
        'orderId': order_id,
        'paymentId': order_data.get('paymentId'),
        'customerName': order_data.get('customerName', 'N/A'),
        'paymentStatus': order_data.get('paymentStatus', 'UNKNOWN'),
        'orderType': order_data.get('orderType'),
        'tableId': order_data.get('table'),
        'notes': order_data.get('notes', ''),
        'items': items,
        'total': total_price,
        'orderDate': order_date_iso,
        'subtotalCents': safe_decimal_from_metadata(order_data.get('subtotal_cents')),
        'taxTotalCents': safe_decimal_from_metadata(order_data.get('tax_total_cents')),
    }
    
    if orders_table:
        try:
            orders_table.put_item(Item=item_to_save_in_db)
            logger.info("Step 1 COMPLETE: Successfully saved order to DynamoDB.")
        except Exception as e:
            logger.error(f"DynamoDB put_item FAILED: {e}", exc_info=True)
            raise
    else:
        logger.error("orders_table is None - cannot save to DynamoDB!")

    # 2. Publish to IoT for printing
    order_for_mqtt = {k: item_to_save_in_db.get(k) for k in ['orderId', 'customerName', 'notes', 'orderType', 'items']}
    order_for_mqtt['total'] = float(total_price)
    order_for_mqtt['table'] = item_to_save_in_db.get('tableId')
    order_for_mqtt['order_id'] = order_id
    
    if PRINTER_TOPIC:
        try:
            iot_client.publish(topic=PRINTER_TOPIC, qos=1, payload=json.dumps(order_for_mqtt, default=str))
            logger.info("Step 2 COMPLETE: Successfully published order to IoT topic.")
        except Exception as e:
            logger.error(f"IoT publish FAILED: {e}", exc_info=True)
            raise
    else:
        logger.error("PRINTER_TOPIC is None - cannot publish to IoT!")
    
    # 3. Conditionally send email receipt
    if order_data.get('orderType') == 'takeout':
        recipient_email = order_data.get('receipt_email')
        
        order_details_for_email = {
            'orderId': order_id,
            'total': total_price,
            'notes': order_data.get('notes', ''),
            'paidAt_iso': order_date_iso,
            'subtotalCents': order_data.get('subtotal_cents'),
            'taxTotalCents': order_data.get('tax_total_cents')
        }
        # --- PASS PARSED ITEMS TO EMAIL FUNCTION ---
        send_receipt_email(recipient_email, order_details_for_email, payment_details, items)

    return True

# --- Main Handler ---
def lambda_handler(event, context):
    print(event)
    logger.info("Lambda handler invoked.")
    logger.info(f"DYNAMODB_TABLE_NAME: {DYNAMODB_TABLE_NAME}")
    logger.info(f"PRINTER_TOPIC: {PRINTER_TOPIC}")
    
    # Define CORS headers. Use your specific domain for better security.
    headers = {
        "Access-Control-Allow-Origin": "https://dine-in.momotarosushi.ca",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    }
    
    try:
        if 'stripe-signature' in event.get('headers', {}):
            payload = event['body']
            sig_header = event['headers']['stripe-signature']
            stripe_event = stripe.Webhook.construct_event(payload=payload, sig_header=sig_header, secret=webhook_secret)

            if stripe_event['type'] == 'payment_intent.succeeded':
                payment_intent = stripe_event['data']['object']
                metadata = dict(payment_intent.get('metadata', {}))
                
                latest_charge_id = payment_intent.get('latest_charge')
                customer_email, customer_name, payment_details = None, None, {}

                if latest_charge_id:
                    try:
                        charge = stripe.Charge.retrieve(latest_charge_id)
                        customer_email = charge.billing_details.get('email')
                        customer_name = charge.billing_details.get('name')
                        payment_details = charge.payment_method_details
                        logger.info(f"Successfully retrieved Charge {latest_charge_id}")
                    except Exception as e:
                        logger.error(f"Could not retrieve charge {latest_charge_id}: {e}")
                
                order_data = {
                    'receipt_email': customer_email,
                    'customerName': customer_name,
                    'paymentId': payment_intent['id'],
                    'paymentStatus': 'PAID',
                    'transaction_timestamp': payment_intent.get('created'),
                    **metadata
                }
                
                process_order(order_data, payment_details)
        else:
            # Handle Dine-In API calls
            order_data = json.loads(event['body'])
            order_data['paymentStatus'] = 'Dine-In'
            process_order(order_data, {})

        # Add headers to the success response
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'Order processed successfully'})
        }
        
    except Exception as e:
        logger.error("Critical error in lambda_handler", exc_info=True)
        # Add headers to the error response as well
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'An internal server error occurred.'})
        }
    logger.info(f"PRINTER_TOPIC: {PRINTER_TOPIC}")
    
    try:
        if 'stripe-signature' in event.get('headers', {}):
            payload = event['body']
            sig_header = event['headers']['stripe-signature']
            stripe_event = stripe.Webhook.construct_event(payload=payload, sig_header=sig_header, secret=webhook_secret)

            if stripe_event['type'] == 'payment_intent.succeeded':
                payment_intent = stripe_event['data']['object']
                metadata = dict(payment_intent.get('metadata', {}))
                
                latest_charge_id = payment_intent.get('latest_charge')
                customer_email, customer_name, payment_details = None, None, {}

                if latest_charge_id:
                    try:
                        charge = stripe.Charge.retrieve(latest_charge_id)
                        customer_email = charge.billing_details.get('email')
                        customer_name = charge.billing_details.get('name')
                        payment_details = charge.payment_method_details
                        logger.info(f"Successfully retrieved Charge {latest_charge_id}")
                    except Exception as e:
                        logger.error(f"Could not retrieve charge {latest_charge_id}: {e}")
                
                order_data = {
                    'receipt_email': customer_email,
                    'customerName': customer_name,
                    'paymentId': payment_intent['id'],
                    'paymentStatus': 'PAID',
                    'transaction_timestamp': payment_intent.get('created'),
                    **metadata
                }
                
                process_order(order_data, payment_details)
        else:
            order_data = json.loads(event['body'])
            order_data['paymentStatus'] = 'Dine-In'
            process_order(order_data, {})

        return {'statusCode': 200, 'body': json.dumps({'message': 'Order processed successfully'})}
        
    except Exception as e:
        logger.error("Critical error in lambda_handler", exc_info=True)
        return {'statusCode': 500, 'body': json.dumps({'error': 'An internal server error occurred.'})}