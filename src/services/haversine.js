/**
 * Haversine Formula Implementation
 * Service for calculating distances between GPS coordinates
 */

// Earth's radius in kilometers
const EARTH_RADIUS_KM = 6371;

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} coord1 - First coordinate {latitude, longitude}
 * @param {Object} coord2 - Second coordinate {latitude, longitude}
 * @returns {number|null} Distance in kilometers rounded to 2 decimal places, or null if invalid input
 */
export const calculateDistance = (coord1, coord2) => {
  // Handle null or undefined values
  if (!coord1 || !coord2) {
    return null;
  }

  // Validate coordinate properties
  if (
    typeof coord1.latitude !== 'number' ||
    typeof coord1.longitude !== 'number' ||
    typeof coord2.latitude !== 'number' ||
    typeof coord2.longitude !== 'number'
  ) {
    return null;
  }

  // Handle same coordinates
  if (
    coord1.latitude === coord2.latitude &&
    coord1.longitude === coord2.longitude
  ) {
    return 0;
  }

  // Convert coordinates to radians
  const lat1 = toRadians(coord1.latitude);
  const lat2 = toRadians(coord2.latitude);
  const deltaLat = toRadians(coord2.latitude - coord1.latitude);
  const deltaLon = toRadians(coord2.longitude - coord1.longitude);

  // Haversine formula
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Calculate distance
  const distance = EARTH_RADIUS_KM * c;

  // Return distance rounded to 2 decimal places
  return Math.round(distance * 100) / 100;
};

/**
 * Calculate total distance from an array of coordinates
 * @param {Array} coordinates - Array of coordinate objects [{latitude, longitude}, ...]
 * @returns {number} Total distance in kilometers rounded to 2 decimal places
 */
export const calculateTotalDistance = (coordinates) => {
  // Handle invalid input
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return 0;
  }

  let totalDistance = 0;

  // Calculate distance between consecutive points
  for (let i = 0; i < coordinates.length - 1; i++) {
    const distance = calculateDistance(coordinates[i], coordinates[i + 1]);
    
    // Only add valid distances
    if (distance !== null) {
      totalDistance += distance;
    }
  }

  // Return total distance rounded to 2 decimal places
  return Math.round(totalDistance * 100) / 100;
};

/**
 * Convert kilometers to meters
 * @param {number} kilometers - Distance in kilometers
 * @returns {number} Distance in meters
 */
export const kilometersToMeters = (kilometers) => {
  return kilometers * 1000;
};

/**
 * Convert meters to kilometers
 * @param {number} meters - Distance in meters
 * @returns {number} Distance in kilometers rounded to 2 decimal places
 */
export const metersToKilometers = (meters) => {
  const kilometers = meters / 1000;
  return Math.round(kilometers * 100) / 100;
};

export default {
  calculateDistance,
  calculateTotalDistance,
  kilometersToMeters,
  metersToKilometers,
};