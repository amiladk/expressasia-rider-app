/**
 * Trip Tracking Screen
 * Real-time GPS tracking screen for delivery trips
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform,
  PermissionsAndroid,
  AppState,
} from 'react-native';
import gpsService from '../services/gpsService';
import Geolocation from 'react-native-geolocation-service';
import { startTrip, endTrip } from '../services/api';
import {
  saveTripData,
  getTripData,
  clearTripData,
  saveCoordinates,
  getCoordinates,
  clearCoordinates,
  getRiderId,
} from '../services/storage';
import Button from '../components/Button';
import colors from '../constants/colors';

/**
 * Format seconds to HH:MM:SS
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time string
 */
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Request location permissions
 * @returns {Promise<boolean>} Permission granted status
 */
const requestLocationPermission = async () => {
  if (Platform.OS === 'ios') {
    const auth = await Geolocation.requestAuthorization('always');
    return auth === 'granted' || auth === 'whenInUse';
  }

  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);

    const fineLocation =
      granted['android.permission.ACCESS_FINE_LOCATION'] ===
      PermissionsAndroid.RESULTS.GRANTED;

    const coarseLocation =
      granted['android.permission.ACCESS_COARSE_LOCATION'] ===
      PermissionsAndroid.RESULTS.GRANTED;

    // Request background location for Android 10+
    if (Platform.Version >= 29) {
      const bgGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
      );
      
      if (bgGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert(
          'Background Location',
          'For best results, please enable "Allow all the time" location access in Settings.'
        );
      }
    }

    return fineLocation || coarseLocation;
  } catch (err) {
    console.error('Permission request error:', err);
    return false;
  }
};

/**
 * TripTrackingScreen Component
 * @param {Object} props - Component props
 * @param {Object} props.navigation - React Navigation object
 */
