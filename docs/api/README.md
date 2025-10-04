# ShopXperience API Documentation

## Overview

The ShopXperience API is a RESTful API for the multi-tenant point-of-sale system. It provides endpoints for managing users, customers, products, transactions, inventory, locations, and reports.

## Authentication

All API endpoints (except authentication endpoints) require JWT token authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Multi-Tenancy

All requests are scoped to a specific tenant. The tenant is determined by the JWT token payload.

## Base URL

- Production: `https://api.shopxperience.com`
- Development: `http://localhost:3001`

## API Endpoints

### Authentication

#### POST /api/auth/register
Register a new user account (admin only).

**Request Body:**
```json
{
  "username": "string",
  "email": "user@example.com",
  "password": "string (min 6 chars)",
  "role": "admin|manager|cashier" // optional, default: cashier
}
```

**Response (201):**
```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "cashier",
    "created_at": "2023-01-01T00:00:00.000Z"
  }
}
```

#### POST /api/auth/login
Authenticate user and return JWT token.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "cashier"
  }
}
```

#### POST /api/auth/mfa/setup
Generate MFA secret and QR code.

**Response (200):**
```json
{
  "secret": "base32-secret",
  "qrCode": "data-url",
  "message": "Scan the QR code with your authenticator app"
}
```

#### POST /api/auth/mfa/verify
Verify and enable MFA.

**Request Body:**
```json
{
  "token": "123456",
  "secret": "base32-secret"
}
```

**Response (200):**
```json
{
  "message": "MFA enabled successfully"
}
```

### Customers

#### GET /api/customers
Get paginated list of customers.

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 10)
- `search` (string) - Search in name, email, phone

**Response (200):**
```json
{
  "customers": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "address": "123 Main St",
      "created_at": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "pages": 5
  }
}
```

#### POST /api/customers
Create a new customer.

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com", // optional
  "phone": "+1234567890", // optional
  "address": "123 Main St" // optional
}
```

#### GET /api/customers/{id}
Get customer by ID.

#### PUT /api/customers/{id}
Update customer information.

#### DELETE /api/customers/{id}
Delete customer.

### Products

#### GET /api/products
Get paginated list of products.

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 10)
- `category` (string)
- `search` (string) - Search in name, SKU, description

**Response (200):**
```json
{
  "products": [
    {
      "id": 1,
      "name": "Widget",
      "description": "A useful widget",
      "sku": "WGT-001",
      "price": 29.99,
      "cost": 15.00,
      "category": "Electronics",
      "created_at": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "pages": 10
  }
}
```

#### POST /api/products
Create a new product (admin/manager only).

**Request Body:**
```json
{
  "name": "Widget",
  "description": "A useful widget",
  "sku": "WGT-001",
  "price": 29.99,
  "cost": 15.00, // optional
  "category": "Electronics" // optional
}
```

#### GET /api/products/{id}
Get product by ID.

#### PUT /api/products/{id}
Update product (admin/manager only).

#### DELETE /api/products/{id}
Delete product (admin/manager only).

### Transactions

#### GET /api/transactions
Get paginated list of transactions.

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 10)
- `location_id` (integer)
- `customer_id` (integer)
- `start_date` (date)
- `end_date` (date)

**Response (200):**
```json
{
  "transactions": [
    {
      "id": 1,
      "customer_id": 1,
      "location_id": 1,
      "total_amount": 59.98,
      "tax_amount": 0,
      "discount_amount": 0,
      "payment_method": "card",
      "status": "completed",
      "created_at": "2023-01-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 500,
    "page": 1,
    "pages": 50
  }
}
```

#### POST /api/transactions
Create a new transaction (cash payment only).

**Request Body:**
```json
{
  "customer_id": 1, // optional
  "location_id": 1,
  "items": [
    {
      "product_id": 1,
      "quantity": 2
    }
  ],
  "payment_method": "cash",
  "discount_amount": 0 // optional
}
```

#### GET /api/transactions/{id}
Get transaction by ID with items.

### Payments

#### POST /api/payments/create-payment-intent
Create Stripe payment intent for card payments.

