const jwt = require('jsonwebtoken');
const { User, UserLocation } = require('../models');

// Define permissions for each role
const rolePermissions = {
  admin: [
    'manage_users',
    'manage_inventory',
    'manage_customers',
    'manage_reports',
    'manage_transactions',
    'view_audit_logs',
    'manage_locations',
    'access_all_locations'
  ],
  manager: [
    'manage_inventory',
    'manage_customers',
    'manage_reports',
    'manage_transactions',
    'access_assigned_locations'
  ],
  cashier: [
    'view_inventory',
    'manage_transactions',
    'view_customers',
    'access_assigned_locations'
  ]
};

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access token is required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }

    // Check if user belongs to the current tenant
    if (user.tenant_id !== req.tenantId) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Middleware to check user roles
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Middleware to check specific permissions
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const userPermissions = rolePermissions[req.user.role] || [];
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Middleware to check location access
const requireLocationAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  const userPermissions = rolePermissions[req.user.role] || [];

  // Admins have access to all locations
  if (userPermissions.includes('access_all_locations')) {
    return next();
  }

  // For users with location restrictions, check if they have access to the requested location
  if (userPermissions.includes('access_assigned_locations')) {
    const locationId = req.params.location_id || req.query.location_id || req.body.location_id;

    if (!locationId) {
      return res.status(400).json({
        error: 'Location ID required'
      });
    }

    // Check if user is assigned to this location
    UserLocation.findOne({
      where: {
        user_id: req.user.id,
        location_id: locationId
      }
    }).then(userLocation => {
      if (!userLocation) {
        return res.status(403).json({
          error: 'Access denied to this location'
        });
      }
      next();
    }).catch(error => {
      console.error('Location access check error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    });
  } else {
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  requireLocationAccess
};