const express = require('express');
const { Transaction, TransactionItem, Product, Inventory, Customer, Location } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const multiTenancyMiddleware = require('../middleware/multiTenancy');
const { sequelize } = require('../config/database');

const router = express.Router();

// Apply middleware to all routes
router.use(multiTenancyMiddleware);
router.use(authenticateToken);

// Create new transaction
router.post('/', validate(schemas.createTransaction), async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { customer_id, location_id, items, payment_method, discount_amount = 0 } = req.body;

    // Validate location belongs to tenant
    const location = await Location.findOne({
      where: { id: location_id, tenant_id: req.tenantId },
      transaction
    });

    if (!location) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Location not found' });
    }

    // Validate customer if provided
    if (customer_id) {
      const customer = await Customer.findOne({
        where: { id: customer_id, tenant_id: req.tenantId },
        transaction
      });

      if (!customer) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Customer not found' });
      }
    }

    let totalAmount = 0;
    const transactionItems = [];

    // Process each item
    for (const item of items) {
      const product = await Product.findOne({
        where: { id: item.product_id, tenant_id: req.tenantId },
        transaction
      });

      if (!product) {
        await transaction.rollback();
        return res.status(404).json({ error: `Product ${item.product_id} not found` });
      }

      // Check inventory
      const inventory = await Inventory.findOne({
        where: {
          product_id: item.product_id,
          location_id: location_id,
          tenant_id: req.tenantId
        },
        transaction
      });

      if (!inventory || inventory.quantity < item.quantity) {
        await transaction.rollback();
        return res.status(400).json({
          error: `Insufficient inventory for product ${product.name}`
        });
      }

      const itemTotal = parseFloat(product.price) * item.quantity;
      totalAmount += itemTotal;

      transactionItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: product.price,
        total_price: itemTotal
      });

      // Update inventory
      await inventory.update({
        quantity: inventory.quantity - item.quantity
      }, { transaction });
    }

    // Apply discount
    totalAmount -= discount_amount;
    if (totalAmount < 0) totalAmount = 0;

    // Validate payment method
    if (payment_method === 'card') {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Card payments must be processed through Stripe. Use /api/payments/create-payment-intent first.'
      });
    }

    // Create transaction
    const newTransaction = await Transaction.create({
      tenant_id: req.tenantId,
      customer_id,
      location_id,
      total_amount: totalAmount,
      tax_amount: 0, // Could be calculated based on business rules
      discount_amount,
      payment_method,
      status: 'completed'
    }, { transaction });

    // Create transaction items
    for (const item of transactionItems) {
      await TransactionItem.create({
        transaction_id: newTransaction.id,
        ...item
      }, { transaction });
    }

    await transaction.commit();

    // Fetch complete transaction with items
    const completeTransaction = await Transaction.findByPk(newTransaction.id, {
      include: [
        {
          model: TransactionItem,
          include: [Product]
        },
        Customer,
        Location
      ]
    });

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction: completeTransaction
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Transaction creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all transactions
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, location_id, customer_id, start_date, end_date } = req.query;

    const whereClause = { tenant_id: req.tenantId };

    if (location_id) whereClause.location_id = location_id;
    if (customer_id) whereClause.customer_id = customer_id;
    if (start_date && end_date) {
      whereClause.created_at = {
        [require('sequelize').Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    const transactions = await Transaction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: TransactionItem,
          include: [Product]
        },
        Customer,
        Location
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['created_at', 'DESC']]
    });

    res.json({
      transactions: transactions.rows,
      pagination: {
        total: transactions.count,
        page: parseInt(page),
        pages: Math.ceil(transactions.count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get transaction by ID
router.get('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      where: {
        id: req.params.id,
        tenant_id: req.tenantId
      },
      include: [
        {
          model: TransactionItem,
          include: [Product]
        },
        Customer,
        Location
      ]
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;