**Request Body:**
```json
{
  "amount": 59.98,
  "currency": "usd", // optional
  "payment_method_types": ["card"] // optional
}
```

**Response (200):**
```json
{
  "client_secret": "pi_secret_...",
  "payment_intent_id": "pi_..."
}
```

#### POST /api/payments/confirm-payment
Confirm Stripe payment and create transaction.

**Request Body:**
```json
{
  "payment_intent_id": "pi_...",
  "customer_id": 1, // optional
  "location_id": 1,
  "items": [
    {
      "product_id": 1,
      "quantity": 2
    }
  ],
  "discount_amount": 0 // optional
}
```

### Reports

#### GET /api/reports/sales
Generate sales analytics report.

**Query Parameters:**
- `start_date` (date)
- `end_date` (date)
- `location_id` (integer)
- `group_by` (string: day/month/year, default: day)

**Response (200):**
```json
{
  "summary": {
    "total_transactions": 150,
    "total_sales": 4500.00,
    "avg_transaction": 30.00,
    "total_profit": 2250.00,
    "profit_margin": 50.0,
    "growth_rate": 15.5
  },
  "data": [
    {
      "period": "2023-01-01",
      "transaction_count": 10,
      "total_sales": 300.00,
      "avg_transaction": 30.00
    }
  ]
}
```

#### GET /api/reports/inventory
Generate inventory status report.

**Query Parameters:**
- `location_id` (integer)
- `low_stock_only` (boolean, default: false)

**Response (200):**
```json
{
  "summary": {
    "total_items": 100,
    "total_value": 5000.00,
    "low_stock_items": 5,
    "inventory_turnover": 2.5,
    "avg_inventory_level": 50
  },
  "inventory": [
    {
      "id": 1,
      "product_id": 1,
      "location_id": 1,
      "quantity": 25,
      "min_stock": 10,
      "reorder_point": 20,
      "Product": {
        "name": "Widget",
        "sku": "WGT-001",
        "price": 29.99
      }
    }
  ]
}
```

### Locations

#### GET /api/locations
Get all locations for the tenant.

**Response (200):**
```json
{
  "locations": [
    {
      "id": 1,
      "name": "Main Store",
      "address": "123 Main St, City, State 12345",
      "phone": "+1234567890",
      "tax_rate": 8.25,
      "pricing_multiplier": 1.0,
      "timezone": "America/New_York",
      "currency": "USD",
      "is_active": true
    }
  ]
}
```

#### POST /api/locations
Create a new location (admin/manager only).

**Request Body:**
```json
{
  "name": "New Store",
  "address": "456 Oak St, City, State 12345",
  "phone": "+1234567890", // optional
  "tax_rate": 8.25, // optional, default: 0
  "pricing_multiplier": 1.0, // optional, default: 1
  "operating_hours": {...}, // optional
  "timezone": "America/New_York", // optional, default: UTC
  "currency": "USD", // optional, default: USD
  "is_active": true // optional, default: true
}
```

## Error Responses

All endpoints may return the following error responses:

- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Missing or invalid authentication
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource already exists (duplicate)
- **500 Internal Server Error**: Server error

Error response format:
```json
{
  "error": "Error message description"
}
```

## Rate Limiting

API requests are rate limited. Exceeding limits will result in 429 Too Many Requests responses.

## Data Types

- **Dates**: ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
- **Decimals**: 2 decimal places for monetary values
- **Booleans**: true/false
- **Enums**: Specified in endpoint documentation

## Best Practices

1. **Authentication**: Always include valid JWT tokens in requests
2. **Pagination**: Use pagination for large result sets
3. **Error Handling**: Check response status codes and handle errors appropriately
4. **Data Validation**: Validate input data before sending requests
5. **Rate Limiting**: Implement retry logic with exponential backoff for rate limited requests

## SDKs and Libraries

- JavaScript/Node.js: Use `fetch` or `axios` for HTTP requests
- Mobile apps: Use platform-specific HTTP libraries

## Support

For API support, contact: support@shopxperience.com