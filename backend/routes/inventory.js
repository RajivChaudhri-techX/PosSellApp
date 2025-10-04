const express = require('express');
const { Inventory, Product, Location, Supplier, Batch, Transfer } = require('../models');
const { authenticateToken, requireRole, requireLocationAccess } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const multiTenancyMiddleware = require('../middleware/multiTenancy');

const router = express.Router();

// Apply middleware to all routes
router.use(multiTenancyMiddleware);
router.use(authenticateToken);

// Get inventory for all products/locations
router.get('/', async (req, res) => {
  try {
    const { product_id, location_id, low_stock } = req.query;

    const whereClause = { tenant_id: req.tenantId };

    if (product_id) whereClause.product_id = product_id;
    if (location_id) whereClause.location_id = location_id;
    if (low_stock === 'true') {
      whereClause.quantity = {
        [require('sequelize').Op.lte]: require('sequelize').col('reorder_point')
      };
    }

    const inventory = await Inventory.findAll({
      where: whereClause,
      include: [Product, Location],
      order: [['updated_at', 'DESC']]
    });

    res.json({ inventory });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update inventory for specific product/location
router.put('/:product_id/:location_id', requireLocationAccess, validate(schemas.updateInventory), async (req, res) => {
  try {
    const { product_id, location_id } = req.params;
    const { quantity, min_stock, reorder_point } = req.body;

    // Find or create inventory record
    let inventory = await Inventory.findOne({
      where: {
        product_id,
        location_id,
        tenant_id: req.tenantId
      }
    });

    if (!inventory) {
      // Verify product and location exist
      const product = await Product.findOne({
        where: { id: product_id, tenant_id: req.tenantId }
      });
      const location = await Location.findOne({
        where: { id: location_id, tenant_id: req.tenantId }
      });

      if (!product || !location) {
        return res.status(404).json({ error: 'Product or location not found' });
      }

      inventory = await Inventory.create({
        tenant_id: req.tenantId,
        product_id,
        location_id,
        quantity,
        min_stock: min_stock || 0,
        reorder_point: reorder_point || 0
      });
    } else {
      await inventory.update({
        quantity,
        min_stock: min_stock !== undefined ? min_stock : inventory.min_stock,
        reorder_point: reorder_point !== undefined ? reorder_point : inventory.reorder_point
      });
    }

    // Fetch updated inventory with associations
    const updatedInventory = await Inventory.findByPk(inventory.id, {
      include: [Product, Location]
    });

    res.json({
      message: 'Inventory updated successfully',
      inventory: updatedInventory
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get inventory for specific product/location
router.get('/:product_id/:location_id', requireLocationAccess, async (req, res) => {
  try {
    const { product_id, location_id } = req.params;

    const inventory = await Inventory.findOne({
      where: {
        product_id,
        location_id,
        tenant_id: req.tenantId
      },
      include: [Product, Location]
    });

    if (!inventory) {
      return res.status(404).json({ error: 'Inventory record not found' });
    }

    res.json({ inventory });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk update inventory (admin/manager only)
router.post('/bulk-update', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const updates = req.body.updates; // Array of { product_id, location_id, quantity, min_stock, reorder_point }

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates must be an array' });
    }

    const results = [];

    for (const update of updates) {
      const { product_id, location_id, quantity, min_stock, reorder_point } = update;

      let inventory = await Inventory.findOne({
        where: {
          product_id,
          location_id,
          tenant_id: req.tenantId
        }
      });

      if (!inventory) {
        const product = await Product.findOne({
          where: { id: product_id, tenant_id: req.tenantId }
        });
        const location = await Location.findOne({
          where: { id: location_id, tenant_id: req.tenantId }
        });

        if (!product || !location) {
          results.push({
            product_id,
            location_id,
            success: false,
            error: 'Product or location not found'
          });
          continue;
        }

        inventory = await Inventory.create({
          tenant_id: req.tenantId,
          product_id,
          location_id,
          quantity,
          min_stock: min_stock || 0,
          reorder_point: reorder_point || 0
        });
      } else {
        await inventory.update({
          quantity,
          min_stock: min_stock !== undefined ? min_stock : inventory.min_stock,
          reorder_point: reorder_point !== undefined ? reorder_point : inventory.reorder_point
        });
      }

      results.push({
        product_id,
        location_id,
        success: true,
        inventory: {
          id: inventory.id,
          quantity: inventory.quantity,
          min_stock: inventory.min_stock,
          reorder_point: inventory.reorder_point
        }
      });
    }

    res.json({
      message: 'Bulk inventory update completed',
      results
    });
  } catch (error) {
    console.error('Bulk inventory update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Supplier routes

// Get all suppliers
router.get('/suppliers', async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({
      where: { tenant_id: req.tenantId },
      order: [['name', 'ASC']]
    });
    res.json({ suppliers });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create supplier
router.post('/suppliers', async (req, res) => {
  try {
    const { name, contact_name, email, phone, address } = req.body;
    const supplier = await Supplier.create({
      tenant_id: req.tenantId,
      name,
      contact_name,
      email,
      phone,
      address
    });
    res.status(201).json({ supplier });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update supplier
router.put('/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_name, email, phone, address } = req.body;
    const supplier = await Supplier.findOne({
      where: { id, tenant_id: req.tenantId }
    });
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    await supplier.update({ name, contact_name, email, phone, address });
    res.json({ supplier });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete supplier
router.delete('/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findOne({
      where: { id, tenant_id: req.tenantId }
    });
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    await supplier.destroy();
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Batch routes

// Get all batches
router.get('/batches', async (req, res) => {
  try {
    const { product_id } = req.query;
    const whereClause = { tenant_id: req.tenantId };
    if (product_id) whereClause.product_id = product_id;
    const batches = await Batch.findAll({
      where: whereClause,
      include: [Product, Supplier],
      order: [['received_date', 'DESC']]
    });
    res.json({ batches });
  } catch (error) {
    console.error('Get batches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create batch
router.post('/batches', async (req, res) => {
  try {
    const { product_id, supplier_id, batch_number, quantity_received, cost_per_unit, expiration_date, received_date } = req.body;
    const batch = await Batch.create({
      tenant_id: req.tenantId,
      product_id,
      supplier_id,
      batch_number,
      quantity_received,
      cost_per_unit,
      expiration_date,
      received_date
    });
    const createdBatch = await Batch.findByPk(batch.id, {
      include: [Product, Supplier]
    });
    res.status(201).json({ batch: createdBatch });
  } catch (error) {
    console.error('Create batch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update batch
router.put('/batches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id, supplier_id, batch_number, quantity_received, cost_per_unit, expiration_date, received_date } = req.body;
    const batch = await Batch.findOne({
      where: { id, tenant_id: req.tenantId }
    });
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    await batch.update({ product_id, supplier_id, batch_number, quantity_received, cost_per_unit, expiration_date, received_date });
    const updatedBatch = await Batch.findByPk(id, {
      include: [Product, Supplier]
    });
    res.json({ batch: updatedBatch });
  } catch (error) {
    console.error('Update batch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete batch
router.delete('/batches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await Batch.findOne({
      where: { id, tenant_id: req.tenantId }
    });
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    await batch.destroy();
    res.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    console.error('Delete batch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Transfer routes

// Get all transfers
router.get('/transfers', async (req, res) => {
  try {
    const { status } = req.query;
    const whereClause = { tenant_id: req.tenantId };
    if (status) whereClause.status = status;
    const transfers = await Transfer.findAll({
      where: whereClause,
      include: [
        { model: Location, as: 'fromLocation' },
        { model: Location, as: 'toLocation' },
        Product,
        Batch
      ],
      order: [['transfer_date', 'DESC']]
    });
    res.json({ transfers });
  } catch (error) {
    console.error('Get transfers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create transfer
router.post('/transfers', async (req, res) => {
  try {
    const { from_location_id, to_location_id, product_id, batch_id, quantity, transfer_date, notes } = req.body;
    const transfer = await Transfer.create({
      tenant_id: req.tenantId,
      from_location_id,
      to_location_id,
      product_id,
      batch_id,
      quantity,
      transfer_date,
      notes
    });
    const createdTransfer = await Transfer.findByPk(transfer.id, {
      include: [
        { model: Location, as: 'fromLocation' },
        { model: Location, as: 'toLocation' },
        Product,
        Batch
      ]
    });
    res.status(201).json({ transfer: createdTransfer });
  } catch (error) {
    console.error('Create transfer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update transfer status
router.put('/transfers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const transfer = await Transfer.findOne({
      where: { id, tenant_id: req.tenantId }
    });
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    await transfer.update({ status, notes });
    const updatedTransfer = await Transfer.findByPk(id, {
      include: [
        { model: Location, as: 'fromLocation' },
        { model: Location, as: 'toLocation' },
        Product,
        Batch
      ]
    });
    res.json({ transfer: updatedTransfer });
  } catch (error) {
    console.error('Update transfer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete transfer
router.delete('/transfers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const transfer = await Transfer.findOne({
      where: { id, tenant_id: req.tenantId }
    });
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    await transfer.destroy();
    res.json({ message: 'Transfer deleted successfully' });
  } catch (error) {
    console.error('Delete transfer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get reordering alerts
router.get('/reorder-alerts', async (req, res) => {
  try {
    const alerts = await Inventory.findAll({
      where: {
        tenant_id: req.tenantId,
        quantity: {
          [require('sequelize').Op.lte]: require('sequelize').col('reorder_point')
        }
      },
      include: [Product, Location],
      order: [['quantity', 'ASC']]
    });
    res.json({ alerts });
  } catch (error) {
    console.error('Get reorder alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get expiration alerts
router.get('/expiration-alerts', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));
    const alerts = await Batch.findAll({
      where: {
        tenant_id: req.tenantId,
        expiration_date: {
          [require('sequelize').Op.lte]: futureDate,
          [require('sequelize').Op.ne]: null
        }
      },
      include: [Product, Supplier],
      order: [['expiration_date', 'ASC']]
    });
    res.json({ alerts });
  } catch (error) {
    console.error('Get expiration alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;