const TripTrackingScreen = ({ navigation }) => {
  // State management
  const [tripId, setTripId] = useState(null);
  const [riderId, setRiderId] = useState(null);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [coordinates, setCoordinates] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('Initializing...');
  const [startTime, setStartTime] = useState(null);
  const [isEnding, setIsEnding] = useState(false);

  // Refs
  const durationIntervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  /**
   * Initialize trip and GPS tracking
   */
  const initializeTrip = async () => {
    try {
      setGpsStatus('Requesting permissions...');

      // Request location permissions
      const hasPermission = await requestLocationPermission();

      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Location permission is required to track your trip.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
        return;
      }

      // Get rider ID
      const storedRiderId = await getRiderId();
      if (!storedRiderId) {
        Alert.alert('Error', 'Rider ID not found. Please login again.');
        navigation.replace('Login');
        return;
      }
      setRiderId(storedRiderId);

      // Check for existing active trip
      const existingTrip = await getTripData();

      if (existingTrip && existingTrip.status === 'active') {
        // Resume existing trip
        setTripId(existingTrip.trip_id);
        setStartTime(new Date(existingTrip.start_time));
        
        // Load existing coordinates
        const savedCoords = await getCoordinates();
        setCoordinates(savedCoords);
        
        // Calculate distance from saved coordinates
        if (savedCoords.length > 0) {
          const totalDist = gpsService.calculateTripDistance(savedCoords);
          setDistance(totalDist);
        }

        setGpsStatus('Resuming trip...');
      } else {
        // Start new trip
        setGpsStatus('Starting new trip...');

        const response = await startTrip(storedRiderId);

        if (!response.success) {
          throw new Error(response.message || 'Failed to start trip');
        }

        const newTripId = response.data?.data?.trip_id || response.data?.trip_id || response.data?.data?.id;
        const tripStartTime = new Date();

        setTripId(newTripId);
        setStartTime(tripStartTime);

        // Save trip data
        await saveTripData({
          trip_id: newTripId,
          rider_id: storedRiderId,
          start_time: tripStartTime.toISOString(),
          status: 'active',
        });

        // Clear any old coordinates
        await clearCoordinates();
      }

      // Initialize GPS service
      await gpsService.initialize();

      // Start GPS tracking
      setGpsStatus('Starting GPS...');
      await gpsService.startTracking(handleLocationUpdate);

      setIsTracking(true);
      setGpsStatus('GPS Active');

      // Start duration timer
      startDurationTimer();
    } catch (error) {
      console.error('Trip initialization error:', error);
      setGpsStatus('GPS Error');
      Alert.alert(
        'Error',
        'Failed to start trip tracking. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  };

  /**
   * Handle location updates from GPS service
   * @param {Object} location - Location data
   */
  const handleLocationUpdate = async (location) => {
    try {
      console.log('Location update:', location);

      // Create coordinate object
      const coord = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy || null,
        altitude: location.altitude || null,
        speed: location.speed || 0,
        timestamp: Math.floor(location.timestamp || Date.now()),
      };

      // Update speed (convert m/s to km/h)
      if (location.speed && location.speed > 0) {
        const speedKmh = (location.speed * 3.6).toFixed(1);
        setSpeed(parseFloat(speedKmh));
      }

      // Add to coordinates array
      setCoordinates((prevCoords) => {
        const updatedCoords = [...prevCoords, coord];

        // Calculate new distance
        if (updatedCoords.length > 1) {
          const totalDist = gpsService.calculateTripDistance(updatedCoords);
          setDistance(totalDist);
        }

        // Save to storage
        saveCoordinates(updatedCoords);

        return updatedCoords;
      });

      setGpsStatus('GPS Active');
    } catch (error) {
      console.error('Location update error:', error);
    }
  };

  /**
   * Start duration timer
   */
  const startDurationTimer = () => {
    durationIntervalRef.current = setInterval(() => {
      setDuration((prevDuration) => prevDuration + 1);
    }, 1000);
  };

  /**
   * Stop duration timer
   */
  const stopDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  /**
   * Handle end trip
   */
  const handleEndTrip = () => {
    Alert.alert(
      'End Trip',
      `Are you sure you want to end this trip?\n\nDistance: ${distance.toFixed(
        2
      )} km\nDuration: ${formatDuration(duration)}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'End Trip',
          style: 'destructive',
          onPress: endTripConfirmed,
        },
      ]
    );
  };

  /**
   * End trip after confirmation
   */
  const endTripConfirmed = async () => {
    try {
      setIsEnding(true);
      setGpsStatus('Ending trip...');

      // Stop GPS tracking
      await gpsService.stopTracking();
      setIsTracking(false);

      // Stop duration timer
      stopDurationTimer();

      const endTime = new Date();

      const formattedCoordinates = coordinates.map(coord => ({
        latitude: coord.latitude,
        longitude: coord.longitude,
        accuracy: coord.accuracy || null,
        altitude: coord.altitude || null,
        speed: coord.speed || 0,
        timestamp: Math.floor(coord.timestamp || Date.now()),
      }));

      // Prepare trip data
      const tripData = {
        trip_id: tripId,
        rider_id: riderId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        total_distance: distance,
        coordinates: formattedCoordinates,
      };

      // Call end trip API
      const response = await endTrip(tripData);

      if (response.success) {
        // Clear trip data from storage
        await clearTripData();
        await clearCoordinates();

        // Show success message
        Alert.alert(
          'Trip Completed',
          `Your trip has been saved successfully!\n\nDistance: ${distance.toFixed(
            2
          )} km\nDuration: ${formatDuration(duration)}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.replace('Dashboard'),
            },
          ]
        );
      } else {
        throw new Error(response.message || 'Failed to end trip');
      }
    } catch (error) {
      console.error('End trip error:', error);
      setIsEnding(false);
      Alert.alert(
        'Error',
        'Failed to end trip. Please try again or contact support.'
      );
    }
  };

  /**
   * Handle app state changes (background/foreground)
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground');
        // Reload trip data when app comes back to foreground
        loadTripState();
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  /**
   * Load trip state from storage
   */
  const loadTripState = async () => {
    try {
      const savedCoords = await getCoordinates();
      if (savedCoords.length > 0) {
        setCoordinates(savedCoords);
        const totalDist = gpsService.calculateTripDistance(savedCoords);
        setDistance(totalDist);
      }
    } catch (error) {
      console.error('Error loading trip state:', error);
    }
  };

  /**
   * Initialize trip on mount
   */
  useEffect(() => {
    initializeTrip();

    // Cleanup on unmount
    return () => {
      stopDurationTimer();
      // Don't stop GPS tracking on unmount - it should continue in background
    };
  }, []);

  /**
   * Handle back button (Android)
   */
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isTracking) {
        // If not tracking, allow navigation
        return;
      }

      // Prevent default behavior
      e.preventDefault();

      // Show confirmation
      Alert.alert(
        'Trip in Progress',
        'Your trip is still being tracked. Are you sure you want to leave?',
        [
          { text: "Don't leave", style: 'cancel', onPress: () => {} },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, isTracking]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Trip Tracking</Text>
          <View
            style={[
              styles.gpsStatusBadge,
              {
                backgroundColor:
                  gpsStatus === 'GPS Active'
                    ? `${colors.secondary}15`
                    : `${colors.warning}15`,
              },
            ]}
          >
            <View
              style={[
                styles.gpsStatusDot,
                {
                  backgroundColor:
                    gpsStatus === 'GPS Active'
                      ? colors.secondary
                      : colors.warning,
                },
              ]}
            />
            <Text style={styles.gpsStatusText}>{gpsStatus}</Text>
          </View>
        </View>

        {/* Main Stats Display */}
        <View style={styles.statsContainer}>
          {/* Distance */}
          <View style={styles.mainStat}>
            <Text style={styles.mainStatLabel}>Distance</Text>
            <Text style={styles.mainStatValue}>
              {distance.toFixed(2)}
              <Text style={styles.mainStatUnit}> km</Text>
            </Text>
          </View>

          {/* Secondary Stats */}
          <View style={styles.secondaryStats}>
            {/* Duration */}
            <View style={styles.secondaryStat}>
              <Text style={styles.secondaryStatLabel}>Duration</Text>
              <Text style={styles.secondaryStatValue}>
                {formatDuration(duration)}
              </Text>
            </View>

            {/* Speed */}
            <View style={styles.secondaryStat}>
              <Text style={styles.secondaryStatLabel}>Speed</Text>
              <Text style={styles.secondaryStatValue}>
                {speed.toFixed(1)} km/h
              </Text>
            </View>
          </View>

          {/* Coordinate Count */}
          <View style={styles.coordinateInfo}>
            <Text style={styles.coordinateText}>
              📍 {coordinates.length} GPS points recorded
            </Text>
          </View>
        </View>

        {/* Trip Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trip ID:</Text>
            <Text style={styles.infoValue}>#{tripId || '--'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Started:</Text>
            <Text style={styles.infoValue}>
              {startTime
                ? startTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })
                : '--:--'}
            </Text>
          </View>
        </View>

        {/* End Trip Button */}
        <View style={styles.endTripContainer}>
          <Button
            title="End Trip"
            onPress={handleEndTrip}
            variant="danger"
            disabled={isEnding || !isTracking}
            loading={isEnding}
          />
        </View>

        {/* Info Text */}
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoText}>
            🔒 GPS tracking continues in the background
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  gpsStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  gpsStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  gpsStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  mainStat: {
    alignItems: 'center',
    marginBottom: 48,
  },
  mainStatLabel: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mainStatValue: {
    fontSize: 72,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 80,
  },
  mainStatUnit: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  secondaryStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 48,
    marginBottom: 32,
  },
  secondaryStat: {
    alignItems: 'center',
  },
  secondaryStatLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondaryStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  coordinateInfo: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coordinateText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  endTripContainer: {
    marginBottom: 16,
  },
  infoTextContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default TripTrackingScreen;