/**
 * API Service
 * Axios-based API service for Express Rider GPS tracking app
 */

import axios from 'axios';
import { API_BASE_URL } from '../constants/config';
import { getAuthToken, saveAuthToken } from './storage';

/**
 * Create axios instance with base configuration
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

/**
 * Request Interceptor
 * Automatically adds auth token to all requests
 */
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Get auth token from storage
      const token = await getAuthToken();
      
      // Add token to headers if available
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      return config;
    } catch (error) {
      console.error('Error in request interceptor:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handle common response scenarios and errors
 */
apiClient.interceptors.response.use(
  (response) => {
    // Return response data directly
    return response;
  },
  async (error) => {
    // Handle network errors
    if (!error.response) {
      return Promise.reject({
        message: 'Network error. Please check your internet connection.',
        error: error.message,
      });
    }

    // Handle specific HTTP status codes
    const { status, data } = error.response;

    switch (status) {
      case 401:
        // Unauthorized - clear token
        console.warn('Unauthorized request - clearing auth token');
        return Promise.reject({
          message: 'Session expired. Please login again.',
          status: 401,
          data,
        });

      case 403:
        return Promise.reject({
          message: 'Access forbidden.',
          status: 403,
          data,
        });

      case 404:
        return Promise.reject({
          message: 'Resource not found.',
          status: 404,
          data,
        });

      case 500:
        return Promise.reject({
          message: 'Server error. Please try again later.',
          status: 500,
          data,
        });

      default:
        return Promise.reject({
          message: data?.message || 'An error occurred. Please try again.',
          status,
          data,
        });
    }
  }
);

/**
 * Authentication API
 */

/**
 * Login user
 * @param {string} username - User's username
 * @param {string} password - User's password
 * @returns {Promise<Object>} Login response with token and user data
 */
export const login = async (username, password) => {
  try {
    const response = await apiClient.post('/auth/login', {
      username,
      password,
    });

    // Save auth token if provided in response
    if (response.data?.token) {
      await saveAuthToken(response.data.token);
    }

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: error.message || 'Login failed. Please try again.',
      error,
    };
  }
};

/**
 * Trip Management API
 */

/**
 * Start a new trip
 * @param {string|number} riderId - Rider's ID
 * @returns {Promise<Object>} Trip start response with trip ID
 */
export const startTrip = async (riderId) => {
  try {
    const response = await apiClient.post('/trips/start', {
      rider_id: riderId,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Start trip error:', error);
    return {
      success: false,
      message: error.message || 'Failed to start trip. Please try again.',
      error,
    };
  }
};

/**
 * End current trip
 * @param {Object} tripData - Trip data object
 * @param {string|number} tripData.trip_id - Trip ID
 * @param {string|number} tripData.rider_id - Rider ID
 * @param {string} tripData.start_time - Trip start time (ISO format)
 * @param {string} tripData.end_time - Trip end time (ISO format)
 * @param {number} tripData.total_distance - Total distance in kilometers
 * @param {Array} tripData.coordinates - Array of GPS coordinates
 * @returns {Promise<Object>} Trip end response
 */
export const endTrip = async (tripData) => {
  try {
    const response = await apiClient.post('/trips/end', {
      trip_id: tripData.trip_id,
      rider_id: tripData.rider_id,
      start_time: tripData.start_time,
      end_time: tripData.end_time,
      total_distance: tripData.total_distance,
      coordinates: tripData.coordinates,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('End trip error:', error);
    return {
      success: false,
      message: error.message || 'Failed to end trip. Please try again.',
      error,
    };
  }
};

/**
 * Get trip history for a rider
 * @param {string|number} riderId - Rider's ID
 * @returns {Promise<Object>} Trip history response
 */
export const getTripHistory = async (riderId) => {
  try {
    const response = await apiClient.get(`/trips/history/${riderId}`);

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Get trip history error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch trip history.',
      error,
    };
  }
};

/**
 * Sync coordinates during active trip
 * @param {string|number} tripId - Trip ID
 * @param {Array} coordinates - Array of GPS coordinates to sync
 * @returns {Promise<Object>} Sync response
 */
export const syncCoordinates = async (tripId, coordinates) => {
  try {
    const response = await apiClient.post('/trips/sync-coordinates', {
      trip_id: tripId,
      coordinates,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Sync coordinates error:', error);
    return {
      success: false,
      message: error.message || 'Failed to sync coordinates.',
      error,
    };
  }
};

/**
 * Additional Utility Functions
 */

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} Authentication status
 */
export const isAuthenticated = async () => {
  try {
    const token = await getAuthToken();
    return !!token;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

/**
 * Logout user (clear token)
 * @returns {Promise<boolean>} Success status
 */
export const logout = async () => {
  try {
    const { removeAuthToken } = require('./storage');
    await removeAuthToken();
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
};

/**
 * Test API connection
 * @returns {Promise<Object>} Connection test result
 */
export const testConnection = async () => {
  try {
    const response = await apiClient.get('/health');
    return {
      success: true,
      message: 'API connection successful',
      data: response.data,
    };
  } catch (error) {
    console.error('Connection test error:', error);
    return {
      success: false,
      message: 'API connection failed',
      error,
    };
  }
};

export default {
  // Authentication
  login,
  logout,
  isAuthenticated,
  
  // Trip Management
  startTrip,
  endTrip,
  getTripHistory,
  syncCoordinates,
  
  // Utility
  testConnection,
  
  // Axios instance for custom requests
  apiClient,
};