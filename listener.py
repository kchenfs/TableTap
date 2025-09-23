# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0.
#
# This script is a modified version of the AWS IoT Core MQTT5 PubSub sample,
# tailored to subscribe to printer topics and print incoming orders.

from awsiot import mqtt5_client_builder
from awscrt import mqtt5
import threading
from concurrent.futures import Future
import time
import json
import signal
from escpos.printer import Usb

# --- Configuration ---
# AWS IoT Core info
ENDPOINT = "a2ucwnwtscss1f-ats.iot.ca-central-1.amazonaws.com"
CLIENT_ID = "my_rp326_printer"
PATH_TO_CERTIFICATE = "C:/Users/Ken/certs/153975d756b52c7e5b2d82c5540b5734cd5cac8c6ead7f0bdd73f72799e77afd-certificate.pem.crt"
PATH_TO_PRIVATE_KEY = "C:/Users/Ken/certs/153975d756b52c7e5b2d82c5540b5734cd5cac8c6ead7f0bdd73f72799e77afd-private.pem.key"
PATH_TO_AMAZON_ROOT_CA_1 = "C:/Users/Ken/certs/AmazonRootCA1.pem"

# Printer topics
FRONT_PRINTER_TOPIC = "printers/front/print"
BACK_PRINTER_TOPIC = "printers/back/print"

# Timeout for async operations
TIMEOUT = 100

# --- Global Variables for State Management ---
shutdown_event = threading.Event()
future_stopped = Future()
future_connection_success = Future()
p = None # Printer object

