const request = require('supertest');
const { sequelize } = require('../config/database');
const { Tenant, User, Product } = require('../models');
const app = require('../index');

describe('Products API', () => {
  let testTenant;
  let testUser;
  let testProduct;
  let authToken;
  let adminToken;
  let server;

  beforeAll(async () => {
    // Create test tenant
    testTenant = await Tenant.create({
      name: 'Test Shop',
      domain: 'testshop'
    });

    // Create test user (cashier)
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('testpass123', 10);

    testUser = await User.create({
      tenant_id: testTenant.id,
      username: 'testuser',
      email: 'test@example.com',
      password_hash: passwordHash,
      role: 'cashier'
    });

    // Create admin user
    const adminPasswordHash = await bcrypt.hash('adminpass123', 10);
    const adminUser = await User.create({
      tenant_id: testTenant.id,
      username: 'adminuser',
      email: 'admin@example.com',
      password_hash: adminPasswordHash,
      role: 'admin'
    });

    // Login to get tokens
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .set('x-tenant-id', testTenant.id)
      .send({ username: 'testuser', password: 'testpass123' });

    authToken = loginResponse.body.token;

    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .set('x-tenant-id', testTenant.id)
      .send({ username: 'adminuser', password: 'adminpass123' });

    adminToken = adminLoginResponse.body.token;

    // Start server
    server = app.listen(3003);
  });

  afterAll(async () => {
    // Clean up
    await Product.destroy({ where: { tenant_id: testTenant.id } });
    await User.destroy({ where: { tenant_id: testTenant.id } });
    await Tenant.destroy({ where: { id: testTenant.id } });
    await sequelize.close();
    server.close();
  });

  describe('POST /api/products', () => {
    it('should create a new product as admin', async () => {
      const productData = {
        name: 'Test Product',
        description: 'A test product',
        sku: 'TEST001',
        price: 29.99,
        cost: 15.00,
        category: 'Electronics'
      };

      const response = await request(app)
        .post('/api/products')
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData);

      expect(response.status).toBe(201);
      expect(response.body.product).toMatchObject(productData);
      testProduct = response.body.product;
    });

    it('should reject creation by non-admin', async () => {
      const productData = {
        name: 'Unauthorized Product',
        sku: 'TEST002',
        price: 19.99
      };

      const response = await request(app)
        .post('/api/products')
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData);

      expect(response.status).toBe(403);
    });

    it('should reject duplicate SKU', async () => {
      const duplicateProduct = {
        name: 'Duplicate Product',
        sku: 'TEST001', // Same SKU
        price: 39.99
      };

      const response = await request(app)
        .post('/api/products')
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateProduct);

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('GET /api/products', () => {
    it('should get all products', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.products)).toBe(true);
      expect(response.body.products.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should support search', async () => {
      const response = await request(app)
        .get('/api/products?search=Test')
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.products.some(p => p.name.includes('Test'))).toBe(true);
    });

    it('should support category filter', async () => {
      const response = await request(app)
        .get('/api/products?category=Electronics')
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.products.every(p => p.category === 'Electronics')).toBe(true);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should get product by ID', async () => {
      const response = await request(app)
        .get(`/api/products/${testProduct.id}`)
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.product.id).toBe(testProduct.id);
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/products/99999')
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update product as admin', async () => {
      const updateData = {
        name: 'Updated Product',
        price: 34.99
      };

      const response = await request(app)
        .put(`/api/products/${testProduct.id}`)
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.product.name).toBe('Updated Product');
      expect(response.body.product.price).toBe(34.99);
    });

    it('should reject update by non-admin', async () => {
      const response = await request(app)
        .put(`/api/products/${testProduct.id}`)
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Unauthorized Update' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete product as admin', async () => {
      const response = await request(app)
        .delete(`/api/products/${testProduct.id}`)
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should reject deletion by non-admin', async () => {
      // Create another product first
      const newProduct = await Product.create({
        tenant_id: testTenant.id,
        name: 'Delete Test',
        sku: 'DEL001',
        price: 10.00
      });

      const response = await request(app)
        .delete(`/api/products/${newProduct.id}`)
        .set('x-tenant-id', testTenant.id)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);

      // Clean up
      await newProduct.destroy();
    });
  });
});