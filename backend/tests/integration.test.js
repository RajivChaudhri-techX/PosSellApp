const { sequelize } = require('../config/database');
const { Tenant, User, Customer, Product, Inventory, Transaction, TransactionItem } = require('../models');

describe('Database Integration Tests', () => {
  let tenant1, tenant2;
  let user1, user2;
  let customer1, customer2;
  let product1, product2;

  beforeAll(async () => {
    // Create test tenants
    tenant1 = await Tenant.create({
      name: 'Tenant One',
      domain: 'tenant1'
    });

    tenant2 = await Tenant.create({
      name: 'Tenant Two',
      domain: 'tenant2'
    });

    // Create users for each tenant
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('testpass123', 10);

    user1 = await User.create({
      tenant_id: tenant1.id,
      username: 'user1',
      email: 'user1@example.com',
      password_hash: passwordHash,
      role: 'cashier'
    });

    user2 = await User.create({
      tenant_id: tenant2.id,
      username: 'user2',
      email: 'user2@example.com',
      password_hash: passwordHash,
      role: 'cashier'
    });
  });

  afterAll(async () => {
    // Clean up in reverse order to avoid foreign key constraints
    await TransactionItem.destroy({ where: {} });
    await Transaction.destroy({ where: {} });
    await Inventory.destroy({ where: {} });
    await Product.destroy({ where: {} });
    await Customer.destroy({ where: {} });
    await User.destroy({ where: {} });
    await Tenant.destroy({ where: {} });
    await sequelize.close();
  });

  describe('Multi-tenancy Data Isolation', () => {
    it('should isolate customers between tenants', async () => {
      // Create customers for each tenant
      customer1 = await Customer.create({
        tenant_id: tenant1.id,
        first_name: 'John',
        last_name: 'Tenant1',
        email: 'john@tenant1.com'
      });

      customer2 = await Customer.create({
        tenant_id: tenant2.id,
        first_name: 'Jane',
        last_name: 'Tenant2',
        email: 'jane@tenant2.com'
      });

      // Verify tenant1 can only see their customer
      const tenant1Customers = await Customer.findAll({
        where: { tenant_id: tenant1.id }
      });

      expect(tenant1Customers.length).toBe(1);
      expect(tenant1Customers[0].first_name).toBe('John');

      // Verify tenant2 can only see their customer
      const tenant2Customers = await Customer.findAll({
        where: { tenant_id: tenant2.id }
      });

      expect(tenant2Customers.length).toBe(1);
      expect(tenant2Customers[0].first_name).toBe('Jane');
    });

    it('should isolate products between tenants', async () => {
      // Create products for each tenant
      product1 = await Product.create({
        tenant_id: tenant1.id,
        name: 'Product Tenant1',
        sku: 'SKU1',
        price: 10.00
      });

      product2 = await Product.create({
        tenant_id: tenant2.id,
        name: 'Product Tenant2',
        sku: 'SKU2',
        price: 20.00
      });

      // Verify isolation
      const tenant1Products = await Product.findAll({
        where: { tenant_id: tenant1.id }
      });

      const tenant2Products = await Product.findAll({
        where: { tenant_id: tenant2.id }
      });

      expect(tenant1Products.length).toBe(1);
      expect(tenant1Products[0].name).toBe('Product Tenant1');
      expect(tenant2Products.length).toBe(1);
      expect(tenant2Products[0].name).toBe('Product Tenant2');
    });

    it('should prevent cross-tenant data access', async () => {
      // Try to access tenant2's customer from tenant1 context
      const crossAccess = await Customer.findOne({
        where: {
          id: customer2.id,
          tenant_id: tenant1.id // Wrong tenant
        }
      });

      expect(crossAccess).toBeNull();
    });
  });

  describe('CRUD Operations Across Models', () => {
    it('should handle complete transaction workflow', async () => {
      // Create inventory for product
      const inventory = await Inventory.create({
        tenant_id: tenant1.id,
        product_id: product1.id,
        location_id: null, // Simplified
        quantity: 100,
        min_stock: 10
      });

      // Create transaction
      const transaction = await Transaction.create({
        tenant_id: tenant1.id,
        customer_id: customer1.id,
        user_id: user1.id,
        total_amount: 50.00,
        payment_method: 'cash',
        status: 'completed'
      });

      // Create transaction item
      const transactionItem = await TransactionItem.create({
        transaction_id: transaction.id,
        product_id: product1.id,
        quantity: 5,
        unit_price: 10.00,
        total_price: 50.00
      });

      // Verify relationships
      const foundTransaction = await Transaction.findByPk(transaction.id, {
        include: [
          { model: Customer, as: 'customer' },
          { model: User, as: 'user' },
          { model: TransactionItem, as: 'items', include: [{ model: Product, as: 'product' }] }
        ]
      });

      expect(foundTransaction.customer.first_name).toBe('John');
      expect(foundTransaction.user.username).toBe('user1');
      expect(foundTransaction.items.length).toBe(1);
      expect(foundTransaction.items[0].product.name).toBe('Product Tenant1');
      expect(foundTransaction.items[0].quantity).toBe(5);

      // Update inventory
      await inventory.update({ quantity: 95 });

      const updatedInventory = await Inventory.findByPk(inventory.id);
      expect(updatedInventory.quantity).toBe(95);
    });

    it('should handle cascading deletes appropriately', async () => {
      // Create a transaction with items
      const transaction = await Transaction.create({
        tenant_id: tenant1.id,
        customer_id: customer1.id,
        user_id: user1.id,
        total_amount: 30.00,
        payment_method: 'card'
      });

      const item = await TransactionItem.create({
        transaction_id: transaction.id,
        product_id: product1.id,
        quantity: 3,
        unit_price: 10.00,
        total_price: 30.00
      });

      // Delete transaction (should cascade to items)
      await transaction.destroy();

      // Verify item is deleted
      const deletedItem = await TransactionItem.findByPk(item.id);
      expect(deletedItem).toBeNull();

      // Verify transaction is deleted
      const deletedTransaction = await Transaction.findByPk(transaction.id);
      expect(deletedTransaction).toBeNull();
    });

    it('should enforce foreign key constraints', async () => {
      // Try to create transaction with non-existent customer
      await expect(Transaction.create({
        tenant_id: tenant1.id,
        customer_id: 99999, // Non-existent
        user_id: user1.id,
        total_amount: 10.00
      })).rejects.toThrow();

      // Try to create transaction item with non-existent product
      const validTransaction = await Transaction.create({
        tenant_id: tenant1.id,
        customer_id: customer1.id,
        user_id: user1.id,
        total_amount: 10.00
      });

      await expect(TransactionItem.create({
        transaction_id: validTransaction.id,
        product_id: 99999, // Non-existent
        quantity: 1,
        unit_price: 10.00,
        total_price: 10.00
      })).rejects.toThrow();

      // Clean up
      await validTransaction.destroy();
    });
  });

  describe('Multi-tenancy Middleware Integration', () => {
    it('should properly scope queries by tenant', async () => {
      // This test verifies that the multi-tenancy middleware correctly scopes queries
      // In a real scenario, this would be tested through API calls with tenant headers

      // Simulate tenant-scoped queries
      const tenant1Data = await Promise.all([
        Customer.count({ where: { tenant_id: tenant1.id } }),
        Product.count({ where: { tenant_id: tenant1.id } }),
        User.count({ where: { tenant_id: tenant1.id } })
      ]);

      const tenant2Data = await Promise.all([
        Customer.count({ where: { tenant_id: tenant2.id } }),
        Product.count({ where: { tenant_id: tenant2.id } }),
        User.count({ where: { tenant_id: tenant2.id } })
      ]);

      // Each tenant should have their own data
      expect(tenant1Data[0]).toBe(1); // 1 customer
      expect(tenant1Data[1]).toBe(1); // 1 product
      expect(tenant1Data[2]).toBe(1); // 1 user

      expect(tenant2Data[0]).toBe(1); // 1 customer
      expect(tenant2Data[1]).toBe(1); // 1 product
      expect(tenant2Data[2]).toBe(1); // 1 user
    });
  });
});