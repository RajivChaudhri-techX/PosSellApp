const request = require('supertest');
const { sequelize } = require('../config/database');
const { Tenant, User, Customer } = require('../models');
const app = require('../index');

describe('Customers API', () => {
  let testTenant;
  let testUser;
  let testCustomer;
  let authToken;
  let server;

  beforeAll(async () => {
    // Create test tenant
    testTenant = await Tenant.create({
      name: 'Test Shop',
      domain: 'testshop'
    });

    // Create test user
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('testpass123', 10);

    testUser = await User.create({
      tenant_id: testTenant.id,
      username: 'testuser',
      email: 'test@example.com',
      password_hash: passwordHash,
      role: 'cashier'
    });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .set('x-tenant-id', testTenant.id)
      .send({ username: 'testuser', password: 'testpass123' });

    authToken = loginResponse.body.token;

    // Start server
    server = app.listen(3002);
  });

  afterAll(async () => {
    // Clean up
    await Customer.destroy({ where: { tenant_id: testTenant.id } });
    await User.destroy({ where: { tenant_id: testTenant.id } });
    await Tenant.destroy({ where: { id: testTenant.id } });
    await sequelize.close();
    server.close();
  });

  describe('POST /api/customers', () => {
    it('should create a new customer', async () => {
      const customerData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        address: '123 Main St'
      };

      const response = await request(app)
        .post('/api/customers')
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${authToken}`)
        .send(customerData);

      expect(response.status).toBe(201);
      expect(response.body.customer).toMatchObject(customerData);
      testCustomer = response.body.customer;
    });

    it('should reject duplicate email', async () => {
      const duplicateCustomer = {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'john.doe@example.com', // Same email
        phone: '+0987654321'
      };

      const response = await request(app)
        .post('/api/customers')
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateCustomer);

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject invalid data', async () => {
      const invalidCustomer = {
        first_name: '', // Invalid
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/customers')
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidCustomer);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/customers', () => {
    it('should get all customers', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.customers)).toBe(true);
      expect(response.body.customers.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should support search', async () => {
      const response = await request(app)
        .get('/api/customers?search=John')
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.customers.some(c => c.first_name === 'John')).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/customers?page=1&limit=1')
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.customers.length).toBeLessThanOrEqual(1);
      expect(response.body.pagination.page).toBe(1);
    });
  });

  describe('GET /api/customers/:id', () => {
    it('should get customer by ID', async () => {
      const response = await request(app)
        .get(`/api/customers/${testCustomer.id}`)
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.customer.id).toBe(testCustomer.id);
    });

    it('should return 404 for non-existent customer', async () => {
      const response = await request(app)
        .get('/api/customers/99999')
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/customers/:id', () => {
    it('should update customer', async () => {
      const updateData = {
        first_name: 'Johnny',
        last_name: 'Doe',
        phone: '+1111111111'
      };

      const response = await request(app)
        .put(`/api/customers/${testCustomer.id}`)
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.customer.first_name).toBe('Johnny');
      expect(response.body.customer.phone).toBe('+1111111111');
    });

    it('should return 404 for non-existent customer', async () => {
      const response = await request(app)
        .put('/api/customers/99999')
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ first_name: 'Test' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/customers/:id', () => {
    it('should delete customer', async () => {
      const response = await request(app)
        .delete(`/api/customers/${testCustomer.id}`)
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should return 404 for non-existent customer', async () => {
      const response = await request(app)
        .delete('/api/customers/99999')
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});