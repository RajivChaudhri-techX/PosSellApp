# ShopXperience Backend API

A multi-tenant point-of-sale (POS) system backend built with Node.js, Express, and PostgreSQL.

## Features

- **Multi-tenancy**: Complete tenant isolation with tenant-specific data
- **Authentication & Authorization**: JWT-based auth with role-based access control
- **POS Transactions**: Complete transaction processing with inventory management
- **Inventory Management**: Real-time inventory tracking across multiple locations
- **Customer Management**: Customer database with transaction history
- **Reporting**: Sales, inventory, and customer analytics
- **RESTful API**: Well-structured REST endpoints
- **Error Handling**: Comprehensive error handling and logging
- **Validation**: Input validation using Joi
- **Security**: Helmet for security headers, CORS configuration

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Joi
- **Logging**: Winston
- **Security**: Helmet, CORS
- **Testing**: Jest, Supertest

## Project Structure

```
backend/
├── config/
│   └── database.js          # Database configuration
├── middleware/
│   ├── auth.js             # JWT authentication middleware
│   ├── multiTenancy.js     # Multi-tenancy middleware
│   ├── validation.js       # Input validation middleware
│   └── errorHandler.js     # Error handling middleware
├── models/
│   ├── index.js            # Model exports
│   ├── Tenant.js           # Tenant model
│   ├── User.js             # User model
│   ├── Location.js         # Location model
│   ├── Product.js          # Product model
│   ├── Inventory.js        # Inventory model
│   ├── Customer.js         # Customer model
│   ├── Transaction.js      # Transaction model
│   ├── TransactionItem.js  # Transaction item model
│   └── Report.js           # Report model
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── transactions.js     # POS transaction routes
│   ├── inventory.js        # Inventory management routes
│   ├── customers.js        # Customer management routes
│   ├── products.js         # Product management routes
│   └── reports.js          # Reporting routes
├── tests/
│   ├── setup.js            # Test configuration
│   └── auth.test.js        # Authentication tests
├── utils/
│   └── logger.js           # Logging utility
├── .env                    # Environment variables
├── index.js                # Main application file
├── jest.config.js          # Jest configuration
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone the repository and navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Copy the `.env` file and update the values:
   ```bash
   cp .env.example .env
   ```
   Update the following variables:
   - `DB_HOST`: PostgreSQL host
   - `DB_PORT`: PostgreSQL port
   - `DB_NAME`: Database name
   - `DB_USER`: Database username
   - `DB_PASSWORD`: Database password
   - `JWT_SECRET`: Secret key for JWT tokens
   - `PORT`: Server port (default: 3000)

4. **Database Setup:**
   Create a PostgreSQL database and ensure the connection details in `.env` are correct.

5. **Run Database Migrations:**
   The application will automatically sync the database schema on startup in development mode.

### Running the Application

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

**Run tests:**
```bash
npm test
```

The server will start on the port specified in `.env` (default: 3000).

## API Documentation

### Authentication

All API requests require a tenant identifier in the `x-tenant-id` header.

#### Register User
```http
POST /api/auth/register
Content-Type: application/json
x-tenant-id: <tenant_id>

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword",
  "role": "cashier"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json
x-tenant-id: <tenant_id>

{
  "username": "johndoe",
  "password": "securepassword"
}
```

### Transactions

#### Create Transaction
```http
POST /api/transactions
Authorization: Bearer <jwt_token>
x-tenant-id: <tenant_id>

{
  "customer_id": 1,
  "location_id": 1,
  "items": [
    {
      "product_id": 1,
      "quantity": 2
    }
  ],
  "payment_method": "cash",
  "discount_amount": 0
}
```

### Inventory

#### Get Inventory
```http
GET /api/inventory?location_id=1&low_stock=true
Authorization: Bearer <jwt_token>
x-tenant-id: <tenant_id>
```

#### Update Inventory
```http
PUT /api/inventory/1/1
Authorization: Bearer <jwt_token>
x-tenant-id: <tenant_id>

{
  "quantity": 50,
  "min_stock": 10
}
```

### Customers

#### Get Customers
```http
GET /api/customers?page=1&limit=10&search=john
Authorization: Bearer <jwt_token>
x-tenant-id: <tenant_id>
```

#### Create Customer
```http
POST /api/customers
Authorization: Bearer <jwt_token>
x-tenant-id: <tenant_id>

{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890"
}
```

### Products

#### Get Products
```http
GET /api/products?category=electronics&page=1&limit=10
Authorization: Bearer <jwt_token>
x-tenant-id: <tenant_id>
```

#### Create Product
```http
POST /api/products
Authorization: Bearer <jwt_token>
x-tenant-id: <tenant_id>

{
  "name": "Laptop",
  "sku": "LT-001",
  "price": 999.99,
  "category": "electronics"
}
```

### Reports

#### Sales Report
```http
GET /api/reports/sales?start_date=2024-01-01&end_date=2024-01-31&group_by=day
Authorization: Bearer <jwt_token>
x-tenant-id: <tenant_id>
```

#### Inventory Report
```http
GET /api/reports/inventory?location_id=1&low_stock_only=true
Authorization: Bearer <jwt_token>
x-tenant-id: <tenant_id>
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Different permissions for admin, manager, and cashier roles
- **Multi-tenancy**: Complete data isolation between tenants
- **Input Validation**: Comprehensive validation using Joi
- **Security Headers**: Helmet.js for security headers
- **CORS**: Configured CORS policies
- **Password Hashing**: bcrypt for secure password storage

## Error Handling

The API provides consistent error responses:

```json
{
  "error": "Error message",
  "details": ["Validation error details"] // For validation errors
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict (duplicate data)
- `500`: Internal Server Error

## Logging

Application logs are written to:
- `logs/error.log`: Error-level logs
- `logs/combined.log`: All logs
- Console (in development mode)

## Testing

Run the test suite:
```bash
npm test
```

Tests include:
- Authentication endpoints
- Input validation
- Error handling
- Database operations

## Deployment

1. Set `NODE_ENV=production` in environment variables
2. Ensure PostgreSQL is properly configured
3. Use a process manager like PM2 for production
4. Set up proper logging and monitoring
5. Configure reverse proxy (nginx) for production deployment

## Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation for API changes
4. Ensure all tests pass before submitting PR

## License

This project is licensed under the ISC License.