/**
 * GPS Service
 * Background GPS tracking service using @mauron85/react-native-background-geolocation
 */

import BackgroundGeolocation from '@mauron85/react-native-background-geolocation';
import { CONFIG } from '../constants/config';
import { calculateTotalDistance } from './haversine';

/**
 * GPSService Class
 * Manages GPS tracking for delivery trips
 */
class GPSService {
  constructor() {
    this.isInitialized = false;
    this.isTracking = false;
    this.locationCallback = null;
  }

  /**
   * Initialize GPS service with configuration
   * @returns {Promise<boolean>} Initialization success status
   */
  initialize = async () => {
    if (this.isInitialized) {
      console.log('GPS Service already initialized');
      return true;
    }

    try {
      console.log('Initializing GPS Service...');
      
      // Configure BackgroundGeolocation
      BackgroundGeolocation.configure({
        // Accuracy settings
        desiredAccuracy: BackgroundGeolocation.HIGH_ACCURACY,
        stationaryRadius: CONFIG.tracking.minDistance, // 10 meters
        distanceFilter: CONFIG.tracking.minDistance, // 10 meters
        
        // Location provider (best for Android battery optimization)
        locationProvider: BackgroundGeolocation.ACTIVITY_PROVIDER,
        
        // Update intervals
        interval: CONFIG.tracking.interval, // 60000ms = 1 minute
        fastestInterval: 30000, // 30 seconds
        activitiesInterval: 60000, // 1 minute
        
        // Background behavior
        stopOnTerminate: false, // Continue after app termination
        startOnBoot: false, // Don't auto-start on boot
        
        // Foreground service (Android)
        startForeground: true,
        notificationTitle: 'Delivery Trip Active',
        notificationText: 'Tracking your delivery route',
        notificationIconColor: '#2563eb',
        
        // Debug settings
        debug: false, // Set to true for development
        
        // Other settings
        pauseLocationUpdates: false,
      });

      this.isInitialized = true;
      console.log('GPS Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing GPS Service:', error);
      return false;
    }
  };

  /**
   * Start GPS tracking
   * @param {Function} onLocationUpdate - Callback function for location updates
   * @returns {Promise<boolean>} Success status
   */
  startTracking = async (onLocationUpdate) => {
    try {
      // Initialize if not already done
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check if already tracking
      if (this.isTracking) {
        console.warn('GPS tracking is already active');
        return true;
      }

      // Store callback
      this.locationCallback = onLocationUpdate;

      // Set up location listener
      BackgroundGeolocation.on('location', (location) => {
        console.log('Location received:', location);
        
        // Format location data
        const formattedLocation = {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          altitude: location.altitude,
          speed: location.speed,
          timestamp: location.time,
        };

        // Call callback with location
        if (this.locationCallback) {
          this.locationCallback(formattedLocation);
        }
      });

      // Set up error listener
      BackgroundGeolocation.on('error', (error) => {
        console.error('GPS tracking error:', error);
      });

      // Set up stationary listener
      BackgroundGeolocation.on('stationary', (stationaryLocation) => {
        console.log('Device is stationary:', stationaryLocation);
      });

      // Set up activity listener
      BackgroundGeolocation.on('activity', (activity) => {
        console.log('Activity detected:', activity);
      });

      // Start tracking
      BackgroundGeolocation.start();
      
      this.isTracking = true;
      console.log('GPS tracking started successfully');
      return true;
    } catch (error) {
      console.error('Error starting GPS tracking:', error);
      return false;
    }
  };

  /**
   * Stop GPS tracking
   * @returns {Promise<boolean>} Success status
   */
  stopTracking = async () => {
    try {
      if (!this.isTracking) {
        console.warn('GPS tracking is not active');
        return true;
      }

      // Stop tracking
      BackgroundGeolocation.stop();

      // Remove all listeners
      BackgroundGeolocation.removeAllListeners();

      // Clear callback
      this.locationCallback = null;
      this.isTracking = false;

      console.log('GPS tracking stopped successfully');
      return true;
    } catch (error) {
      console.error('Error stopping GPS tracking:', error);
      return false;
    }
  };

  /**
   * Get current location (single point)
   * @returns {Promise<Object>} Current location data
   */
  getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      BackgroundGeolocation.getCurrentLocation(
        (location) => {
          // Success callback
          const formattedLocation = {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            altitude: location.altitude,
            speed: location.speed,
            timestamp: location.time,
          };
          resolve(formattedLocation);
        },
        (error) => {
          // Error callback
          console.error('Error getting current location:', error);
          reject(error);
        },
        {
          timeout: 30000, // 30 seconds
          maximumAge: 10000, // 10 seconds
          enableHighAccuracy: true,
        }
      );
    });
  };

  /**
   * Calculate total trip distance from coordinates array
   * @param {Array} coordinates - Array of coordinate objects
   * @returns {number} Total distance in kilometers
   */
  calculateTripDistance = (coordinates) => {
    try {
      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        return 0;
      }

      return calculateTotalDistance(coordinates);
    } catch (error) {
      console.error('Error calculating trip distance:', error);
      return 0;
    }
  };

  /**
   * Check location services status
   * @returns {Promise<Object>} Location services status
   */
  checkLocationServices = () => {
    return new Promise((resolve, reject) => {
      BackgroundGeolocation.checkStatus(
        (status) => {
          resolve({
            isRunning: status.isRunning,
            hasPermissions: status.authorization === BackgroundGeolocation.AUTHORIZED,
            locationServicesEnabled: status.locationServicesEnabled,
            authorization: status.authorization,
          });
        },
        (error) => {
          console.error('Error checking location services:', error);
          reject(error);
        }
      );
    });
  };

  /**
   * Get tracking status
   * @returns {boolean} Whether tracking is active
   */
  getTrackingStatus = () => {
    return this.isTracking;
  };

  /**
   * Request location permissions (helper method)
   * Note: Actual permission handling should be done in the component
   * This is just a utility to check authorization
   */
  checkAuthorization = () => {
    return new Promise((resolve, reject) => {
      BackgroundGeolocation.checkStatus(
        (status) => {
          const authorized = 
            status.authorization === BackgroundGeolocation.AUTHORIZED ||
            status.authorization === BackgroundGeolocation.AUTHORIZED_FOREGROUND;
          
          resolve({
            authorized,
            authorizationStatus: status.authorization,
          });
        },
        (error) => {
          reject(error);
        }
      );
    });
  };
}

// Export singleton instance
const gpsService = new GPSService();
export default gpsService;