const express = require('express');
const { Product, Inventory } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const multiTenancyMiddleware = require('../middleware/multiTenancy');

const router = express.Router();

// Apply middleware to all routes
router.use(multiTenancyMiddleware);
router.use(authenticateToken);

// Get all products
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;

    const whereClause = { tenant_id: req.tenantId };

    if (category) whereClause.category = category;
    if (search) {
      whereClause[require('sequelize').Op.or] = [
        { name: { [require('sequelize').Op.iLike]: `%${search}%` } },
        { sku: { [require('sequelize').Op.iLike]: `%${search}%` } },
        { description: { [require('sequelize').Op.iLike]: `%${search}%` } }
      ];
    }

    const products = await Product.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['created_at', 'DESC']]
    });

    res.json({
      products: products.rows,
      pagination: {
        total: products.count,
        page: parseInt(page),
        pages: Math.ceil(products.count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new product
router.post('/', requireRole(['admin', 'manager']), validate(schemas.createProduct), async (req, res) => {
  try {
    const { name, description, sku, price, cost, category } = req.body;

    // Check for duplicate SKU
    const existingProduct = await Product.findOne({
      where: {
        tenant_id: req.tenantId,
        sku
      }
    });

    if (existingProduct) {
      return res.status(409).json({
        error: 'Product with this SKU already exists'
      });
    }

    const product = await Product.create({
      tenant_id: req.tenantId,
      name,
      description,
      sku,
      price,
      cost,
      category
    });

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({
      where: {
        id: req.params.id,
        tenant_id: req.tenantId
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product
router.put('/:id', requireRole(['admin', 'manager']), validate(schemas.updateProduct), async (req, res) => {
  try {
    const { name, description, sku, price, cost, category } = req.body;

    const product = await Product.findOne({
      where: {
        id: req.params.id,
        tenant_id: req.tenantId
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check for duplicate SKU if changed
    if (sku && sku !== product.sku) {
      const existingProduct = await Product.findOne({
        where: {
          tenant_id: req.tenantId,
          sku
        }
      });

      if (existingProduct) {
        return res.status(409).json({
          error: 'Product with this SKU already exists'
        });
      }
    }

    await product.update({
      name: name || product.name,
      description: description !== undefined ? description : product.description,
      sku: sku || product.sku,
      price: price !== undefined ? price : product.price,
      cost: cost !== undefined ? cost : product.cost,
      category: category !== undefined ? category : product.category
    });

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product
router.delete('/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const product = await Product.findOne({
      where: {
        id: req.params.id,
        tenant_id: req.tenantId
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if product has inventory or transactions
    const inventoryCount = await Inventory.count({
      where: { product_id: req.params.id }
    });

    if (inventoryCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete product with existing inventory'
      });
    }

    await product.destroy();

    res.json({
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;