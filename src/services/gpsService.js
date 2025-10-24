/**
 * GPS Service - ENHANCED VERSION
 * Fixed: Location provider availability issues
 * Handles GPS disabled, checks location services, better Android compatibility
 */

import Geolocation from 'react-native-geolocation-service';
import BackgroundService from 'react-native-background-actions';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { CONFIG } from '../constants/config';
import { calculateTotalDistance } from './haversine';

/**
 * GPSService Class
 */
class GPSService {
  constructor() {
    this.isInitialized = false;
    this.isTracking = false;
    this.locationCallback = null;
    this.watchId = null;
    this.backgroundTaskRunning = false;
    this.lastLocation = null;
    this.locationRetryCount = 0;
    this.maxRetries = 3;
  }

  /**
   * Check if location services are enabled
   * @returns {Promise<boolean>}
   */
  checkLocationEnabled = async () => {
    try {
      if (Platform.OS === 'android') {
        // For Android, we need to check if location is enabled
        // This is a workaround since react-native-geolocation-service doesn't have built-in check
        
        return new Promise((resolve) => {
          // Try to get a quick position to test if GPS is enabled
          Geolocation.getCurrentPosition(
            () => {
              console.log('✓ Location services are enabled');
              resolve(true);
            },
            (error) => {
              console.log('Location services check error:', error);
              if (error.code === 2) {
                // POSITION_UNAVAILABLE - Location disabled
                resolve(false);
              } else {
                // Other errors - assume enabled but signal issues
                resolve(true);
              }
            },
            {
              enableHighAccuracy: false,
              timeout: 5000,
              maximumAge: 300000, // Accept very old cache
            }
          );
        });
      } else {
        // iOS - assume enabled if permission granted
        return true;
      }
    } catch (error) {
      console.error('Error checking location enabled:', error);
      return false;
    }
  };

