# ShopXperience Mobile App User Manual

## Overview

The ShopXperience mobile app is designed for retail staff to process transactions on-the-go. It provides offline capability, barcode scanning, and streamlined checkout processes optimized for mobile devices.

## Getting Started

### Installation

1. Download the ShopXperience app from the App Store (iOS) or Google Play Store (Android)
2. Install the app on your mobile device
3. Ensure your device has camera permissions for barcode scanning

### First-Time Setup

1. **Launch the App**: Open ShopXperience on your device
2. **Login Screen**: You'll be prompted to enter your credentials

## Authentication

### Logging In

The login process requires three pieces of information:

1. **Tenant ID**: Your organization's unique identifier
2. **Username**: Your personal username
3. **Password**: Your account password

**Steps:**
1. Enter your Tenant ID
2. Enter your username
3. Enter your password
4. Tap "Login"

### Multi-Factor Authentication (MFA)

If MFA is enabled for your account:

1. After entering credentials, you'll see an "MFA Required" prompt
2. Open your authenticator app (Google Authenticator, Authy, etc.)
3. Enter the 6-digit code
4. Tap "Verify MFA"

### Offline Login

The app supports offline login if you've logged in previously:
- The app will use cached credentials
- Some features may be limited when offline

## Navigation

The app uses a bottom tab navigation with four main sections:

- **POS** (Point of Sale): Transaction processing
- **Inventory**: Stock management and viewing
- **Customers**: Customer information and management
- **Reports**: Sales and analytics reports

## Point of Sale (POS)

### Product Search

**Access**: Tap the "POS" tab → Product Search screen

**Features:**
- **Search Bar**: Type to search products by name or SKU
- **Scan Barcode**: Tap "Scan" button to use camera for barcode scanning
- **Product List**: Browse available products with prices
- **Add to Cart**: Tap "Add" button or tap product item

**Offline Mode:**
- Works with cached product data
- Shows "Offline" indicator when not connected
- Syncs data when connection is restored

### Barcode Scanning

**Access**: From Product Search screen, tap "Scan" button

**How to Use:**
1. Position the barcode within the camera viewfinder
2. Ensure good lighting and steady camera
3. The app will automatically recognize and add the product
4. If scanning fails, try adjusting distance or angle

**Supported Formats:**
- QR codes
- UPC-A
- UPC-E
- EAN-13
- EAN-8
- Code 128
- Code 39

### Shopping Cart

**Access**: Appears automatically when items are added, or tap "View Cart"

**Features:**
- **Item List**: Shows all items with quantities and prices
- **Quantity Controls**: Use +/- buttons to adjust quantities
- **Remove Items**: Tap "Remove" button to delete items
- **Cart Summary**: Shows total items and amount
- **Empty Cart**: Clear all items if needed

**Cart Management:**
- Items are saved temporarily during the session
- Cart persists if you navigate away and return
- Automatic calculation of subtotals and totals

### Checkout Process

**Access**: From Cart screen, tap "Proceed to Checkout"

**Payment Options:**
1. **Card Payment** (recommended):
   - Integrated with Stripe for secure processing
   - Supports all major credit/debit cards
   - PCI DSS compliant

2. **Cash Payment**:
   - For cash transactions
   - Records payment method for reporting

3. **Other Methods**:
   - Check, gift card, or other payment types

**Checkout Steps:**
1. Review cart items and totals
2. Select payment method
3. Optionally associate with customer
4. Apply discounts if applicable
5. Confirm and process payment
6. Print or email receipt

**Receipt Options:**
- Digital receipt via email
- Print receipt (if printer connected)
- Save receipt to device

## Inventory Management

### Viewing Inventory

**Access**: Tap "Inventory" tab

**Features:**
- **Stock Levels**: Current quantities for all products
- **Location Filter**: View inventory by store location
- **Low Stock Alerts**: Highlight items below reorder point
- **Search**: Find specific products or categories

### Inventory Actions

**Available Actions:**
- **View Details**: Tap product for detailed information
- **Stock Count**: Update physical inventory counts
- **Transfer Requests**: Request stock transfers between locations
- **Supplier Information**: View supplier details for products

**Offline Capabilities:**
- View cached inventory data
- Queue updates for when connection is restored
- Sync status indicators

## Customer Management

### Customer Database

**Access**: Tap "Customers" tab

**Features:**
- **Search Customers**: Find by name, email, or phone
- **Customer Profiles**: View purchase history and details
- **Add New Customers**: Create customer records during checkout
- **Customer Analytics**: Lifetime value and purchase patterns

### Customer Information

**Profile Details:**
- Personal information (name, contact details)
- Purchase history
- Preferred payment methods
- Loyalty program status

### Adding Customers

**During Checkout:**
1. In checkout screen, tap "Add Customer"
2. Enter customer details
3. Associate with transaction

