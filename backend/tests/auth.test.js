const request = require('supertest');
const { sequelize } = require('../config/database');
const { Tenant, User } = require('../models');
const app = require('../index');

describe('Authentication API', () => {
  let testTenant;
  let testUser;
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

    // Start server for testing
    server = app.listen(3001);
  });

  afterAll(async () => {
    // Clean up
    await User.destroy({ where: { tenant_id: testTenant.id } });
    await Tenant.destroy({ where: { id: testTenant.id } });
    await sequelize.close();
    server.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const newUser = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'newpass123',
        role: 'cashier'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('x-tenant-id', testTenant.id)
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe(newUser.username);
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('should reject duplicate username', async () => {
      const duplicateUser = {
        username: 'testuser', // Already exists
        email: 'different@example.com',
        password: 'newpass123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('x-tenant-id', testTenant.id)
        .send(duplicateUser);

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const credentials = {
        username: 'testuser',
        password: 'testpass123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .set('x-tenant-id', testTenant.id)
        .send(credentials);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe(credentials.username);
    });

    it('should reject invalid credentials', async () => {
      const invalidCredentials = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .set('x-tenant-id', testTenant.id)
        .send(invalidCredentials);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });
});