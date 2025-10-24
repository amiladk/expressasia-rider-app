/**
 * GPS Tracking App Configuration
 * Configuration constants for the Express Rider GPS tracking application
 */

// API Configuration
// export const API_BASE_URL = 'https://express-rider.expressasia.lk/api/v1';
export const API_BASE_URL = 'https://express-rider.expressasia.lk/api/v1';

// GPS Tracking Configuration
export const GPS_TRACKING_INTERVAL = 60000; // 1 minute in milliseconds

// Distance Thresholds
export const DISTANCE_ACCURACY_THRESHOLD = 50; // meters
export const MINIMUM_DISTANCE_BETWEEN_POINTS = 10; // meters

// Batch Processing
export const COORDINATE_BATCH_SIZE = 100; // number of coordinate points

/**
 * Configuration object for easy import
 * Usage: import { CONFIG } from './constants/config';
 */
export const CONFIG = {
  api: {
    baseUrl: API_BASE_URL,
  },
  tracking: {
    interval: GPS_TRACKING_INTERVAL,
    accuracyThreshold: DISTANCE_ACCURACY_THRESHOLD,
    minDistance: MINIMUM_DISTANCE_BETWEEN_POINTS,
    batchSize: COORDINATE_BATCH_SIZE,
  },
};

// Default export for convenience
export default CONFIG;