**Direct Addition:**
1. From Customers tab, tap "Add Customer"
2. Fill in customer information
3. Save to database

## Reports & Analytics

### Available Reports

**Access**: Tap "Reports" tab

**Report Types:**
- **Sales Summary**: Daily, weekly, monthly sales data
- **Top Products**: Best-selling items
- **Customer Insights**: Purchase patterns and analytics
- **Inventory Status**: Stock levels and turnover

### Report Features

- **Date Filtering**: Select custom date ranges
- **Export Options**: CSV and PDF formats
- **Real-time Data**: Current sales and inventory status
- **Offline Viewing**: Access cached reports when offline

## Offline Functionality

### Offline Mode Features

**What Works Offline:**
- Product search and browsing (cached data)
- Cart management
- Basic inventory viewing
- Customer lookup
- Previously downloaded reports

**Offline Indicators:**
- "Offline" banner at top of screen
- Sync status for each data type
- Queued actions counter

### Data Synchronization

**Automatic Sync:**
- Syncs when internet connection is restored
- Uploads queued transactions and updates
- Downloads latest product and inventory data

**Manual Sync:**
- Pull-to-refresh in most screens
- "Sync Now" button in settings
- Background sync when app is open

### Data Storage

**Cached Data:**
- Products and inventory (7-day expiration)
- Customer information (30-day expiration)
- Recent transactions (unlimited)
- User preferences and settings

## Settings and Preferences

### App Settings

**Access**: Tap profile icon → Settings

**Available Settings:**
- **Notifications**: Enable/disable push notifications
- **Receipt Preferences**: Default receipt options
- **Printer Settings**: Configure receipt printer
- **Sync Preferences**: Auto-sync settings
- **Security**: MFA and password settings

### Device Permissions

**Required Permissions:**
- **Camera**: For barcode scanning
- **Storage**: For offline data caching
- **Location**: For location-based features (optional)

## Best Practices

### Daily Operations

1. **Start of Shift**:
   - Ensure device is charged
   - Check offline data sync
   - Verify camera and permissions

2. **During Transactions**:
   - Keep cart summary visible
   - Double-check quantities before checkout
   - Confirm payment amounts

3. **End of Shift**:
   - Sync all data
   - Review daily sales summary
   - Clear any cached sensitive data

### Performance Optimization

1. **Regular Sync**: Keep data current with frequent syncs
2. **Cache Management**: Clear old cached data periodically
3. **App Updates**: Install updates for bug fixes and features
4. **Device Maintenance**: Keep device storage free

### Security Practices

1. **Device Security**: Use device PIN or biometric lock
2. **App Security**: Enable MFA when available
3. **Data Handling**: Don't leave sensitive customer data visible
4. **Logout**: Always log out when not using the app

## Troubleshooting

### Common Issues

**Login Problems:**
- Verify tenant ID, username, and password
- Check internet connection for online login
- Ensure MFA code is current (valid for 30 seconds)

**Scanning Issues:**
- Clean camera lens
- Ensure adequate lighting
- Hold device steady
- Check barcode quality

**Sync Problems:**
- Check internet connection
- Force refresh data
- Clear app cache if needed

**Payment Processing:**
- Verify card information
- Check Stripe connection
- Ensure PCI compliance settings

### Error Messages

**"No cached data available":**
- Connect to internet and sync
- Check if app has been used online before

**"Payment failed":**
- Verify card details
- Check internet connection
- Contact support for Stripe issues

**"Sync failed":**
- Check network connection
- Try manual sync
- Restart app if needed

### Getting Help

**In-App Support:**
- Help sections in each screen
- Tooltips for features
- Error message explanations

**External Support:**
- Email: mobile-support@shopxperience.com
- Phone: 1-800-SHOP-XP
- Online documentation: docs.shopxperience.com/mobile

## Device Compatibility

### Supported Devices

**iOS:**
- iPhone 8 and later
- iPad (6th generation and later)
- iOS 12.0 or later

**Android:**
- Android 8.0 (API level 26) or later
- Minimum 2GB RAM recommended
- Camera with autofocus

### Recommended Specifications

- **Storage**: 500MB free space
- **RAM**: 2GB minimum, 4GB recommended
- **Camera**: 8MP rear camera minimum
- **Network**: Wi-Fi or cellular data

## Updates and Maintenance

### App Updates

- Automatic updates through app stores
- Manual check for updates in settings
- Update notifications for critical fixes

### Data Backup

- Automatic cloud backup for settings
- Transaction data stored on servers
- Local cache can be cleared without data loss

### Performance Monitoring

- Built-in performance metrics
- Crash reporting for improvements
- Usage analytics (opt-in)

---

For additional assistance, please contact ShopXperience mobile support or refer to the comprehensive online documentation.