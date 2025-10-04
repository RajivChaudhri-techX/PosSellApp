const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

class MFA {
  static generateSecret() {
    return speakeasy.generateSecret({
      name: 'ShopXperience',
      issuer: 'ShopXperience POS'
    });
  }

  static generateQRCode(secret) {
    return qrcode.toDataURL(secret.otpauth_url);
  }

  static verifyToken(secret, token) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time windows (30 seconds each)
    });
  }
}

module.exports = MFA;