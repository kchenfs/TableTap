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
orders_table = dynamodb.Table(os.environ.get('DYNAMODB_TABLE_NAME', 'momotaroOrdersDatabase'))
PRINTER_TOPIC = os.environ.get('PRINTER_TOPIC', 'printers/orders/print')

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
def send_receipt_email(recipient_email, order_details, payment_details):
    if not recipient_email:
        logger.warning("No recipient email provided. Skipping receipt.")
        return False
    
    if not SENDER_EMAIL:
        logger.error("SENDER_EMAIL environment variable not set. Cannot send email.")
        return False

    try:
        with open('emailtemplate.html', 'r', encoding='utf-8') as f:
            html_template = f.read()

        # Prepare a data object that matches the structure in the template's JavaScript
        card_details = payment_details.get('card', {})
        payment_data_for_template = {
            "amount": float(order_details.get('total')),
            "currency": "CAD",
            "paidAt": order_details.get('paidAt_iso'), # Use the accurate ISO timestamp
            "method": {
                "type": "card",
                "brand": card_details.get('brand', 'card'),
                "last4": card_details.get('last4', ''),
                "wallet": None 
            },
            "notes": order_details.get('notes', '')
        }
        
        payment_json = json.dumps(payment_data_for_template)
        html_body = html_template.replace('__PAYMENT_DATA_PLACEHOLDER__', payment_json)
        html_body = html_body.replace('__RECEIPT_ID_PLACEHOLDER__', order_details.get('orderId', 'N/A'))
        
        subtotal = Decimal(order_details.get('subtotalCents', 0)) / 100
        tax = Decimal(order_details.get('taxTotalCents', 0)) / 100
        html_body = html_body.replace('__SUBTOTAL_PLACEHOLDER__', f'CA${subtotal:.2f}')
        html_body = html_body.replace('__TAX_PLACEHOLDER__', f'CA${tax:.2f}')

        # Send the email using SES
        ses_client.send_email(
            Source=SENDER_EMAIL,
            Destination={'ToAddresses': [recipient_email]},
            Message={
                'Subject': {'Data': f"Your Momotaro Sushi Receipt [{order_details.get('orderId')}]"},
                'Body': {'Html': {'Data': html_body}}
            }
        )
        logger.info(f"Successfully sent receipt to {recipient_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}", exc_info=True)
        return False

# --- Core Order Processing Logic ---
def process_order(order_data, payment_intent):
    order_id = order_data.get('order_id')
    logger.info(f"Processing order: {order_id}")

    # **CHANGE**: Use Stripe's timestamp if available, otherwise use current time
    transaction_time = payment_intent.get('created')
    if transaction_time:
        order_date_iso = datetime.fromtimestamp(transaction_time, tz=timezone.utc).isoformat()
    else:
        order_date_iso = datetime.now(timezone.utc).isoformat()

    order_data_decimal = replace_floats_with_decimals(order_data)
    total_price = Decimal(str(order_data_decimal.get('total', '0'))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    items_json = order_data_decimal.get('items_json')
    items = order_data_decimal.get('items', [])
    if not items and items_json:
        try:
            items = replace_floats_with_decimals(json.loads(items_json))
        except (json.JSONDecodeError, TypeError):
            items = []

    # Save to DynamoDB
    item_to_save_in_db = {
        'orderId': order_id,
        'paymentId': order_data_decimal.get('paymentId'),
        'customerName': order_data_decimal.get('customerName', 'N/A'),
        'customerPhone': order_data_decimal.get('customerPhone'),
        'paymentStatus': order_data_decimal.get('paymentStatus', 'UNKNOWN'),
        'orderType': order_data_decimal.get('orderType'),
        'tableId': order_data_decimal.get('table'),
        'notes': order_data_decimal.get('notes', ''),
        'items': items,
        'total': total_price,
        'orderDate': order_date_iso, # **CHANGE**: Use accurate timestamp
        'subtotalCents': safe_decimal_from_metadata(order_data_decimal.get('subtotal_cents')),
        'taxTotalCents': safe_decimal_from_metadata(order_data_decimal.get('tax_total_cents')),
    }
    orders_table.put_item(Item=item_to_save_in_db)
    logger.info("Step 1 COMPLETE: Successfully saved order to DynamoDB.")

    # Publish to IoT for printing
    order_for_mqtt = {
        'order_id': order_id,
        'customer_name': item_to_save_in_db['customerName'],
        'items': items,
        'total': float(total_price),
        'notes': item_to_save_in_db['notes'],
        'orderType': item_to_save_in_db['orderType'],
        'table': item_to_save_in_db['tableId'],
    }
    iot_client.publish(topic=PRINTER_TOPIC, qos=1, payload=json.dumps(order_for_mqtt, default=str))
    logger.info("Step 2 COMPLETE: Successfully published order to IoT topic for printing.")
    
    # Conditionally send email receipt for takeout orders
    if item_to_save_in_db.get('orderType') == 'takeout':
        recipient_email = payment_intent.get('receipt_email')
        payment_method_details = payment_intent.get('charges', {}).get('data', [{}])[0].get('payment_method_details', {})
        
        order_details_for_email = {
            'orderId': order_id,
            'total': total_price,
            'notes': item_to_save_in_db['notes'],
            'paidAt_iso': order_date_iso, # **CHANGE**: Pass accurate timestamp to email function
            'subtotalCents': item_to_save_in_db['subtotalCents'],
            'taxTotalCents': item_to_save_in_db['taxTotalCents']
        }

        send_receipt_email(recipient_email, order_details_for_email, payment_method_details)
    else:
        logger.info(f"Order {order_id} is not a takeout order. Skipping email receipt.")

    return True

# --- Main Handler ---
def lambda_handler(event, context):
    try:
        if 'stripe-signature' in event.get('headers', {}):
            payload = event['body']
            sig_header = event['headers']['stripe-signature']
            stripe_event = stripe.Webhook.construct_event(payload=payload, sig_header=sig_header, secret=webhook_secret)

            if stripe_event['type'] == 'payment_intent.succeeded':
                payment_intent = stripe_event['data']['object']
                metadata = dict(payment_intent.get('metadata', {}))
                charge = payment_intent.get('charges', {}).get('data', [{}])[0]
                billing_details = charge.get('billing_details', {})
                
                order_data = {
                    'order_id': metadata.get('order_id'),
                    'customerName': billing_details.get('name'),
                    'customerPhone': billing_details.get('phone'),
                    'paymentId': payment_intent['id'],
                    'paymentStatus': 'PAID',
                    **metadata
                }
                process_order(order_data, payment_intent)
        else:
            order_data = json.loads(event['body'])
            # **CHANGE**: Set paymentStatus to 'Dine-In' as requested
            order_data['paymentStatus'] = 'Dine-In'
            process_order(order_data, {})

        return {'statusCode': 200, 'body': json.dumps({'message': 'Order processed successfully'})}
        
    except Exception as e:
        logger.error(f"Critical error processing order: {str(e)}", exc_info=True)
        return {'statusCode': 500, 'body': json.dumps({'error': 'Failed to process order'})}