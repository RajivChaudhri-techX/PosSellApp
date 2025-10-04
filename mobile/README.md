# ShopXperience Mobile App

A cross-platform React Native mobile application for point-of-sale (POS) operations, built for both iOS and Android platforms.

## Features

- **User Authentication**: Secure login with multi-tenant support
- **POS Operations**:
  - Product search and selection
  - Barcode scanning for quick product lookup
  - Shopping cart management
  - Transaction processing with multiple payment methods
- **Inventory Management**: View and update product inventory levels
- **Customer Management**: Add and manage customer information
- **Reporting**: Basic sales reports and analytics
- **Offline Support**: Continue operations offline with automatic synchronization

## Tech Stack

- **React Native 0.72.6**: Cross-platform mobile development
- **React Navigation**: Navigation and routing
- **AsyncStorage**: Local data storage
- **Axios**: HTTP client for API communication
- **React Native Camera**: Barcode scanning functionality
- **React Native Permissions**: Permission handling
- **Jest**: Unit testing

## Prerequisites

- Node.js >= 16
- React Native development environment
- iOS: Xcode (for iOS development)
- Android: Android Studio (for Android development)

## Installation

1. **Install dependencies**:
   ```bash
   cd mobile
   npm install
   ```

2. **iOS Setup**:
   ```bash
   cd ios
   pod install
   ```

3. **Android Setup**:
   - Ensure Android SDK is properly configured
   - Create `android/local.properties` with SDK path if needed

## Configuration

### API Configuration

The app connects to the ShopXperience backend API. Update the base URL in `src/services/api.js`:

```javascript
const BASE_URL = 'http://your-backend-url:3000/api';
```

### Permissions

The app requires the following permissions:

- **Camera**: For barcode scanning
- **Storage**: For offline data caching

Permissions are automatically requested when needed.

## Running the App

### Development

```bash
# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Project Structure

```
mobile/
├── src/
│   ├── screens/          # Screen components
│   │   ├── LoginScreen.js
│   │   ├── ProductSearchScreen.js
│   │   ├── BarcodeScannerScreen.js
│   │   ├── CartScreen.js
│   │   ├── CheckoutScreen.js
│   │   ├── InventoryScreen.js
│   │   ├── CustomerListScreen.js
│   │   └── ReportsScreen.js
│   ├── components/       # Reusable components
│   ├── services/         # API services
│   │   └── api.js
│   ├── utils/            # Utility functions
│   │   ├── sync.js       # Offline sync utilities
│   │   └── sync.test.js  # Sync utility tests
│   └── navigation/       # Navigation configuration
├── android/              # Android native code
├── ios/                  # iOS native code
├── App.js                # Main app component
├── index.js              # App entry point
├── package.json
├── metro.config.js
├── babel.config.js
└── react-native.config.js
```

## Key Features Implementation

### Offline Synchronization

The app implements offline-first architecture:

- **Data Caching**: Products, customers, and inventory are cached locally
- **Offline Transactions**: Transactions can be created offline and synced when online
- **Automatic Sync**: Data synchronization happens automatically when connectivity is restored

### Barcode Scanning

- Uses `react-native-camera` for camera access
- Supports various barcode formats
- Integrated with product search functionality

### Navigation

- Stack navigation for POS flow
- Tab navigation for main app sections
- Proper state management for cart and user session

## Testing

Unit tests are implemented for critical utilities:

- Sync utilities
- Data caching functions
- API error handling

Run tests with:
```bash
npm test
```

## Build & Deployment

### Android APK

```bash
cd android
./gradlew assembleRelease
```

### iOS App Store

```bash
cd ios
# Archive and upload via Xcode
```

## Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache with `npx react-native start --reset-cache`
2. **iOS build failures**: Ensure CocoaPods are installed and run `pod install`
3. **Android build failures**: Check Android SDK configuration and clean build
4. **Camera permissions**: Ensure camera permissions are granted in device settings

### Logs

- Use `console.log` for debugging
- Check device logs with `npx react-native log-android` or `npx react-native log-ios`

## Contributing

1. Follow React Native and JavaScript best practices
2. Write tests for new features
3. Update documentation for API changes
4. Ensure cross-platform compatibility

## License

This project is part of the ShopXperience suite.