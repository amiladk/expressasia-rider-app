/**
 * AsyncStorage Wrapper Service
 * Service for managing local storage in the Express Rider GPS tracking app
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage Keys
const STORAGE_KEYS = {
  AUTH_TOKEN: '@express_rider:auth_token',
  RIDER_ID: '@express_rider:rider_id',
  RIDER_NAME: '@express_rider:rider_name',
  TRIP_DATA: '@express_rider:trip_data',
  COORDINATES: '@express_rider:coordinates',
};

/**
 * Authentication Token Management
 */

/**
 * Save authentication token
 * @param {string} token - JWT or authentication token
 * @returns {Promise<boolean>} Success status
 */
export const saveAuthToken = async (token) => {
  try {
    if (!token) {
      console.warn('No token provided to saveAuthToken');
      return false;
    }
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    return true;
  } catch (error) {
    console.error('Error saving auth token:', error);
    return false;
  }
};

/**
 * Retrieve authentication token
 * @returns {Promise<string|null>} Auth token or null
 */
export const getAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    return token;
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
};

/**
 * Remove authentication token
 * @returns {Promise<boolean>} Success status
 */
export const removeAuthToken = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    return true;
  } catch (error) {
    console.error('Error removing auth token:', error);
    return false;
  }
};

/**
 * Rider ID Management
 */

/**
 * Save rider ID
 * @param {string|number} id - Rider ID
 * @returns {Promise<boolean>} Success status
 */
export const saveRiderId = async (id) => {
  try {
    if (!id && id !== 0) {
      console.warn('No rider ID provided to saveRiderId');
      return false;
    }
    await AsyncStorage.setItem(STORAGE_KEYS.RIDER_ID, String(id));
    return true;
  } catch (error) {
    console.error('Error saving rider ID:', error);
    return false;
  }
};

/**
 * Retrieve rider ID
 * @returns {Promise<string|null>} Rider ID or null
 */
export const getRiderId = async () => {
  try {
    const riderId = await AsyncStorage.getItem(STORAGE_KEYS.RIDER_ID);
    return riderId;
  } catch (error) {
    console.error('Error retrieving rider ID:', error);
    return null;
  }
};

/**
 * Save rider Name
 * @param {string} name - Rider Name
 * @returns {Promise<boolean>} Success status
 */
export const saveRiderName = async (name) => {
  try {
    if (!name && name !== 0) {
      console.warn('No rider Name provided to saveRiderName');
      return false;
    }
    await AsyncStorage.setItem(STORAGE_KEYS.RIDER_NAME, String(name));
    return true;
  } catch (error) {
    console.error('Error saving rider Name:', error);
    return false;
  }
};

/**
 * Retrieve rider ID
 * @returns {Promise<string|null>} Rider ID or null
 */
export const getRiderName = async () => {
  try {
    const riderName = await AsyncStorage.getItem(STORAGE_KEYS.RIDER_NAME);
    return riderName;
  } catch (error) {
    console.error('Error retrieving rider Name:', error);
    return null;
  }
};

/**
 * Trip Data Management
 */

/**
 * Save current trip data
 * @param {Object} tripData - Trip data object
 * @returns {Promise<boolean>} Success status
 */
export const saveTripData = async (tripData) => {
  try {
    if (!tripData) {
      console.warn('No trip data provided to saveTripData');
      return false;
    }
    const jsonValue = JSON.stringify(tripData);
    await AsyncStorage.setItem(STORAGE_KEYS.TRIP_DATA, jsonValue);
    return true;
  } catch (error) {
    console.error('Error saving trip data:', error);
    return false;
  }
};

/**
 * Retrieve trip data
 * @returns {Promise<Object|null>} Trip data object or null
 */
export const getTripData = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.TRIP_DATA);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error retrieving trip data:', error);
    return null;
  }
};

/**
 * Clear trip data
 * @returns {Promise<boolean>} Success status
 */
export const clearTripData = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.TRIP_DATA);
    return true;
  } catch (error) {
    console.error('Error clearing trip data:', error);
    return false;
  }
};

/**
 * GPS Coordinates Management
 */

/**
 * Save GPS coordinates array
 * @param {Array} coords - Array of coordinate objects
 * @returns {Promise<boolean>} Success status
 */
export const saveCoordinates = async (coords) => {
  try {
    if (!Array.isArray(coords)) {
      console.warn('Invalid coordinates array provided to saveCoordinates');
      return false;
    }
    const jsonValue = JSON.stringify(coords);
    await AsyncStorage.setItem(STORAGE_KEYS.COORDINATES, jsonValue);
    return true;
  } catch (error) {
    console.error('Error saving coordinates:', error);
    return false;
  }
};

/**
 * Retrieve saved GPS coordinates
 * @returns {Promise<Array>} Array of coordinate objects or empty array
 */
export const getCoordinates = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.COORDINATES);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Error retrieving coordinates:', error);
    return [];
  }
};

/**
 * Append single coordinate to existing coordinates array
 * @param {Object} coord - Coordinate object {latitude, longitude, timestamp, etc.}
 * @returns {Promise<boolean>} Success status
 */
export const appendCoordinate = async (coord) => {
  try {
    if (!coord) {
      console.warn('No coordinate provided to appendCoordinate');
      return false;
    }

    // Get existing coordinates
    const existingCoords = await getCoordinates();

    // Append new coordinate
    const updatedCoords = [...existingCoords, coord];

    // Save updated array
    const jsonValue = JSON.stringify(updatedCoords);
    await AsyncStorage.setItem(STORAGE_KEYS.COORDINATES, jsonValue);
    
    return true;
  } catch (error) {
    console.error('Error appending coordinate:', error);
    return false;
  }
};

/**
 * Clear all coordinates
 * @returns {Promise<boolean>} Success status
 */
export const clearCoordinates = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.COORDINATES);
    return true;
  } catch (error) {
    console.error('Error clearing coordinates:', error);
    return false;
  }
};

/**
 * Clear all app data
 * @returns {Promise<boolean>} Success status
 */
export const clearAllData = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.RIDER_ID,
      STORAGE_KEYS.TRIP_DATA,
      STORAGE_KEYS.COORDINATES,
    ]);
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
};

/**
 * Get all storage keys (for debugging)
 * @returns {Promise<Array>} Array of storage keys
 */
export const getAllKeys = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys;
  } catch (error) {
    console.error('Error getting all keys:', error);
    return [];
  }
};

export default {
  // Auth
  saveAuthToken,
  getAuthToken,
  removeAuthToken,
  
  // Rider
  saveRiderId,
  getRiderId,
  saveRiderName,
  getRiderName,
  
  // Trip
  saveTripData,
  getTripData,
  clearTripData,
  
  // Coordinates
  saveCoordinates,
  getCoordinates,
  appendCoordinate,
  clearCoordinates,
  
  // Utility
  clearAllData,
  getAllKeys,
};