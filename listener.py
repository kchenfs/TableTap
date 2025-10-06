# listener.py (Upgraded Version with Modern Printing)

import os
import json
import time
import signal
import logging
import threading
from datetime import datetime
from concurrent.futures import Future
from awsiot import mqtt5_client_builder
from awscrt import mqtt5
from escpos.printer import Usb
# Add this near the top of your script
import logging

logging.basicConfig(
    filename='printer_listener.log', # Log file will be created in the same directory
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# --- Replace print with logging ---

# Example of replacing a print statement:
# Old: print("✓ Printer initialized successfully")
# New:
logging.info("Printer initialized successfully")

# For errors, use logging.error or logging.exception
# Old: print(f"ERROR: Could not print order. Reason: {e}")
# New:
logging.error(f"Could not print order.", exc_info=True) # exc_info=True logs the full error traceback

# In your main `except` block:
# Old: print(f"An unexpected error occurred: {e}")
# New:
logging.critical("A critical error occurred in the main loop.", exc_info=True)




# --- Automatic Path Configuration ---
script_dir = os.path.dirname(os.path.abspath(__file__))

# --- Logging Setup ---
log_path = os.path.join(script_dir, 'printer_listener.log')
logging.basicConfig(
    filename=log_path,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# --- Main Configuration ---
ENDPOINT = "a2ucwnwtscss1f-ats.iot.ca-central-1.amazonaws.com"
CLIENT_ID = "my_rp326_printer"
PATH_TO_CERTIFICATE = os.path.join(script_dir, "153975d756b52c7e5b2d82c5540b5734cd5cac8c6ead7f0bdd73f72799e77afd-certificate.pem.crt")
PATH_TO_PRIVATE_KEY = os.path.join(script_dir, "153975d756b52c7e5b2d82c5540b5734cd5cac8c6ead7f0bdd73f72799e77afd-private.pem.key")
PATH_TO_AMAZON_ROOT_CA_1 = os.path.join(script_dir, "AmazonRootCA1.pem")
PRINTER_TOPIC = "printers/orders/print"
TIMEOUT = 100

# --- Globals ---
shutdown_event = threading.Event()
future_stopped = Future()
future_connection_success = Future()
p = None

# --- NEW: Modern Printer Logic ---
def print_order(order_data):
    """Prints a single, complete order with modern formatting."""
    if p is None:
        logging.warning("Printer not initialized. Cannot print order.")
        return False

    try:
        logging.info("Printing new modern order...")

        # Extract data from the payload
        items = order_data.get('items', [])
        notes = order_data.get('notes', '')
        order_type = order_data.get('orderType', 'dine-in').upper()
        table = order_data.get('table', 'N/A')
        order_number = order_data.get('orderNumber', '----')

        # --- Receipt Header ---
        p.set(align='center', font='a', bold=True, width=2, height=2)
        p.text(f"{order_type} ORDER\n")

        # --- Order Details ---
        p.set(align='center', font='a', bold=False, width=1, height=1)
        p.text("=" * 42 + "\n")

        if order_type == 'DINE-IN':
            p.set(align='left', font='a', bold=True, width=2, height=2)
            table_name = table.replace('table-', 'Table ')
            p.text(f"{table_name}\n")
        else: # Takeout
            p.set(align='left', font='a', bold=True, width=2, height=2)
            p.text("TAKEOUT\n")
            p.set(align='left', font='b', bold=True, width=1, height=1)
            p.text("-- PAID --\n")

        p.set(align='center', font='a', bold=False, width=1, height=1)
        p.text("-" * 42 + "\n")
        p.set(align='left', font='b')
        p.text(f"Order #: {order_number}\n")
        p.text(f"Time: {datetime.now().strftime('%I:%M %p')}\n")
        p.text("=" * 42 + "\n\n")

        # --- Special Notes ---
        if notes:
            p.set(align='center', font='a', bold=True, width=1, height=2)
            p.text("!! NOTES !!\n")
            p.set(align='left', font='b', bold=True, width=1, height=1)
            p.text(f"{notes}\n")
            p.text("=" * 42 + "\n\n")

        # --- Item List ---
        if not items:
            p.text("No items in this order.\n")
        else:
            for item in items:
                item_name = item.get('name', 'Unknown Item')
                quantity = item.get('quantity', 1)
                options = item.get('options', '')

                p.set(align='left', font='a', bold=True, width=2, height=2)
                p.text(f"{quantity}x {item_name}\n")

                if options:
                    p.set(align='left', font='b', bold=False, width=1, height=1)
                    # Indent options for clarity
                    formatted_options = options.replace('; ', '\n  - ')
                    p.text(f"  - {formatted_options}\n")
                p.text("\n") # Add space between items

        # --- Footer ---
        p.cut()
        return True
    except Exception as e:
        logging.error("Could not print order.", exc_info=True)
        return False

# --- MQTT5 Callback ---
def on_publish_received(publish_packet_data):
    """Callback when a new order is received."""
    publish_packet = publish_packet_data.publish_packet
    payload = publish_packet.payload
    logging.info(f"Received message from topic: '{publish_packet.topic}'")

    try:
        order_data = json.loads(payload)
        logging.info(f"Processing order: {order_data.get('orderNumber', 'N/A')}")
        
        if print_order(order_data):
            logging.info("✓ Order printed successfully")
        else:
            logging.warning("✗ Failed to print order")

    except Exception as e:
        logging.error("An unexpected error occurred in on_publish_received.", exc_info=True)

# --- Lifecycle Callbacks (No changes needed) ---
def on_lifecycle_stopped(lifecycle_stopped_data: mqtt5.LifecycleStoppedData):
    logging.info("Lifecycle Stopped")
    future_stopped.set_result(lifecycle_stopped_data)

def on_lifecycle_connection_success(lifecycle_connect_success_data: mqtt5.LifecycleConnectSuccessData):
    logging.info("Lifecycle Connection Success")
    if not future_connection_success.done():
        future_connection_success.set_result(lifecycle_connect_success_data)

def on_lifecycle_connection_failure(lifecycle_connection_failure: mqtt5.LifecycleConnectFailureData):
    logging.error(f"Lifecycle Connection Failure: {lifecycle_connection_failure.exception}")

def signal_handler(sig, frame):
    logging.info("\nShutdown signal received. Shutting down gracefully...")
    shutdown_event.set()

# --- Main Execution (No changes needed) ---
if __name__ == '__main__':
    logging.info("\n--- Starting Unified MQTT Printer Client ---")
    signal.signal(signal.SIGINT, signal_handler)

    try:
        p = Usb(0x0FE6, 0x811E, profile="RP326")
        logging.info("✓ Printer initialized successfully")
    except Exception as e:
        logging.warning(f"Could not initialize printer: {e}", exc_info=True)
        p = None

    client = None
    try:
        client = mqtt5_client_builder.mtls_from_path(
            endpoint=ENDPOINT,
            cert_filepath=PATH_TO_CERTIFICATE,
            pri_key_filepath=PATH_TO_PRIVATE_KEY,
            ca_filepath=PATH_TO_AMAZON_ROOT_CA_1,
            on_publish_received=on_publish_received,
            on_lifecycle_stopped=on_lifecycle_stopped,
            on_lifecycle_connection_success=on_lifecycle_connection_success,
            on_lifecycle_connection_failure=on_lifecycle_connection_failure,
            client_id=CLIENT_ID
        )
        logging.info("✓ MQTT5 Client created")

        logging.info(f"Connecting to {ENDPOINT}...")
        client.start()
        future_connection_success.result(TIMEOUT)
        logging.info("✓ Connected to AWS IoT Core!")

        logging.info(f"Subscribing to topic '{PRINTER_TOPIC}'...")
        subscribe_future = client.subscribe(subscribe_packet=mqtt5.SubscribePacket(
            subscriptions=[mqtt5.Subscription(topic_filter=PRINTER_TOPIC, qos=mqtt5.QoS.AT_LEAST_ONCE)]
        ))
        suback = subscribe_future.result(TIMEOUT)
        logging.info(f"✓ Subscribed with {suback.reason_codes[0]}")
        logging.info("\n🖨️  Printer is ready and waiting for orders...")
        shutdown_event.wait()
    except Exception as e:
        logging.critical(f"A critical error occurred in the main loop: {e}", exc_info=True)
    finally:
        if client:
            logging.info("Stopping client...")
            client.stop()
            future_stopped.result(TIMEOUT)
            logging.info("✓ Client stopped")