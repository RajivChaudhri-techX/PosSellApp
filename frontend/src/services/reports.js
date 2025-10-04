import api from './api';

export const reportsAPI = {
  // Sales report
  getSalesReport: (params = {}) => api.get('/reports/sales', { params }),

  // Inventory report
  getInventoryReport: (params = {}) => api.get('/reports/inventory', { params }),

  // Product performance report
  getProductReport: (params = {}) => api.get('/reports/products', { params }),

  // Customer report
  getCustomerReport: (params = {}) => api.get('/reports/customers', { params }),

  // Dashboard data
  getDashboard: (params = {}) => api.get('/reports/dashboard', { params }),

  // Enterprise dashboard
  getEnterpriseDashboard: (params = {}) => api.get('/reports/enterprise-dashboard', { params }),

  // Charts
  getSalesTrends: (params = {}) => api.get('/reports/charts/sales-trends', { params }),
  getProductPerformanceChart: (params = {}) => api.get('/reports/charts/product-performance', { params }),
  getCustomerAnalyticsChart: (params = {}) => api.get('/reports/charts/customer-analytics', { params })
};

export default reportsAPI;