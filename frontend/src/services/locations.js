import api from './api';

export const locationsAPI = {
  // Get all locations
  getLocations: () => api.get('/locations'),

  // Get location by ID
  getLocation: (id) => api.get(`/locations/${id}`),

  // Create location
  createLocation: (locationData) => api.post('/locations', locationData),

  // Update location
  updateLocation: (id, locationData) => api.put(`/locations/${id}`, locationData),

  // Delete location
  deleteLocation: (id) => api.delete(`/locations/${id}`),

  // Get users assigned to a location
  getLocationUsers: (id) => api.get(`/locations/${id}/users`),

  // Assign user to location
  assignUserToLocation: (id, userData) => api.post(`/locations/${id}/users`, userData),

  // Remove user from location
  removeUserFromLocation: (id, userId) => api.delete(`/locations/${id}/users/${userId}`),

  // Get user's locations
  getUserLocations: () => api.get('/locations/user/current')
};

export default locationsAPI;