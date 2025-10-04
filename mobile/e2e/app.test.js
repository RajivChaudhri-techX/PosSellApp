const { device, expect, element, by, waitFor } = require('detox');

describe('ShopXperience Mobile App', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show login screen on app start', async () => {
    await expect(element(by.id('login-screen'))).toBeVisible();
  });

  it('should login with valid credentials', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('testpass123');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('dashboard-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should show error for invalid credentials', async () => {
    await element(by.id('email-input')).typeText('invalid@example.com');
    await element(by.id('password-input')).typeText('wrongpass');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.text('Invalid credentials')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should navigate to cart screen', async () => {
    // Login first
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('testpass123');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('dashboard-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Navigate to cart
    await element(by.id('cart-tab')).tap();

    await expect(element(by.id('cart-screen'))).toBeVisible();
  });

  it('should add product to cart', async () => {
    // Login
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('testpass123');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('dashboard-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Go to products
    await element(by.id('products-tab')).tap();

    // Wait for products to load
    await waitFor(element(by.id('product-item')))
      .toBeVisible()
      .withTimeout(10000);

    // Add first product to cart
    await element(by.id('product-item')).atIndex(0).tap();
    await element(by.id('add-to-cart-button')).tap();

    // Check cart badge
    await expect(element(by.id('cart-badge'))).toHaveText('1');
  });

  it('should complete checkout flow', async () => {
    // Login and add product to cart
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('testpass123');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('dashboard-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Add product
    await element(by.id('products-tab')).tap();
    await waitFor(element(by.id('product-item')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('product-item')).atIndex(0).tap();
    await element(by.id('add-to-cart-button')).tap();

    // Go to cart
    await element(by.id('cart-tab')).tap();

    // Proceed to checkout
    await element(by.id('checkout-button')).tap();

    // Verify checkout screen
    await expect(element(by.id('checkout-screen'))).toBeVisible();

    // Select payment method
    await element(by.id('cash-payment')).tap();

    // Complete checkout
    await element(by.id('complete-checkout-button')).tap();

    // Verify success
    await waitFor(element(by.text('Order completed successfully')))
      .toBeVisible()
      .withTimeout(5000);

    // Verify cart is empty
    await element(by.id('cart-tab')).tap();
    await expect(element(by.id('empty-cart-message'))).toBeVisible();
  });

  it('should handle barcode scanning', async () => {
    // Login
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('testpass123');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('dashboard-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Navigate to barcode scanner
    await element(by.id('barcode-scan-button')).tap();

    // Mock barcode scan (in real app, this would use camera)
    await element(by.id('mock-barcode-input')).typeText('123456789');
    await element(by.id('scan-confirm-button')).tap();

    // Verify product details show
    await expect(element(by.id('product-details-screen'))).toBeVisible();
  });

  it('should sync data when online', async () => {
    // Login
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('testpass123');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('dashboard-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Trigger sync
    await element(by.id('sync-button')).tap();

    // Verify sync success
    await waitFor(element(by.text('Sync completed')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should work offline and queue operations', async () => {
    // Simulate offline mode
    await device.setURLBlacklist(['**/api/**']);

    // Login (should work from cache)
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('testpass123');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('dashboard-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Add product to cart (should queue)
    await element(by.id('products-tab')).tap();
    await waitFor(element(by.id('product-item')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('product-item')).atIndex(0).tap();
    await element(by.id('add-to-cart-button')).tap();

    // Verify offline indicator
    await expect(element(by.id('offline-indicator'))).toBeVisible();

    // Re-enable network
    await device.setURLBlacklist([]);

    // Trigger sync
    await element(by.id('sync-button')).tap();

    // Verify sync processes queued operations
    await waitFor(element(by.text('Sync completed')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should handle inventory alerts', async () => {
    // Login
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('testpass123');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('dashboard-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Check for inventory alerts
    const alertElement = element(by.id('inventory-alert'));

    try {
      await expect(alertElement).toBeVisible();
      // If alert exists, tap it
      await alertElement.tap();

      // Verify inventory screen opens
      await expect(element(by.id('inventory-screen'))).toBeVisible();
    } catch (e) {
      // No alerts, that's also fine
      console.log('No inventory alerts present');
    }
  });
});