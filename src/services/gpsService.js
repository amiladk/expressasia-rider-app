/**
 * GPS Service - ENHANCED VERSION WITH BACKGROUND FIX
 * Fixed: Background location timeout issues
 * Improvements:
 * 1. More lenient settings for background mode
 * 2. Better fallback to last known location
 * 3. Reduced frequency in background
 * 4. Android Doze mode handling
 */

import Geolocation from 'react-native-geolocation-service';
import BackgroundService from 'react-native-background-actions';
import { Platform, PermissionsAndroid, Alert, Linking, AppState } from 'react-native';
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
    this.lastLocationTime = null;
    this.locationRetryCount = 0;
    this.maxRetries = 3;
    this.appState = AppState.currentState;
  }

  /**
   * Check if location services are enabled
   * @returns {Promise<boolean>}
   */
  checkLocationEnabled = async () => {
    try {
      if (Platform.OS === 'android') {
        return new Promise((resolve) => {
          Geolocation.getCurrentPosition(
            () => {
              console.log('✓ Location services are enabled');
              resolve(true);
            },
            (error) => {
              console.log('Location services check error:', error);
              if (error.code === 2) {
                resolve(false);
              } else {
                resolve(true);
              }
            },
            {
              enableHighAccuracy: false,
              timeout: 5000,
              maximumAge: 300000,
            }
          );
        });
      } else {
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
              Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
            } else {
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
      
      // Monitor app state changes
      this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
        console.log('App state changed:', this.appState, '->', nextAppState);
        this.appState = nextAppState;
      });
      
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

        // Request background location for Android 10+
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
   * Check if app is in background
   */
  isAppInBackground = () => {
    return this.appState === 'background' || this.appState === 'inactive';
  };

  /**
   * Get current location with retry and better error handling
   * @param {number} retryCount - Current retry attempt
   * @param {boolean} isBackground - Whether request is from background
   */
  getCurrentLocationWithRetry = async (retryCount = 0, isBackground = false) => {
    return new Promise((resolve, reject) => {
      const mode = isBackground ? '[BACKGROUND]' : '[FOREGROUND]';
      console.log(`\n--- Getting location (Attempt ${retryCount + 1}/${this.maxRetries + 1}) ${mode} ---`);

      // More lenient settings for background mode
      let timeout, maximumAge, enableHighAccuracy;
      
      if (isBackground) {
        // Background mode: very lenient settings
        timeout = retryCount === 0 ? 30000 : 45000 + (retryCount * 15000);
        maximumAge = retryCount === 0 ? 120000 : 300000; // Accept 2-5 minute old locations
        enableHighAccuracy = false;
      } else {
        // Foreground mode: moderate settings
        timeout = retryCount === 0 ? 20000 : 30000 + (retryCount * 15000);
        maximumAge = retryCount === 0 ? 10000 : 60000 + (retryCount * 30000);
        enableHighAccuracy = false;
      }

      console.log('Settings:', {
        timeout: timeout / 1000 + 's',
        maximumAge: maximumAge / 1000 + 's',
        highAccuracy: enableHighAccuracy,
        mode: isBackground ? 'background' : 'foreground',
      });

      Geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy || null,
            altitude: position.coords.altitude || null,
            speed: position.coords.speed || 0,
            heading: position.coords.heading,
            timestamp: Math.floor(position.timestamp || Date.now()),
          };

          const age = Math.round((Date.now() - location.timestamp) / 1000);
          console.log('✓ Location obtained:', {
            lat: location.latitude.toFixed(6),
            lng: location.longitude.toFixed(6),
            accuracy: location.accuracy?.toFixed(1) + 'm',
            age: age + 's old'
          });

          this.lastLocation = location;
          this.lastLocationTime = Date.now();
          this.locationRetryCount = 0;
          resolve(location);
        },
        (error) => {
          console.error(`✗ Location error (attempt ${retryCount + 1}):`, error);

          if (error.code === 2) {
            console.error('ERROR CODE 2: No location provider available');
            
            if (retryCount === 0) {
              reject({
                code: 2,
                message: 'Location services are disabled. Please enable GPS in your device settings.',
                shouldPrompt: true,
              });
            } else {
              reject(error);
            }
          } else if (error.code === 3) {
            // TIMEOUT - Common in background
            console.warn('ERROR CODE 3: Location request timed out');
            
            // In background, use last known location more aggressively
            if (isBackground && this.lastLocation) {
              const locationAge = Date.now() - this.lastLocationTime;
              const maxAge = 10 * 60 * 1000; // 10 minutes
              
              if (locationAge < maxAge) {
                console.log(`⚠ Using last known location from ${Math.round(locationAge / 1000)}s ago`);
                resolve(this.lastLocation);
                return;
              }
            }
            
            if (retryCount < this.maxRetries) {
              console.log(`Retrying with more relaxed settings...`);
              setTimeout(() => {
                this.getCurrentLocationWithRetry(retryCount + 1, isBackground)
                  .then(resolve)
                  .catch(reject);
              }, 2000);
            } else if (this.lastLocation) {
              console.log('⚠ Using last known location as fallback');
              resolve(this.lastLocation);
            } else {
              reject({
                code: 3,
                message: 'Unable to get location. Please ensure you have clear GPS signal.',
              });
            }
          } else if (error.code === 1) {
            console.error('ERROR CODE 1: Permission denied');
            reject({
              code: 1,
              message: 'Location permission denied. Please grant location permission in settings.',
              shouldPrompt: true,
            });
          } else {
            console.error('Unknown error code:', error.code);
            
            if (retryCount < this.maxRetries) {
              setTimeout(() => {
                this.getCurrentLocationWithRetry(retryCount + 1, isBackground)
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
   * Background task function with improved handling
   */
  backgroundTask = async (taskDataArguments) => {
    const { delay } = taskDataArguments;
    // Longer delay for background (2 minutes instead of 1)
    const backgroundDelay = Math.max(delay * 2, 120000);

    await new Promise(async (resolve) => {
      while (BackgroundService.isRunning()) {
        try {
          console.log('\n=== Background GPS Update ===');
          
          // Always pass isBackground=true for background task
          const location = await this.getCurrentLocationWithRetry(0, true);

          if (this.locationCallback && location) {
            this.locationCallback(location);
          }
        } catch (error) {
          console.error('Background location error:', error);
          // Don't fail - just log and continue
        }
        
        await this.sleep(backgroundDelay);
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
        const initialLocation = await this.getCurrentLocationWithRetry(0, false);
        
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

      // Start foreground tracking with relaxed settings
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
          this.lastLocationTime = Date.now();

          if (this.locationCallback) {
            this.locationCallback(location);
          }
        },
        (error) => {
          console.error('Foreground location error:', error);
        },
        {
          accuracy: {
            android: 'balanced', // Use balanced instead of high for better reliability
            ios: 'best',
          },
          enableHighAccuracy: false, // Disable high accuracy for better battery/reliability
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

      // Start background service with longer intervals
      console.log('Starting background service...');
      
      const options = {
        taskName: 'Express Rider GPS Tracking',
        taskTitle: 'Delivery Trip Active',
        taskDesc: 'Tracking your delivery route',
        taskIcon: {
          name: 'ic_launcher',
          type: 'mipmap',
        },
        color: '#321b76',
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
    return this.getCurrentLocationWithRetry(0, this.isAppInBackground());
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