# --- Printer Logic ---
def print_order(items, notes, kitchen_location):  # Updated: Added 'notes' parameter
    """Print order receipt using ESC/POS commands"""
    if p is None:
        print("Printer not initialized. Cannot print order.")
        # Log the order to the console as a fallback
        print("\n--- CONSOLE FALLBACK ---\n")
        print(f"KITCHEN: {kitchen_location.upper()}")
        if notes:
            print(f"NOTES: {notes}")
        print("ITEMS:")
        for item in items:
            item_name = item.get('name', 'Unknown Item')
            quantity = item.get('quantity', 1)
            print(f"  - {item_name} (Qty: {quantity})")
        print("\n------------------------\n")
        return False
        
    try:
        print(f"Printing order at '{kitchen_location}' kitchen")
        p.set(align='center', font='a', bold=True, width=2, height=2)
        p.text(f"{kitchen_location.upper()} KITCHEN\n")
        p.set(align='center', font='a', bold=False, width=1, height=1)
        p.text("=" * 42 + "\n")
        
        # Updated: Print global notes here (outside the item loop)
        p.set(align='left', font='b', bold=True, width=1, height=2)
        if notes:
            p.text(f"NOTES: {notes}\n")
        else:
            p.text("No special notes.\n")
        p.set(align='center', font='a', bold=False, width=1, height=1)
        p.text("=" * 42 + "\n\n")
        
        if not items:
            p.text("No items in this order.\n")
        else:
            for i, item in enumerate(items, 1):
                # Updated: Removed outdated comment about 'ItemName'; already using 'name'
                item_name = item.get('name', 'Unknown Item')
                quantity = item.get('quantity', 1)
                
                # Updated: Removed per-item notes logic (no 'Addons' or per-item notes in new payload)
                
                p.set(align='left', font='a', bold=True, width=1, height=1)
                p.text(f"{i}. {item_name} (Qty: {quantity})\n")
                p.text("\n")
        
        p.set(align='center')
        p.text("=" * 42 + "\n")
        p.text(f"Printed: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        p.cut()
        return True
    except Exception as e:
        print(f"ERROR: Could not print order. Reason: {e}")
        return False

# --- MQTT5 Callbacks ---
def on_publish_received(publish_packet_data):
    """Callback when any publish is received."""
    publish_packet = publish_packet_data.publish_packet
    assert isinstance(publish_packet, mqtt5.PublishPacket)
    topic = publish_packet.topic
    payload = publish_packet.payload
    
    print(f"\nReceived message from topic: '{topic}'")
    
    try:
        order_data = json.loads(payload)
        items = order_data.get('items', [])
        notes = order_data.get('notes', '')  # New: Extract top-level 'notes'
        kitchen_location = "front" if "front" in topic else "back"
        
        # Updated: Removed customer_name extraction and printing
        print(f"Processing order with {len(items)} items.")
        
        if print_order(items, notes, kitchen_location):  # Updated: Pass 'notes' to print_order
            print("✓ Order printed successfully")
        else:
            print("✗ Failed to print order")
            
    except json.JSONDecodeError as e:
        print(f"ERROR: Could not decode JSON payload. Reason: {e}")
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while processing message. Reason: {e}")

def on_lifecycle_stopped(lifecycle_stopped_data: mqtt5.LifecycleStoppedData):
    print("Lifecycle Stopped")
    future_stopped.set_result(lifecycle_stopped_data)

def on_lifecycle_connection_success(lifecycle_connect_success_data: mqtt5.LifecycleConnectSuccessData):
    print("Lifecycle Connection Success")
    if not future_connection_success.done():
        future_connection_success.set_result(lifecycle_connect_success_data)

def on_lifecycle_connection_failure(lifecycle_connection_failure: mqtt5.LifecycleConnectFailureData):
    print(f"Lifecycle Connection Failure: {lifecycle_connection_failure.exception}")
    if hasattr(lifecycle_connection_failure, 'connack_packet'):
        print(f"CONNACK Reason Code: {lifecycle_connection_failure.connack_packet.reason_code}")

def signal_handler(sig, frame):
    """Handle Ctrl+C by setting the shutdown event."""
    print("\nCtrl+C pressed. Shutting down gracefully...")
    shutdown_event.set()

# --- Main Execution ---
if __name__ == '__main__':
    print("\nStarting MQTT5 Printer Client\n")
    signal.signal(signal.SIGINT, signal_handler)

    try:
        p = Usb(0x0FE6, 0x811E, profile="RP326")
        print("✓ Printer initialized successfully")
    except Exception as e:
        print(f"WARNING: Could not initialize printer: {e}")
        print("Continuing without a physical printer. Orders will be logged to the console.")
        p = None

    client = None
    try:
        # Create MQTT5 client
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
        print("✓ MQTT5 Client created")

        print(f"Connecting to {ENDPOINT} with client ID '{CLIENT_ID}'...")
        client.start()
        
        # Wait for connection to succeed
        lifecycle_connect_success_data = future_connection_success.result(TIMEOUT)
        print("✓ Connected to AWS IoT Core!")

        # Subscribe to both printer topics
        print("Subscribing to printer topics...")
        subscribe_future = client.subscribe(subscribe_packet=mqtt5.SubscribePacket(
            subscriptions=[
                mqtt5.Subscription(topic_filter=FRONT_PRINTER_TOPIC, qos=mqtt5.QoS.AT_LEAST_ONCE),
                mqtt5.Subscription(topic_filter=BACK_PRINTER_TOPIC, qos=mqtt5.QoS.AT_LEAST_ONCE)
            ]
        ))
        suback = subscribe_future.result(TIMEOUT)
        print(f"✓ Subscribed to '{FRONT_PRINTER_TOPIC}' with {suback.reason_codes[0]}")
        print(f"✓ Subscribed to '{BACK_PRINTER_TOPIC}' with {suback.reason_codes[1]}")

        print("\n🖨️  Printer is ready and waiting for orders...")
        print("Press Ctrl+C to exit")
        print("\n✅ Script is now blocked, waiting for shutdown signal...")

        
        # Wait for shutdown signal
        shutdown_event.wait()

    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        if client:
            print("Stopping client...")
            client.stop()
            future_stopped.result(TIMEOUT)
            print("✓ Client stopped")