const { Tenant } = require('../models');

// Middleware to handle multi-tenancy
const multiTenancyMiddleware = async (req, res, next) => {
  try {
    // Extract tenant identifier from request
    // This can be from subdomain, header, JWT, etc.
    // For simplicity, using header 'x-tenant-id'
    const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Tenant identifier is required'
      });
    }

    // Verify tenant exists
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found'
      });
    }

    // Attach tenant info to request
    req.tenantId = tenantId;
    req.tenant = tenant;

    next();
  } catch (error) {
    console.error('Multi-tenancy middleware error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

module.exports = multiTenancyMiddleware;