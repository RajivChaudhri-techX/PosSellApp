// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.DB_NAME = 'shopxperience_test';

// Increase timeout for database operations
jest.setTimeout(30000);