import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { productsAPI, customersAPI, inventoryAPI, transactionsAPI } from '../services/api';

// Storage keys
const STORAGE_KEYS = {
  PRODUCTS: 'cached_products',
  CUSTOMERS: 'cached_customers',
  INVENTORY: 'cached_inventory',
  PENDING_TRANSACTIONS: 'pending_transactions',
  LAST_SYNC: 'last_sync_timestamp',
};

// Check if device is online
export const isOnline = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected;
};

// Cache data locally
export const cacheData = async (key, data) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error caching data:', error);
  }
};

// Get cached data
export const getCachedData = async (key) => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting cached data:', error);
    return null;
  }
};

// Sync products
export const syncProducts = async () => {
  try {
    const online = await isOnline();
    if (!online) return;

    // Fetch latest products from server
    const response = await productsAPI.getProducts({ limit: 1000 });
    const products = response.products || [];

    // Cache products locally
    await cacheData(STORAGE_KEYS.PRODUCTS, products);

    return products;
  } catch (error) {
    console.error('Error syncing products:', error);
    // Return cached data if sync fails
    return await getCachedData(STORAGE_KEYS.PRODUCTS) || [];
  }
};

// Sync customers
export const syncCustomers = async () => {
  try {
    const online = await isOnline();
    if (!online) return;

    const response = await customersAPI.getCustomers({ limit: 1000 });
    const customers = response.customers || [];

    await cacheData(STORAGE_KEYS.CUSTOMERS, customers);

    return customers;
  } catch (error) {
    console.error('Error syncing customers:', error);
    return await getCachedData(STORAGE_KEYS.CUSTOMERS) || [];
  }
};

// Sync inventory
export const syncInventory = async () => {
  try {
    const online = await isOnline();
    if (!online) return;

    const response = await inventoryAPI.getInventory({ limit: 1000 });
    const inventory = response.inventory || [];

    await cacheData(STORAGE_KEYS.INVENTORY, inventory);

    return inventory;
  } catch (error) {
    console.error('Error syncing inventory:', error);
    return await getCachedData(STORAGE_KEYS.INVENTORY) || [];
  }
};

// Store pending transaction for offline processing
export const storePendingTransaction = async (transactionData) => {
  try {
    const pending = await getCachedData(STORAGE_KEYS.PENDING_TRANSACTIONS) || [];
    const pendingTransaction = {
      id: Date.now().toString(),
      data: transactionData,
      timestamp: new Date().toISOString(),
      synced: false,
    };

    pending.push(pendingTransaction);
    await cacheData(STORAGE_KEYS.PENDING_TRANSACTIONS, pending);

    return pendingTransaction.id;
  } catch (error) {
    console.error('Error storing pending transaction:', error);
    throw error;
  }
};

// Sync pending transactions
export const syncPendingTransactions = async () => {
  try {
    const online = await isOnline();
    if (!online) return;

    const pending = await getCachedData(STORAGE_KEYS.PENDING_TRANSACTIONS) || [];
    const syncedTransactions = [];

    for (const transaction of pending) {
      if (!transaction.synced) {
        try {
          await transactionsAPI.createTransaction(transaction.data);
          transaction.synced = true;
          syncedTransactions.push(transaction);
        } catch (error) {
          console.error('Error syncing transaction:', transaction.id, error);
        }
      }
    }

    // Update pending transactions
    const remainingPending = pending.filter(t => !t.synced);
    await cacheData(STORAGE_KEYS.PENDING_TRANSACTIONS, remainingPending);

    // Update last sync timestamp
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

    return syncedTransactions.length;
  } catch (error) {
    console.error('Error syncing pending transactions:', error);
    return 0;
  }
};

// Get cached products (for offline use)
export const getCachedProducts = async () => {
  return await getCachedData(STORAGE_KEYS.PRODUCTS) || [];
};

// Get cached customers (for offline use)
export const getCachedCustomers = async () => {
  return await getCachedData(STORAGE_KEYS.CUSTOMERS) || [];
};

// Get cached inventory (for offline use)
export const getCachedInventory = async () => {
  return await getCachedData(STORAGE_KEYS.INVENTORY) || [];
};

// Get pending transactions count
export const getPendingTransactionsCount = async () => {
  const pending = await getCachedData(STORAGE_KEYS.PENDING_TRANSACTIONS) || [];
  return pending.filter(t => !t.synced).length;
};

// Full sync operation
export const performFullSync = async () => {
  try {
    const online = await isOnline();
    if (!online) {
      throw new Error('No internet connection');
    }

    console.log('Starting full sync...');

    // Sync all data
    await Promise.all([
      syncProducts(),
      syncCustomers(),
      syncInventory(),
    ]);

    // Sync pending transactions
    const syncedCount = await syncPendingTransactions();

    console.log('Full sync completed');
    return { success: true, syncedTransactions: syncedCount };
  } catch (error) {
    console.error('Full sync failed:', error);
    return { success: false, error: error.message };
  }
};

// Clear all cached data
export const clearCache = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.PRODUCTS,
      STORAGE_KEYS.CUSTOMERS,
      STORAGE_KEYS.INVENTORY,
      STORAGE_KEYS.PENDING_TRANSACTIONS,
      STORAGE_KEYS.LAST_SYNC,
    ]);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};