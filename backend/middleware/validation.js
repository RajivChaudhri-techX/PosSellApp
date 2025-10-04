const Joi = require('joi');

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
};

// Validation schemas
const schemas = {
  // User schemas
  register: Joi.object({
    username: Joi.string().min(3).max(255).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'manager', 'cashier').default('cashier')
  }),

  login: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  }),

  // Product schemas
  createProduct: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().allow(''),
    sku: Joi.string().min(1).max(100).required(),
    price: Joi.number().positive().precision(2).required(),
    cost: Joi.number().positive().precision(2),
    category: Joi.string().max(100)
  }),

  updateProduct: Joi.object({
    name: Joi.string().min(1).max(255),
    description: Joi.string().allow(''),
    sku: Joi.string().min(1).max(100),
    price: Joi.number().positive().precision(2),
    cost: Joi.number().positive().precision(2),
    category: Joi.string().max(100)
  }),

  // Customer schemas
  createCustomer: Joi.object({
    first_name: Joi.string().min(1).max(100).required(),
    last_name: Joi.string().min(1).max(100).required(),
    email: Joi.string().email(),
    phone: Joi.string().max(20),
    address: Joi.string()
  }),

  // Transaction schemas
  createTransaction: Joi.object({
    customer_id: Joi.number().integer(),
    location_id: Joi.number().integer().required(),
    items: Joi.array().items(
      Joi.object({
        product_id: Joi.number().integer().required(),
        quantity: Joi.number().integer().positive().required()
      })
    ).min(1).required(),
    payment_method: Joi.string().valid('cash', 'card', 'digital').required(),
    discount_amount: Joi.number().min(0).precision(2).default(0)
  }),

  confirmPayment: Joi.object({
    payment_intent_id: Joi.string().required(),
    customer_id: Joi.number().integer(),
    location_id: Joi.number().integer().required(),
    items: Joi.array().items(
      Joi.object({
        product_id: Joi.number().integer().required(),
        quantity: Joi.number().integer().positive().required()
      })
    ).min(1).required(),
    discount_amount: Joi.number().min(0).precision(2).default(0)
  }),

  // Inventory schemas
  updateInventory: Joi.object({
    quantity: Joi.number().integer().min(0).required(),
    min_stock: Joi.number().integer().min(0),
    reorder_point: Joi.number().integer().min(0)
  }),

  // Supplier schemas
  createSupplier: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    contact_name: Joi.string().max(255),
    email: Joi.string().email(),
    phone: Joi.string().max(20),
    address: Joi.string()
  }),

  updateSupplier: Joi.object({
    name: Joi.string().min(1).max(255),
    contact_name: Joi.string().max(255),
    email: Joi.string().email(),
    phone: Joi.string().max(20),
    address: Joi.string()
  }),

  // Batch schemas
  createBatch: Joi.object({
    product_id: Joi.number().integer().required(),
    supplier_id: Joi.number().integer(),
    batch_number: Joi.string().min(1).max(100).required(),
    quantity_received: Joi.number().integer().positive().required(),
    cost_per_unit: Joi.number().positive().precision(2).required(),
    expiration_date: Joi.date(),
    received_date: Joi.date()
  }),

  updateBatch: Joi.object({
    product_id: Joi.number().integer(),
    supplier_id: Joi.number().integer(),
    batch_number: Joi.string().min(1).max(100),
    quantity_received: Joi.number().integer().positive(),
    cost_per_unit: Joi.number().positive().precision(2),
    expiration_date: Joi.date(),
    received_date: Joi.date()
  }),

  // Transfer schemas
  createTransfer: Joi.object({
    from_location_id: Joi.number().integer().required(),
    to_location_id: Joi.number().integer().required(),
    product_id: Joi.number().integer().required(),
    batch_id: Joi.number().integer(),
    quantity: Joi.number().integer().positive().required(),
    transfer_date: Joi.date(),
    notes: Joi.string()
  }),

  updateTransfer: Joi.object({
    status: Joi.string().valid('pending', 'completed', 'cancelled'),
    notes: Joi.string()
  })
};

module.exports = {
  validate,
  schemas
};