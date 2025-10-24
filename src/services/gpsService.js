/**
 * GPS Service
 * Background GPS tracking using react-native-geolocation-service + react-native-background-actions
 */

import Geolocation from 'react-native-geolocation-service';
import BackgroundService from 'react-native-background-actions';
import { Platform, PermissionsAndroid } from 'react-native';
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
    this.watchId = null;
    this.backgroundTaskRunning = false;
  }

  /**
   * Initialize GPS service
   * @returns {Promise<boolean>} Initialization success status
   */
  initialize = async () => {
    if (this.isInitialized) {
      console.log('GPS Service already initialized');
      return true;
    }

    try {
      console.log('Initializing GPS Service...');
      
      // Request permissions
      const hasPermission = await this.requestPermissions();
      
      if (!hasPermission) {
        console.error('Location permissions not granted');
        return false;
      }

      this.isInitialized = true;
      console.log('GPS Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing GPS Service:', error);
      return false;
    }
  };

  /**
   * Request location permissions
   * @returns {Promise<boolean>} Permission granted status
   */
  requestPermissions = async () => {
    try {
      if (Platform.OS === 'ios') {
        // Request iOS permissions
        const auth = await Geolocation.requestAuthorization('always');
        return auth === 'granted' || auth === 'whenInUse';
      }

      if (Platform.OS === 'android') {
        // Request Android permissions
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);

        const fineLocation =
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED;

        const coarseLocation =
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED;

        // Request background location for Android 10+
        if (Platform.Version >= 29) {
          const bgGranted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
          );
          
          if (bgGranted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('Background location permission not granted');
          }
        }

        return fineLocation || coarseLocation;
      }

      return false;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  /**
   * Background task function
   * Runs continuously in the background
   */
  backgroundTask = async (taskDataArguments) => {
    const { delay } = taskDataArguments;

    await new Promise(async (resolve) => {
      // Keep the task running
      while (BackgroundService.isRunning()) {
        // Get current location
        this.getCurrentLocationInBackground();
        
        // Wait for the configured interval
        await this.sleep(delay);
      }
    });
  };

  /**
   * Get current location in background
   */
  getCurrentLocationInBackground = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        };

        console.log('Background location update:', location);

        // Call callback if set
        if (this.locationCallback) {
          this.locationCallback(location);
        }
      },
      (error) => {
        console.error('Background location error:', error);
      },
      {
        accuracy: {
          android: 'high',
          ios: 'bestForNavigation',
        },
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 10000,
        distanceFilter: CONFIG.tracking.minDistance,
        forceRequestLocation: true,
        forceLocationManager: Platform.OS === 'android',
        showLocationDialog: true,
      }
    );
  };

  /**
   * Sleep helper function
   */
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

      // Start foreground location watching
      this.watchId = Geolocation.watchPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          };

          console.log('Foreground location update:', location);

          // Call callback
          if (this.locationCallback) {
            this.locationCallback(location);
          }
        },
        (error) => {
          console.error('Foreground location error:', error);
        },
        {
          accuracy: {
            android: 'high',
            ios: 'bestForNavigation',
          },
          enableHighAccuracy: true,
          distanceFilter: CONFIG.tracking.minDistance,
          interval: CONFIG.tracking.interval,
          fastestInterval: 30000,
          forceRequestLocation: true,
          forceLocationManager: Platform.OS === 'android',
          showLocationDialog: true,
          useSignificantChanges: false,
        }
      );

      // Start background service
      const options = {
        taskName: 'Express Rider GPS Tracking',
        taskTitle: 'Delivery Trip Active',
        taskDesc: 'Tracking your delivery route',
        taskIcon: {
          name: 'ic_launcher',
          type: 'mipmap',
        },
        color: '#2563eb',
        linkingURI: 'expressrider://trip',
        parameters: {
          delay: CONFIG.tracking.interval,
        },
      };

      await BackgroundService.start(this.backgroundTask, options);
      this.backgroundTaskRunning = true;

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

      // Stop foreground location watching
      if (this.watchId !== null) {
        Geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }

      // Stop background service
      if (this.backgroundTaskRunning) {
        await BackgroundService.stop();
        this.backgroundTaskRunning = false;
      }

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
      Geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          };
          resolve(location);
        },
        (error) => {
          console.error('Error getting current location:', error);
          reject(error);
        },
        {
          accuracy: {
            android: 'high',
            ios: 'bestForNavigation',
          },
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 10000,
          forceRequestLocation: true,
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
  checkLocationServices = async () => {
    try {
      // This is a simplified check
      // react-native-geolocation-service doesn't have a built-in status check
      return {
        isRunning: this.isTracking,
        hasPermissions: this.isInitialized,
        locationServicesEnabled: true, // Assume enabled
      };
    } catch (error) {
      console.error('Error checking location services:', error);
      throw error;
    }
  };

  /**
   * Get tracking status
   * @returns {boolean} Whether tracking is active
   */
  getTrackingStatus = () => {
    return this.isTracking;
  };

  /**
   * Check if background service is running
   * @returns {boolean} Background service status
   */
  isBackgroundServiceRunning = () => {
    return BackgroundService.isRunning();
  };
}

// Export singleton instance
const gpsService = new GPSService();
export default gpsService;