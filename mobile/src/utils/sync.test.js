import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncProducts, cacheData, getCachedData, storePendingTransaction } from './sync';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
}));

// Mock API
jest.mock('../services/api', () => ({
  productsAPI: {
    getProducts: jest.fn(),
  },
  transactionsAPI: {
    createTransaction: jest.fn(),
  },
}));

const { productsAPI } = require('../services/api');

describe('Sync Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cacheData', () => {
    it('should cache data successfully', async () => {
      const testData = { id: 1, name: 'Test' };
      await cacheData('test_key', testData);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'test_key',
        JSON.stringify(testData)
      );
    });

    it('should handle caching errors', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await cacheData('test_key', { data: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith('Error caching data:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('getCachedData', () => {
    it('should return parsed cached data', async () => {
      const testData = { id: 1, name: 'Test' };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(testData));

      const result = await getCachedData('test_key');

      expect(result).toEqual(testData);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('test_key');
    });

    it('should return null for non-existent key', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await getCachedData('non_existent_key');

      expect(result).toBeNull();
    });

    it('should handle parsing errors', async () => {
      AsyncStorage.getItem.mockResolvedValue('invalid json');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await getCachedData('test_key');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('storePendingTransaction', () => {
    it('should store pending transaction', async () => {
      const transactionData = {
        customer_id: 1,
        items: [{ product_id: 1, quantity: 2 }],
        payment_method: 'cash',
      };

      AsyncStorage.getItem.mockResolvedValue(null); // No existing pending transactions

      const result = await storePendingTransaction(transactionData);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should append to existing pending transactions', async () => {
      const existingPending = [{ id: '1', data: {}, synced: false }];
      const newTransactionData = { customer_id: 2, items: [] };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingPending));

      await storePendingTransaction(newTransactionData);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const callArgs = AsyncStorage.setItem.mock.calls[0];
      const storedData = JSON.parse(callArgs[1]);
      expect(storedData).toHaveLength(2);
    });
  });

  describe('syncProducts', () => {
    it('should sync products when online', async () => {
      const mockProducts = [
        { id: 1, name: 'Product 1', price: 10.99 },
        { id: 2, name: 'Product 2', price: 15.99 },
      ];

      // Mock online status and API response
      const { isOnline } = require('./sync');
      jest.spyOn(require('./sync'), 'isOnline').mockResolvedValue(true);

      productsAPI.getProducts.mockResolvedValue({ products: mockProducts });

      const result = await syncProducts();

      expect(productsAPI.getProducts).toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'cached_products',
        JSON.stringify(mockProducts)
      );
      expect(result).toEqual(mockProducts);
    });

    it('should return cached data when offline', async () => {
      const cachedProducts = [{ id: 1, name: 'Cached Product' }];

      jest.spyOn(require('./sync'), 'isOnline').mockResolvedValue(false);
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedProducts));

      const result = await syncProducts();

      expect(productsAPI.getProducts).not.toHaveBeenCalled();
      expect(result).toEqual(cachedProducts);
    });
  });
});