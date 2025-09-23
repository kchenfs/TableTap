# listener.py
from awsiot import mqtt5_client_builder
from awscrt import mqtt5
import threading
from concurrent.futures import Future
import time
import json
import signal
from escpos.printer import Usb

# --- Configuration ---
ENDPOINT = "a2ucwnwtscss1f-ats.iot.ca-central-1.amazonaws.com"
CLIENT_ID = "my_rp326_printer"
PATH_TO_CERTIFICATE = "C:/Users/ken.chen/OneDrive - Canadian Tire/Desktop/AWS IoT Project/153975d756b52c7e5b2d82c5540b5734cd5cac8c6ead7f0bdd73f72799e77afd-certificate.pem.crt"
PATH_TO_PRIVATE_KEY = "C:/Users/ken.chen/OneDrive - Canadian Tire/Desktop/AWS IoT Project/153975d756b52c7e5b2d82c5540b5734cd5cac8c6ead7f0bdd73f72799e77afd-private.pem.key"
PATH_TO_AMAZON_ROOT_CA_1 = "C:/Users/ken.chen/OneDrive - Canadian Tire/Desktop/AWS IoT Project/AmazonRootCA1.pem"

# UPDATED: Define a single topic to listen to
PRINTER_TOPIC = "printers/orders/print"

TIMEOUT = 100
shutdown_event = threading.Event()
future_stopped = Future()
future_connection_success = Future()
p = None

# --- Printer Logic (Simplified) ---
def print_order(items, notes):
    """Print a single, complete order receipt."""
    if p is None:
        print("Printer not initialized. Logging order to console.")
        print("\n--- CONSOLE FALLBACK ---\n")
        print("NEW ORDER")
        if notes:
            print(f"NOTES: {notes}")
        print("ITEMS:")
        for item in items:
            print(f"  - {item.get('name', 'Unknown Item')} (Qty: {item.get('quantity', 1)})")
        print("\n------------------------\n")
        return False
        
    try:
        print("Printing new order...")
        p.set(align='center', font='a', bold=True, width=2, height=2)
        p.text("NEW ORDER\n") # Simplified header
        p.set(align='center', font='a', bold=False, width=1, height=1)
        p.text("=" * 42 + "\n")
        
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
                item_name = item.get('name', 'Unknown Item')
                quantity = item.get('quantity', 1)
                
                p.set(align='left', font='a', bold=True, width=1, height=1)
                p.text(f"{i}. {item_name} (Qty: {quantity})\n\n")
        
        p.set(align='center')
        p.text("=" * 42 + "\n")
        p.text(f"Printed: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        p.cut()
        return True
    except Exception as e:
        print(f"ERROR: Could not print order. Reason: {e}")
        return False

# --- MQTT5 Callbacks (Simplified) ---
def on_publish_received(publish_packet_data):
    """Callback when a new order is received."""
    publish_packet = publish_packet_data.publish_packet
    topic = publish_packet.topic
    payload = publish_packet.payload
    
    print(f"\nReceived message from topic: '{topic}'")
    
    try:
        order_data = json.loads(payload)
        items = order_data.get('items', [])
        notes = order_data.get('notes', '')
        
        print(f"Processing order with {len(items)} items.")
        
        if print_order(items, notes):
            print("✓ Order printed successfully")
        else:
            print("✗ Failed to print order")
            
    except Exception as e:
        print(f"ERROR: An unexpected error occurred. Reason: {e}")

# ... (Lifecycle callbacks remain the same) ...
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
    print("\nCtrl+C pressed. Shutting down gracefully...")
    shutdown_event.set()

# --- Main Execution ---
if __name__ == '__main__':
    print("\nStarting Unified MQTT Printer Client\n")
    signal.signal(signal.SIGINT, signal_handler)

    try:
        p = Usb(0x0FE6, 0x811E, profile="RP326")
        print("✓ Printer initialized successfully")
    except Exception as e:
        print(f"WARNING: Could not initialize printer: {e}")
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
        print("✓ MQTT5 Client created")

        print(f"Connecting to {ENDPOINT}...")
        client.start()
        
        future_connection_success.result(TIMEOUT)
        print("✓ Connected to AWS IoT Core!")

        print(f"Subscribing to topic '{PRINTER_TOPIC}'...")
        subscribe_future = client.subscribe(subscribe_packet=mqtt5.SubscribePacket(
            subscriptions=[
                mqtt5.Subscription(topic_filter=PRINTER_TOPIC, qos=mqtt5.QoS.AT_LEAST_ONCE)
            ]
        ))
        suback = subscribe_future.result(TIMEOUT)
        print(f"✓ Subscribed with {suback.reason_codes[0]}")

        print("\n🖨️  Printer is ready and waiting for orders...")
        print("Press Ctrl+C to exit")
        
        shutdown_event.wait()

    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        if client:
            print("Stopping client...")
            client.stop()
            future_stopped.result(TIMEOUT)
            print("✓ Client stopped")