import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL for the API
const BASE_URL = 'http://localhost:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and tenant ID
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const tenantId = await AsyncStorage.getItem('tenantId');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (tenantId) {
        config.headers['x-tenant-id'] = tenantId;
      }
    } catch (error) {
      console.error('Error setting request headers:', error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      // You might want to navigate to login screen here
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (username, password, tenantId) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  verifyMFA: async (tempToken, token) => {
    const response = await api.post('/auth/mfa/verify-login', { tempToken, token });
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
};

// Products API
export const productsAPI = {
  getProducts: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  getProduct: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  createProduct: async (productData) => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  updateProduct: async (id, productData) => {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },
};

// Transactions API
export const transactionsAPI = {
  createTransaction: async (transactionData) => {
    const response = await api.post('/transactions', transactionData);
    return response.data;
  },

  getTransactions: async (params = {}) => {
    const response = await api.get('/transactions', { params });
    return response.data;
  },

  getTransaction: async (id) => {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
  },
};

// Payments API
export const paymentsAPI = {
  createPaymentIntent: async (paymentData) => {
    const response = await api.post('/payments/create-payment-intent', paymentData);
    return response.data;
  },

  confirmPayment: async (confirmationData) => {
    const response = await api.post('/payments/confirm-payment', confirmationData);
    return response.data;
  },

  refund: async (transactionId, refundData) => {
    const response = await api.post(`/payments/refund/${transactionId}`, refundData);
    return response.data;
  },
};

// Inventory API
export const inventoryAPI = {
  getInventory: async (params = {}) => {
    const response = await api.get('/inventory', { params });
    return response.data;
  },

  updateInventory: async (productId, locationId, inventoryData) => {
    const response = await api.put(`/inventory/${productId}/${locationId}`, inventoryData);
    return response.data;
  },
};

// Customers API
export const customersAPI = {
  getCustomers: async (params = {}) => {
    const response = await api.get('/customers', { params });
    return response.data;
  },

  getCustomer: async (id) => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  createCustomer: async (customerData) => {
    const response = await api.post('/customers', customerData);
    return response.data;
  },

  updateCustomer: async (id, customerData) => {
    const response = await api.put(`/customers/${id}`, customerData);
    return response.data;
  },
};

// Locations API
export const locationsAPI = {
  getLocations: async () => {
    const response = await api.get('/locations');
    return response.data;
  },

  getUserLocations: async () => {
    const response = await api.get('/locations/user/current');
    return response.data;
  },
};

// Reports API
export const reportsAPI = {
  getReports: async (params = {}) => {
    const response = await api.get('/reports', { params });
    return response.data;
  },
};

export default api;