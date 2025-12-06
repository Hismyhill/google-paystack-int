# Google OAuth & Paystack Integration API

This project is a Node.js backend service that provides RESTful APIs for user authentication via Google OAuth 2.0 and payment processing using the Paystack API. It is built with Express.js and uses Sequelize for database interactions with a PostgreSQL database.

## Features

- **Google Authentication**: Secure user sign-in and sign-up using Google accounts.
- **Paystack Payment Gateway**:
  - Initiate payment transactions.
  - Securely verify transactions using webhooks.
  - Check the status of a payment.
- **Database Integration**: Uses Sequelize ORM to manage user and transaction data in a PostgreSQL database.
- **API Documentation**: Interactive API documentation powered by Swagger UI.
- **Environment-based Configuration**: Uses `.env` files for easy configuration.

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL, Sequelize (ORM)
- **Authentication**: Google OAuth 2.0
- **Payments**: Paystack API
- **API Documentation**: Swagger (OpenAPI), `swagger-jsdoc`, `swagger-ui-express`
- **HTTP Client**: Axios
- **Environment Variables**: `dotenv`

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18.x or later recommended)
- npm
- A PostgreSQL database instance.

You will also need API credentials from:

- Google Cloud Console for OAuth 2.0.
- Paystack Dashboard for payment processing.

## Getting Started

Follow these steps to get your development environment set up.

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd google-paystack-int
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root of the project and add the following configuration variables.

```env
# Server Configuration
PORT=4000

# Database
DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/DATABASE_NAME"

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:4000/auth/google/callback"

# Paystack API Credentials
PAYSTACK_SECRET_KEY="sk_test_your_secret_key"
PAYSTACK_WEBHOOK_SECRET="your_paystack_webhook_secret"
```

### 4. Run the Application

The server will start, and the database tables will be synchronized.

```bash
npm start
```

The server will be running on `http://localhost:4000`.

## API Documentation

Once the server is running, you can access the interactive Swagger API documentation at:

**http://localhost:4000/api-docs**

## API Endpoints

All endpoints are prefixed with the base URL `http://localhost:4000`.

### Authentication (`/auth`)

- `GET /google`
  - Initiates the Google OAuth 2.0 flow. Returns a Google authentication URL.
- `GET /google/callback`
  - The callback URL for Google to redirect to after authentication. It exchanges the authorization code for user tokens, fetches user info, and saves the user to the database.

### Payments (`/payments`)

- `POST /paystack/initiate`
  - Initializes a payment transaction with Paystack.
  - **Body**: `{ "amount": number }`
- `POST /paystack/webhook`
  - Endpoint to receive and verify webhook events from Paystack (e.g., `charge.success`).
- `GET /:reference/status`
  - Fetches the current status of a transaction from the local database and can optionally verify with Paystack.
