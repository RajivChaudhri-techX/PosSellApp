const { test, expect } = require('@playwright/test');

test.describe('ShopXperience E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test data via API before each test
    // This assumes backend is running and has test data setup
    await page.goto('/');
  });

  test('should complete full login to POS flow', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Fill login form
    await page.fill('input[id="email"]', 'test@example.com');
    await page.fill('input[id="password"]', 'testpass123');

    // Submit login
    await page.click('button[type="submit"]');

    // Should redirect to dashboard or POS
    await expect(page).toHaveURL(/\/(dashboard|pos)/);

    // Navigate to POS if not already there
    if (!page.url().includes('/pos')) {
      await page.goto('/pos');
    }

    // Verify POS page loads
    await expect(page.locator('text=Point of Sale')).toBeVisible();
  });

  test('should add products to cart and checkout', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[id="email"]', 'test@example.com');
    await page.fill('input[id="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await page.goto('/pos');

    // Wait for products to load
    await page.waitForSelector('[data-testid="product-item"]', { timeout: 10000 });

    // Add first product to cart
    const firstProduct = page.locator('[data-testid="product-item"]').first();
    await firstProduct.click();

    // Verify cart has item
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);

    // Add another product
    const secondProduct = page.locator('[data-testid="product-item"]').nth(1);
    await secondProduct.click();

    // Verify cart has 2 items
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(2);

    // Update quantity
    const quantityInput = page.locator('[data-testid="cart-item"] input[type="number"]').first();
    await quantityInput.fill('2');

    // Proceed to checkout
    await page.click('button[data-testid="checkout-button"]');

    // Verify checkout mode
    await expect(page.locator('text=Checkout')).toBeVisible();

    // Complete checkout
    await page.click('button[data-testid="complete-checkout"]');

    // Verify cart is empty
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(0);
  });

  test('should handle inventory management', async ({ page }) => {
    // Login and go to inventory
    await page.goto('/login');
    await page.fill('input[id="email"]', 'test@example.com');
    await page.fill('input[id="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await page.goto('/inventory');

    // Verify inventory page loads
    await expect(page.locator('text=Inventory Management')).toBeVisible();

    // Check for low stock alerts
    const lowStockAlerts = page.locator('[data-testid="low-stock-alert"]');
    const alertCount = await lowStockAlerts.count();

    if (alertCount > 0) {
      // Verify alerts are displayed
      await expect(lowStockAlerts.first()).toBeVisible();
    }

    // Test inventory update
    const firstInventoryItem = page.locator('[data-testid="inventory-item"]').first();
    const updateButton = firstInventoryItem.locator('button[data-testid="update-stock"]');
    await updateButton.click();

    // Fill new quantity
    await page.fill('[data-testid="stock-input"]', '50');
    await page.click('button[data-testid="save-stock"]');

    // Verify success message
    await expect(page.locator('text=Stock updated successfully')).toBeVisible();
  });

  test('should manage customers', async ({ page }) => {
    // Login and go to customers
    await page.goto('/login');
    await page.fill('input[id="email"]', 'test@example.com');
    await page.fill('input[id="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await page.goto('/customers');

    // Verify customers page loads
    await expect(page.locator('text=Customer Management')).toBeVisible();

    // Add new customer
    await page.click('button[data-testid="add-customer"]');

    await page.fill('[data-testid="first-name"]', 'John');
    await page.fill('[data-testid="last-name"]', 'Doe');
    await page.fill('[data-testid="email"]', 'john.doe@example.com');
    await page.fill('[data-testid="phone"]', '+1234567890');

    await page.click('button[data-testid="save-customer"]');

    // Verify customer added
    await expect(page.locator('text=John Doe')).toBeVisible();

    // Search for customer
    await page.fill('[data-testid="search-input"]', 'John');
    await page.click('button[data-testid="search-button"]');

    // Verify search results
    await expect(page.locator('[data-testid="customer-item"]')).toHaveCount(1);
  });

  test('should generate and view reports', async ({ page }) => {
    // Login and go to reports
    await page.goto('/login');
    await page.fill('input[id="email"]', 'test@example.com');
    await page.fill('input[id="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await page.goto('/reports');

    // Verify reports page loads
    await expect(page.locator('text=Reports')).toBeVisible();

    // Generate sales report
    await page.selectOption('[data-testid="report-type"]', 'sales');
    await page.click('button[data-testid="generate-report"]');

    // Wait for report to load
    await page.waitForSelector('[data-testid="report-chart"]', { timeout: 10000 });

    // Verify chart is displayed
    await expect(page.locator('[data-testid="report-chart"]')).toBeVisible();

    // Export report
    await page.click('button[data-testid="export-report"]');

    // Verify download starts (this might need adjustment based on implementation)
    // For now, just check button exists
    await expect(page.locator('button[data-testid="export-report"]')).toBeVisible();
  });

  test('should handle authentication errors', async ({ page }) => {
    await page.goto('/login');

    // Test invalid credentials
    await page.fill('input[id="email"]', 'invalid@example.com');
    await page.fill('input[id="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Verify error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();

    // Test empty fields
    await page.fill('input[id="email"]', '');
    await page.fill('input[id="password"]', '');
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=Email is required')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[id="email"]', 'test@example.com');
    await page.fill('input[id="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await page.goto('/pos');

    // Simulate network failure by blocking API calls
    await page.route('**/api/**', route => route.abort());

    // Try to add product
    const firstProduct = page.locator('[data-testid="product-item"]').first();
    await firstProduct.click();

    // Should show error message
    await expect(page.locator('text=Network error')).toBeVisible();
  });
});