  /**
   * Prompt user to enable location services
   */
  promptEnableLocation = () => {
    Alert.alert(
      'Location Services Disabled',
      'GPS tracking requires location services to be enabled. Please enable location services in your device settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'android') {
              // Open location settings on Android
              Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
            } else {
              // Open settings on iOS
              Linking.openSettings();
            }
          },
        },
      ]
    );
  };

  /**
   * Initialize GPS service
   */
  initialize = async () => {
    if (this.isInitialized) {
      console.log('GPS Service already initialized');
      return true;
    }

    try {
      console.log('Initializing GPS Service...');
      
      // Step 1: Request permissions
      const hasPermission = await this.requestPermissions();
      
      if (!hasPermission) {
        console.error('Location permissions not granted');
        Alert.alert(
          'Permission Required',
          'Location permission is required for trip tracking. Please grant location permission in settings.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
        return false;
      }

      // Step 2: Check if location services are enabled
      const locationEnabled = await this.checkLocationEnabled();
      
      if (!locationEnabled) {
        console.error('Location services are disabled');
        this.promptEnableLocation();
        return false;
      }

      this.isInitialized = true;
      console.log('✓ GPS Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing GPS Service:', error);
      return false;
    }
  };

  /**
   * Request location permissions
   */
  requestPermissions = async () => {
    try {
      if (Platform.OS === 'ios') {
        const auth = await Geolocation.requestAuthorization('always');
        return auth === 'granted' || auth === 'whenInUse';
      }

      if (Platform.OS === 'android') {
        console.log('Requesting Android location permissions...');
        
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);

        console.log('Permission results:', granted);

        const fineLocation =
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED;

        const coarseLocation =
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED;

        console.log('Fine location:', fineLocation, 'Coarse location:', coarseLocation);

        if (!fineLocation && !coarseLocation) {
          return false;
        }

        // Request background location for Android 10+ (Q and above)
        if (Platform.Version >= 29) {
          console.log('Requesting background location permission (Android 10+)...');
          
          try {
            const bgGranted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
              {
                title: 'Background Location Permission',
                message: 'Allow Express Rider to access location in the background for continuous trip tracking?',
                buttonPositive: 'Allow',
                buttonNegative: 'Deny',
              }
            );
            
            console.log('Background location permission:', bgGranted);
            
            if (bgGranted !== PermissionsAndroid.RESULTS.GRANTED) {
              Alert.alert(
                'Background Location',
                'For continuous tracking, please select "Allow all the time" in location settings.',
                [
                  {
                    text: 'Later',
                    style: 'cancel',
                  },
                  {
                    text: 'Settings',
                    onPress: () => Linking.openSettings(),
                  },
                ]
              );
            }
          } catch (err) {
            console.warn('Background location permission error:', err);
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
   * Get current location with retry and better error handling
   */
  getCurrentLocationWithRetry = async (retryCount = 0) => {
    return new Promise((resolve, reject) => {
      console.log(`\n--- Getting location (Attempt ${retryCount + 1}/${this.maxRetries + 1}) ---`);

      // Progressive timeout increase
      const timeout = retryCount === 0 ? 20000 : 30000 + (retryCount * 15000);
      const maximumAge = retryCount === 0 ? 5000 : 30000 + (retryCount * 30000);
      const enableHighAccuracy = retryCount < 2; // Only high accuracy for first 2 attempts

      console.log('Settings:', {
        timeout: timeout / 1000 + 's',
        maximumAge: maximumAge / 1000 + 's',
        highAccuracy: enableHighAccuracy,
      });

      Geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            speed: position.coords.speed,
            heading: position.coords.heading,
            timestamp: position.timestamp,
          };

          console.log('✓ Location obtained:', {
            lat: location.latitude.toFixed(6),
            lng: location.longitude.toFixed(6),
            accuracy: location.accuracy?.toFixed(1) + 'm',
            age: Math.round((Date.now() - location.timestamp) / 1000) + 's old'
          });

          this.lastLocation = location;
          this.locationRetryCount = 0;
          resolve(location);
        },
        (error) => {
          console.error(`✗ Location error (attempt ${retryCount + 1}):`, error);

          // Handle different error codes
          if (error.code === 2) {
            // POSITION_UNAVAILABLE - No location provider
            console.error('ERROR CODE 2: No location provider available');
            console.error('This means GPS is disabled or not accessible');
            
            if (retryCount === 0) {
              // On first error, prompt user to enable location
              reject({
                code: 2,
                message: 'Location services are disabled. Please enable GPS in your device settings.',
                shouldPrompt: true,
              });
            } else {
              reject(error);
            }
          } else if (error.code === 3) {
            // TIMEOUT
            console.warn('ERROR CODE 3: Location request timed out');
            
            if (retryCount < this.maxRetries) {
              console.log(`Retrying with more relaxed settings...`);
              setTimeout(() => {
                this.getCurrentLocationWithRetry(retryCount + 1)
                  .then(resolve)
                  .catch(reject);
              }, 1000);
            } else if (this.lastLocation) {
              console.log('⚠ Using last known location as fallback');
              resolve(this.lastLocation);
            } else {
              reject({
                code: 3,
                message: 'Unable to get location. Please ensure you are outdoors with clear sky view.',
              });
            }
          } else if (error.code === 1) {
            // PERMISSION_DENIED
            console.error('ERROR CODE 1: Permission denied');
            reject({
              code: 1,
              message: 'Location permission denied. Please grant location permission in settings.',
              shouldPrompt: true,
            });
          } else {
            // Unknown error
            console.error('Unknown error code:', error.code);
            
            if (retryCount < this.maxRetries) {
              setTimeout(() => {
                this.getCurrentLocationWithRetry(retryCount + 1)
                  .then(resolve)
                  .catch(reject);
              }, 2000);
            } else {
              reject(error);
            }
          }
        },
        {
          accuracy: {
            android: enableHighAccuracy ? 'high' : 'balanced',
            ios: enableHighAccuracy ? 'bestForNavigation' : 'best',
          },
          enableHighAccuracy: enableHighAccuracy,
          timeout: timeout,
          maximumAge: maximumAge,
          distanceFilter: 0,
          forceRequestLocation: true,
          forceLocationManager: Platform.OS === 'android',
          showLocationDialog: true,
          useSignificantChanges: false,
        }
      );
    });
  };

  /**
   * Background task function
   */
  backgroundTask = async (taskDataArguments) => {
    const { delay } = taskDataArguments;

    await new Promise(async (resolve) => {
      while (BackgroundService.isRunning()) {
        try {
          console.log('\n=== Background GPS Update ===');
          
          const location = await this.getCurrentLocationWithRetry(0);

          if (this.locationCallback && location) {
            this.locationCallback(location);
          }
        } catch (error) {
          console.error('Background location error:', error);
          // Continue even if one cycle fails
        }
        
        await this.sleep(delay);
      }
    });
  };

  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Start GPS tracking
   */
  startTracking = async (onLocationUpdate) => {
    try {
      console.log('\n========== STARTING GPS TRACKING ==========');
      
      // Initialize if needed
      if (!this.isInitialized) {
        console.log('Initializing GPS service...');
        const initialized = await this.initialize();
        
        if (!initialized) {
          throw new Error('Failed to initialize GPS service');
        }
      }

      if (this.isTracking) {
        console.warn('GPS tracking is already active');
        return true;
      }

      this.locationCallback = onLocationUpdate;

      // Get initial location
      console.log('Getting initial GPS fix...');
      
      try {
        const initialLocation = await this.getCurrentLocationWithRetry(0);
        
        if (this.locationCallback && initialLocation) {
          this.locationCallback(initialLocation);
        }
        
        console.log('✓ Initial location obtained successfully');
      } catch (error) {
        console.error('Failed to get initial location:', error);
        
        if (error.shouldPrompt) {
          if (error.code === 2) {
            this.promptEnableLocation();
          } else if (error.code === 1) {
            Alert.alert(
              'Permission Required',
              error.message,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Settings', onPress: () => Linking.openSettings() },
              ]
            );
          }
        } else {
          Alert.alert(
            'GPS Error',
            error.message || 'Unable to get your location. Please ensure:\n\n' +
            '1. Location services are enabled\n' +
            '2. GPS permission is granted\n' +
            '3. You are outdoors or near a window',
            [{ text: 'OK' }]
          );
        }
        
        throw error;
      }

      // Start foreground tracking
      console.log('Starting foreground location watch...');
      
      this.watchId = Geolocation.watchPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            speed: position.coords.speed,
            heading: position.coords.heading,
            timestamp: position.timestamp,
          };

          console.log('📍 Foreground update:', {
            lat: location.latitude.toFixed(6),
            lng: location.longitude.toFixed(6),
            accuracy: location.accuracy?.toFixed(1) + 'm'
          });

          this.lastLocation = location;

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
            ios: 'best',
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

      console.log('✓ Foreground tracking started');

      // Start background service
      console.log('Starting background service...');
      
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
      console.log('✓ Background service started');
      console.log('========== GPS TRACKING ACTIVE ==========\n');
      
      return true;
    } catch (error) {
      console.error('Error starting GPS tracking:', error);
      this.isTracking = false;
      return false;
    }
  };

  /**
   * Stop GPS tracking
   */
  stopTracking = async () => {
    try {
      if (!this.isTracking) {
        console.warn('GPS tracking is not active');
        return true;
      }

      console.log('\n========== STOPPING GPS TRACKING ==========');

      if (this.watchId !== null) {
        Geolocation.clearWatch(this.watchId);
        this.watchId = null;
        console.log('✓ Foreground tracking stopped');
      }

      if (this.backgroundTaskRunning) {
        await BackgroundService.stop();
        this.backgroundTaskRunning = false;
        console.log('✓ Background service stopped');
      }

      this.locationCallback = null;
      this.isTracking = false;

      console.log('========== GPS TRACKING STOPPED ==========\n');
      return true;
    } catch (error) {
      console.error('Error stopping GPS tracking:', error);
      return false;
    }
  };

  getCurrentLocation = async () => {
    return this.getCurrentLocationWithRetry(0);
  };

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

  checkLocationServices = async () => {
    try {
      const locationEnabled = await this.checkLocationEnabled();
      
      return {
        isRunning: this.isTracking,
        hasPermissions: this.isInitialized,
        locationServicesEnabled: locationEnabled,
        hasLastLocation: !!this.lastLocation,
      };
    } catch (error) {
      console.error('Error checking location services:', error);
      throw error;
    }
  };

  getTrackingStatus = () => {
    return this.isTracking;
  };

  isBackgroundServiceRunning = () => {
    return BackgroundService.isRunning();
  };

  getLastLocation = () => {
    return this.lastLocation;
  };
}

const gpsService = new GPSService();
export default gpsService;