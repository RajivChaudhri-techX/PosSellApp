const crypto = require('crypto');

// Encryption key - in production, this should be from environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key-here'; // Must be 32 bytes
const ALGORITHM = 'aes-256-cbc';

class Encryption {
  static encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  static decrypt(text) {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedText);
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Hash sensitive data (for non-reversible encryption)
  static hash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}

module.exports = Encryption;