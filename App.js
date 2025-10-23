/**
 * Express Rider GPS Tracking App
 * Root Application Component
 */

import React, { useEffect, useState } from 'react';
import {
  StatusBar,
  Platform,
  PermissionsAndroid,
  Alert,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import colors from './src/constants/colors';

/**
 * Splash/Loading Screen Component
 */
const SplashScreen = () => (
  <View style={styles.splashContainer}>
    <Text style={styles.splashTitle}>Express Rider</Text>
    <Text style={styles.splashSubtitle}>GPS Tracking System</Text>
    <ActivityIndicator
      size="large"
      color={colors.primary}
      style={styles.splashLoader}
    />
    <Text style={styles.splashText}>Initializing...</Text>
  </View>
);

/**
 * Request location permissions for Android
 * @returns {Promise<boolean>} Permission granted status
 */
const requestLocationPermissions = async () => {
  if (Platform.OS === 'ios') {
    // iOS permissions are handled in Info.plist and at runtime
    return true;
  }

  try {
    if (Platform.Version >= 23) {
      // Android 6.0 and above
      const permissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ];

      // Request background location for Android 10+ (API 29+)
      if (Platform.Version >= 29) {
        permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
      }

      const granted = await PermissionsAndroid.requestMultiple(permissions);

      const fineLocationGranted =
        granted['android.permission.ACCESS_FINE_LOCATION'] ===
        PermissionsAndroid.RESULTS.GRANTED;

      const coarseLocationGranted =
        granted['android.permission.ACCESS_COARSE_LOCATION'] ===
        PermissionsAndroid.RESULTS.GRANTED;

      return fineLocationGranted || coarseLocationGranted;
    }

    return true;
  } catch (err) {
    console.error('Permission request error:', err);
    return false;
  }
};

/**
 * Check if location permissions are already granted
 * @returns {Promise<boolean>} Permission status
 */
const checkLocationPermissions = async () => {
  if (Platform.OS === 'ios') {
    return true;
  }

  try {
    const fineLocation = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );

    const coarseLocation = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
    );

    return fineLocation || coarseLocation;
  } catch (err) {
    console.error('Permission check error:', err);
    return false;
  }
};

/**
 * Main App Component
 */
const App = () => {
  const [isReady, setIsReady] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);

  /**
   * Initialize app on mount
   */
  useEffect(() => {
    initializeApp();
  }, []);

  /**
   * Initialize app - check and request permissions
   */
  const initializeApp = async () => {
    try {
      // Check if permissions are already granted
      const hasExistingPermissions = await checkLocationPermissions();

      if (hasExistingPermissions) {
        setHasPermissions(true);
        // Add small delay for smooth transition
        setTimeout(() => {
          setIsReady(true);
        }, 1000);
      } else {
        // Request permissions
        const granted = await requestLocationPermissions();

        if (granted) {
          setHasPermissions(true);
        } else {
          // Show alert if permissions denied
          Alert.alert(
            'Location Permission Required',
            'This app requires location permissions to track delivery routes. You can enable them in Settings.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Continue to app even without permissions
                  // User will be prompted again when starting a trip
                  setHasPermissions(false);
                },
              },
            ]
          );
        }

        // Proceed to app after permission request
        setTimeout(() => {
          setIsReady(true);
        }, 1000);
      }
    } catch (error) {
      console.error('App initialization error:', error);
      // Continue to app even if initialization fails
      setTimeout(() => {
        setIsReady(true);
      }, 1000);
    }
  };

  /**
   * Show splash screen while initializing
   */
  if (!isReady) {
    return (
      <>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={colors.background}
        />
        <SplashScreen />
      </>
    );
  }

  /**
   * Render main app
   */
  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primary}
        translucent={false}
      />
      <AppNavigator />
    </>
  );
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 40,
  },
  splashTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  splashSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 60,
    textAlign: 'center',
  },
  splashLoader: {
    marginBottom: 16,
  },
  splashText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default App;