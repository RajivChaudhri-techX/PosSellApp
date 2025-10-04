const express = require('express');
const { Location, User, UserLocation, Tenant } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const multiTenancyMiddleware = require('../middleware/multiTenancy');

const router = express.Router();

// Apply middleware to all routes
router.use(multiTenancyMiddleware);
router.use(authenticateToken);

// Get all locations for the tenant
router.get('/', async (req, res) => {
  try {
    const locations = await Location.findAll({
      where: { tenant_id: req.tenantId },
      order: [['name', 'ASC']]
    });
    res.json({ locations });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get location by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const location = await Location.findOne({
      where: { id, tenant_id: req.tenantId }
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({ location });
  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create location (admin/manager only)
router.post('/', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const {
      name,
      address,
      phone,
      tax_rate,
      pricing_multiplier,
      operating_hours,
      timezone,
      currency,
      is_active
    } = req.body;

    const location = await Location.create({
      tenant_id: req.tenantId,
      name,
      address,
      phone,
      tax_rate: tax_rate || 0,
      pricing_multiplier: pricing_multiplier || 1,
      operating_hours,
      timezone: timezone || 'UTC',
      currency: currency || 'USD',
      is_active: is_active !== undefined ? is_active : true
    });

    res.status(201).json({ location });
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update location (admin/manager only)
router.put('/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      phone,
      tax_rate,
      pricing_multiplier,
      operating_hours,
      timezone,
      currency,
      is_active
    } = req.body;

    const location = await Location.findOne({
      where: { id, tenant_id: req.tenantId }
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    await location.update({
      name,
      address,
      phone,
      tax_rate,
      pricing_multiplier,
      operating_hours,
      timezone,
      currency,
      is_active
    });

    res.json({ location });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete location (admin only)
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const location = await Location.findOne({
      where: { id, tenant_id: req.tenantId }
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Check if location has dependencies
    const inventoryCount = await location.countInventories();
    const transactionCount = await location.countTransactions();
    const transferCount = await location.countFromTransfers() + await location.countToTransfers();

    if (inventoryCount > 0 || transactionCount > 0 || transferCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete location with existing inventory, transactions, or transfers'
      });
    }

    await location.destroy();
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get users assigned to a location
router.get('/:id/users', async (req, res) => {
  try {
    const { id } = req.params;
    const location = await Location.findOne({
      where: { id, tenant_id: req.tenantId }
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const userLocations = await UserLocation.findAll({
      where: { location_id: id },
      include: [{
        model: User,
        attributes: ['id', 'username', 'email', 'role']
      }]
    });

    const users = userLocations.map(ul => ({
      ...ul.User.toJSON(),
      role_at_location: ul.role_at_location,
      is_primary: ul.is_primary,
      assigned_at: ul.assigned_at
    }));

    res.json({ users });
  } catch (error) {
    console.error('Get location users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign user to location (admin/manager only)
router.post('/:id/users', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, role_at_location, is_primary = false } = req.body;

    const location = await Location.findOne({
      where: { id, tenant_id: req.tenantId }
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const user = await User.findOne({
      where: { id: user_id, tenant_id: req.tenantId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if assignment already exists
    const existingAssignment = await UserLocation.findOne({
      where: { user_id, location_id: id }
    });

    if (existingAssignment) {
      return res.status(400).json({ error: 'User is already assigned to this location' });
    }

    // If setting as primary, unset other primaries for this user
    if (is_primary) {
      await UserLocation.update(
        { is_primary: false },
        { where: { user_id } }
      );
    }

    const userLocation = await UserLocation.create({
      user_id,
      location_id: id,
      role_at_location: role_at_location || user.role,
      is_primary
    });

    res.status(201).json({ userLocation });
  } catch (error) {
    console.error('Assign user to location error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove user from location (admin/manager only)
router.delete('/:id/users/:user_id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id, user_id } = req.params;

    const userLocation = await UserLocation.findOne({
      where: { user_id, location_id: id }
    });

    if (!userLocation) {
      return res.status(404).json({ error: 'User not assigned to this location' });
    }

    await userLocation.destroy();
    res.json({ message: 'User removed from location successfully' });
  } catch (error) {
    console.error('Remove user from location error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's locations
router.get('/user/current', async (req, res) => {
  try {
    const userLocations = await UserLocation.findAll({
      where: { user_id: req.userId },
      include: [Location],
      order: [['is_primary', 'DESC'], ['assigned_at', 'ASC']]
    });

    const locations = userLocations.map(ul => ({
      ...ul.Location.toJSON(),
      role_at_location: ul.role_at_location,
      is_primary: ul.is_primary,
      assigned_at: ul.assigned_at
    }));

    res.json({ locations });
  } catch (error) {
    console.error('Get user locations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;