const express = require('express');
const { Customer } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const multiTenancyMiddleware = require('../middleware/multiTenancy');

const router = express.Router();

// Apply middleware to all routes
router.use(multiTenancyMiddleware);
router.use(authenticateToken);

// Get all customers
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    const whereClause = { tenant_id: req.tenantId };

    if (search) {
      whereClause[require('sequelize').Op.or] = [
        { first_name: { [require('sequelize').Op.iLike]: `%${search}%` } },
        { last_name: { [require('sequelize').Op.iLike]: `%${search}%` } },
        { email: { [require('sequelize').Op.iLike]: `%${search}%` } },
        { phone: { [require('sequelize').Op.iLike]: `%${search}%` } }
      ];
    }

    const customers = await Customer.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['created_at', 'DESC']]
    });

    res.json({
      customers: customers.rows,
      pagination: {
        total: customers.count,
        page: parseInt(page),
        pages: Math.ceil(customers.count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new customer
router.post('/', validate(schemas.createCustomer), async (req, res) => {
  try {
    const { first_name, last_name, email, phone, address } = req.body;

    // Check for duplicate email if provided
    if (email) {
      const existingCustomer = await Customer.findOne({
        where: {
          tenant_id: req.tenantId,
          email
        }
      });

      if (existingCustomer) {
        return res.status(409).json({
          error: 'Customer with this email already exists'
        });
      }
    }

    const customer = await Customer.create({
      tenant_id: req.tenantId,
      first_name,
      last_name,
      email,
      phone,
      address
    });

    res.status(201).json({
      message: 'Customer created successfully',
      customer
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOne({
      where: {
        id: req.params.id,
        tenant_id: req.tenantId
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ customer });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update customer
router.put('/:id', validate(schemas.createCustomer), async (req, res) => {
  try {
    const { first_name, last_name, email, phone, address } = req.body;

    const customer = await Customer.findOne({
      where: {
        id: req.params.id,
        tenant_id: req.tenantId
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check for duplicate email if changed
    if (email && email !== customer.email) {
      const existingCustomer = await Customer.findOne({
        where: {
          tenant_id: req.tenantId,
          email
        }
      });

      if (existingCustomer) {
        return res.status(409).json({
          error: 'Customer with this email already exists'
        });
      }
    }

    await customer.update({
      first_name,
      last_name,
      email,
      phone,
      address
    });

    res.json({
      message: 'Customer updated successfully',
      customer
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOne({
      where: {
        id: req.params.id,
        tenant_id: req.tenantId
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await customer.destroy();

    res.json({
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;