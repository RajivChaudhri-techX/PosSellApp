const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { validate, schemas } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const multiTenancyMiddleware = require('../middleware/multiTenancy');
const MFA = require('../utils/mfa');
const { auditLog } = require('../utils/logger');

const router = express.Router();

// Register new user (admin only)
router.post('/register', multiTenancyMiddleware, validate(schemas.register), async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        tenant_id: req.tenantId,
        [require('sequelize').Op.or]: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User with this username or email already exists'
      });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await User.create({
      tenant_id: req.tenantId,
      username,
      email,
      password_hash,
      role: role || 'cashier'
    });

    // Return user without password
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at
    };

    res.status(201).json({
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Login
router.post('/login', multiTenancyMiddleware, validate(schemas.login), async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({
      where: {
        tenant_id: req.tenantId,
        username
      }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      auditLog(user.id, req.tenantId, 'login_failed', { reason: 'invalid_password' });
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Check if MFA is enabled
    if (user.mfa_enabled) {
      // Generate temporary token for MFA verification
      const tempToken = jwt.sign(
        {
          userId: user.id,
          tenantId: req.tenantId,
          mfaRequired: true
        },
        process.env.JWT_SECRET,
        { expiresIn: '5m' } // Short-lived token
      );

      auditLog(user.id, req.tenantId, 'login_mfa_required');

      return res.json({
        message: 'MFA required',
        mfaRequired: true,
        tempToken
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: req.tenantId,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    auditLog(user.id, req.tenantId, 'login_successful');

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// MFA Setup
router.post('/mfa/setup', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    if (user.mfa_enabled) {
      return res.status(400).json({
        error: 'MFA is already enabled'
      });
    }

    const secret = MFA.generateSecret();
    const qrCode = await MFA.generateQRCode(secret);

    // Temporarily store secret in session or return it (in production, use secure session)
    // For now, return secret and QR, but in real app, store in temp cache

    auditLog(user.id, req.tenantId, 'mfa_setup_initiated');

    res.json({
      secret: secret.base32,
      qrCode,
      message: 'Scan the QR code with your authenticator app'
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// MFA Verify and Enable
router.post('/mfa/verify', authenticateToken, async (req, res) => {
  try {
    const { token, secret } = req.body;
    const user = req.user;

    if (user.mfa_enabled) {
      return res.status(400).json({
        error: 'MFA is already enabled'
      });
    }

    const isValid = MFA.verifyToken(secret, token);
    if (!isValid) {
      auditLog(user.id, req.tenantId, 'mfa_verification_failed');
      return res.status(400).json({
        error: 'Invalid MFA token'
      });
    }

    // Enable MFA
    await user.update({
      mfa_secret: secret,
      mfa_enabled: true
    });

    auditLog(user.id, req.tenantId, 'mfa_enabled');

    res.json({
      message: 'MFA enabled successfully'
    });
  } catch (error) {
    console.error('MFA verify error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// MFA Verify for Login
router.post('/mfa/verify-login', multiTenancyMiddleware, async (req, res) => {
  try {
    const { tempToken, token } = req.body;

    // Verify temp token
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (!decoded.mfaRequired) {
      return res.status(400).json({
        error: 'Invalid token'
      });
    }

    const user = await User.findByPk(decoded.userId);
    if (!user || user.tenant_id !== req.tenantId) {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }

    const isValid = MFA.verifyToken(user.mfa_secret, token);
    if (!isValid) {
      auditLog(user.id, req.tenantId, 'mfa_login_failed');
      return res.status(401).json({
        error: 'Invalid MFA token'
      });
    }

    // Generate final JWT token
    const finalToken = jwt.sign(
      {
        userId: user.id,
        tenantId: req.tenantId,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    auditLog(user.id, req.tenantId, 'login_successful_mfa');

    res.json({
      message: 'Login successful',
      token: finalToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('MFA login verify error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;