# TableTap

![AWS](https://img.shields.io/badge/AWS-Serverless-orange) ![Docker](https://img.shields.io/badge/Docker-Containerized-blue) ![React](https://img.shields.io/badge/React-Vite-cyan) ![Python](https://img.shields.io/badge/Python-3.13-yellow)

> **TableTap** is a serverless, containerized QR code ordering system facilitating seamless dine-in and takeout experiences. It connects customers directly to the kitchen via real-time MQTT printing and handles secure payments via Stripe.

## 📖 Table of Contents
- [About the Project](#-about-the-project)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Environment Configuration](#-environment-configuration)
- [Workflow](#-workflow)
- [Key Features](#-key-features)
- [Hardware & IoT Integration](#-hardware--iot-integration)
- [Data Models](#-data-models-dynamodb)

## 🧐 About the Project

TableTap modernizes the restaurant ordering flow by replacing physical menus with dynamic QR codes. The system eliminates the need for servers to take initial orders, allowing the kitchen to receive tickets instantly.

The system supports two distinct modes:
1.  **Dine-In:** Customers scan a table-specific QR code, browse the menu, and send orders directly to the kitchen printer.
2.  **Takeout:** Customers browse remotely, pay upfront via Stripe, and receive an automated email receipt upon successful transaction.

The application relies on a hybrid architecture using **AWS Serverless** components for backend logic and data, and **Docker** containers for frontend isolation and routing.

## 🏗 System Architecture

The infrastructure is composed of three main pillars:

### 1. The Frontend (Containerized)
*   **Dynamic QR Codes:** A PHP container handles the initial scan, directing users to the correct session URL.
*   **Nginx Reverse Proxy:** Routes traffic to the appropriate container.
*   **Per-Table Isolation:** The application runs ~12 separate Docker containers (one per table + takeout) to manage state and sessions independently.
*   **Updates:** GitHub Actions handles CI/CD, updating container images on the Linux Ubuntu server automatically on push.

### 2. The Backend (AWS Serverless)
*   **API Gateway & Lambda:** Receives cart payloads via Axios. The Lambda function (`lambda_function.py`) acts as the central controller.
*   **Stripe Integration:** Validates webhooks for takeout orders to ensure payment success before processing.
*   **Data Persistence:** **DynamoDB** stores all order details, customer info, and transaction timestamps.
*   **Notifications:** **AWS SES** sends formatted HTML email receipts to takeout customers using a custom template.

### 3. The IoT Layer (Kitchen)
*   **AWS IoT Core (MQTT):** Lambda publishes approved orders to a secure MQTT topic.
*   **Python Listener:** A script running on-premise listens to the subscription topic.
*   **Thermal Printing:** Uses the `python-escpos` library to parse the JSON payload and print physical tickets for the chefs.

### Architecture Diagram

```mermaid
graph TD
    User[User / QR Scan] --> PHP[PHP Container]
    PHP --> Nginx[Nginx Proxy]
    Nginx --> React[React Container Table 1..12]
    React -- Axios/JSON --> APIG[API Gateway]
    APIG --> Lambda[AWS Lambda]
    
    subgraph "Order Processing"
        Lambda --> DDB[(DynamoDB)]
        Lambda --> Stripe[Stripe API]
        Lambda --> SES[AWS SES Email]
    end
    
    subgraph "Kitchen IoT"
        Lambda -- MQTT --> IoT[AWS IoT Core]
        IoT --> Listener[Computer + Listener Script]
        Listener --> Printer[RP326 Thermal Printer]
    end
