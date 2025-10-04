const validator = require('validator');

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize query parameters
  for (const key in req.query) {
    if (typeof req.query[key] === 'string') {
      req.query[key] = validator.escape(req.query[key]);
    }
  }

  // Sanitize body parameters
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Escape HTML and prevent XSS
        obj[key] = validator.escape(obj[key]);
        // Trim whitespace
        obj[key] = validator.trim(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  // Sanitize route parameters
  for (const key in req.params) {
    if (typeof req.params[key] === 'string') {
      req.params[key] = validator.escape(req.params[key]);
    }
  }

  next();
};

module.exports = sanitizeInput;