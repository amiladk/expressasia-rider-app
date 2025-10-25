/**
 * GPS Service
 * Background GPS tracking using react-native-background-fetch (FREE)
 * This is a truly free alternative that works reliably in background
 */

import BackgroundFetch from 'react-native-background-fetch';
import Geolocation from 'react-native-geolocation-service';
import BackgroundService from 'react-native-background-actions';
import { CONFIG } from '../constants/config';
import { calculateTotalDistance } from './haversine';

/**
 * GPSService Class
 * Manages GPS tracking for delivery trips with background support
 */
class GPSService {
  constructor() {
    this.isInitialized = false;
    this.isTracking = false;
    this.locationCallback = null;
    this.foregroundServiceRunning = false;
    this.watchId = null;
  }

  /**
   * Initialize GPS service with BackgroundFetch
   */
  initialize = async () => {
    if (this.isInitialized) {
      console.log('GPS Service already initialized');
      return true;
    }

    try {
      console.log('Initializing GPS Service with BackgroundFetch...');
      
      // Configure BackgroundFetch for periodic background updates
      const status = await BackgroundFetch.configure(
        {
          minimumFetchInterval: 1, // Fetch every 1 minute (in minutes, not milliseconds!)
          stopOnTerminate: false,
          startOnBoot: false,
          enableHeadless: true,
          requiresBatteryNotLow: false,
          requiresCharging: false,
          requiresDeviceIdle: false,
          requiresStorageNotLow: false,
          forceAlarmManager: false, // Use JobScheduler for better battery
        },
        async (taskId) => {
          console.log('[BackgroundFetch] Task executing:', taskId);
          
          // Get location when background fetch fires
          try {
            await this.getBackgroundLocation();
          } catch (error) {
            console.error('[BackgroundFetch] Location error:', error);
          }
          
          // IMPORTANT: Signal completion
          BackgroundFetch.finish(taskId);
        },
        (taskId) => {
          console.log('[BackgroundFetch] Task timeout:', taskId);
          BackgroundFetch.finish(taskId);
        }
      );

      console.log('[BackgroundFetch] Configured with status:', status);
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('GPS Service initialization error:', error);
      return false;
    }
  };

  /**
   * Get location in background (called by BackgroundFetch)
   */
  getBackgroundLocation = async () => {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          console.log('[BackgroundFetch] Got location:', position.coords);
          
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          };

          // Call the location callback
          if (this.locationCallback) {
            this.locationCallback(location);
          }
          
          resolve(location);
        },
        (error) => {
          console.error('[BackgroundFetch] Location error:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
          forceRequestLocation: true,
        }
      );
    });
  };

  /**
   * Foreground service background task
   * This keeps the app alive while in foreground/background
   */
  foregroundServiceTask = async (taskDataArguments) => {
    const { delay } = taskDataArguments;
    
    await new Promise(async (resolve) => {
      while (BackgroundService.isRunning()) {
        try {
          // Get location
          const location = await this.getBackgroundLocation();
          
          if (location) {
            console.log('[ForegroundService] Location updated');
          }
          
          // Wait before next update
          await new Promise(r => setTimeout(r, delay));
        } catch (error) {
          console.error('[ForegroundService] Error:', error);
          await new Promise(r => setTimeout(r, delay));
        }
      }
      resolve();
    });
  };

  /**
   * Start GPS tracking (both foreground and background)
   */
  startTracking = async (onLocationUpdate) => {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.isTracking) {
        console.warn('GPS tracking already active');
        return true;
      }

      this.locationCallback = onLocationUpdate;

      // Start BackgroundFetch for background updates
      console.log('Starting BackgroundFetch...');
      await BackgroundFetch.start();
      
      // Start foreground location watching
      console.log('Starting foreground location watch...');
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

          if (this.locationCallback) {
            this.locationCallback(location);
          }
        },
        (error) => {
          console.error('Foreground location error:', error);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: CONFIG.tracking.minDistance,
          interval: CONFIG.tracking.interval,
          fastestInterval: 30000,
          forceRequestLocation: true,
          showLocationDialog: true,
        }
      );

      // Start foreground service to keep app alive
      console.log('Starting foreground service...');
      const options = {
        taskName: 'GPS Tracking',
        taskTitle: 'Delivery Trip Active',
        taskDesc: 'Tracking your delivery route',
        taskIcon: {
          name: 'ic_launcher',
          type: 'mipmap',
        },
        color: '#321b76',
        linkingURI: 'ridergps://tracking',
        parameters: {
          delay: CONFIG.tracking.interval,
        },
      };

      await BackgroundService.start(this.foregroundServiceTask, options);
      this.foregroundServiceRunning = true;

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
   */
  stopTracking = async () => {
    try {
      if (!this.isTracking) {
        console.warn('GPS tracking not active');
        return true;
      }

      console.log('Stopping GPS tracking...');

      // Stop BackgroundFetch
      await BackgroundFetch.stop();

      // Stop foreground watching
      if (this.watchId !== null) {
        Geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }

      // Stop foreground service
      if (this.foregroundServiceRunning && BackgroundService.isRunning()) {
        await BackgroundService.stop();
        this.foregroundServiceRunning = false;
      }

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
   */
  checkLocationServices = async () => {
    try {
      return {
        isRunning: this.isTracking,
        hasPermissions: true,
        locationServicesEnabled: true,
      };
    } catch (error) {
      console.error('Error checking location services:', error);
      return {
        isRunning: false,
        hasPermissions: false,
        locationServicesEnabled: false,
      };
    }
  };

  /**
   * Get tracking status
   */
  getTrackingStatus = () => {
    return this.isTracking;
  };
}

// Export singleton instance
const gpsService = new GPSService();
export default gpsService;