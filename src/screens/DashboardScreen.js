/**
 * Dashboard Screen
 * Main dashboard for Express Rider GPS tracking app
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { logout } from '../services/api';
import { getRiderId, getRiderName, getTripData, clearAllData } from '../services/storage';
import Button from '../components/Button';
import colors from '../constants/colors';

/**
 * Format current date to readable string
 * @returns {string} Formatted date string
 */
const getCurrentDate = () => {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return now.toLocaleDateString('en-US', options);
};

/**
 * Get greeting based on time of day
 * @returns {string} Greeting message
 */
const getGreeting = () => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return 'Good Morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good Afternoon';
  } else if (hour >= 17 && hour < 21) {
    return 'Good Evening';
  } else {
    return 'Good Night';
  }
};

/**
 * DashboardScreen Component
 * @param {Object} props - Component props
 * @param {Object} props.navigation - React Navigation object
 */
const DashboardScreen = ({ navigation }) => {
  // State management
  const [riderName, setRiderName] = useState('Rider');
  const [riderId, setRiderId] = useState(null);
  const [currentDate, setCurrentDate] = useState(getCurrentDate());
  const [hasActiveTrip, setHasActiveTrip] = useState(false);
  const [activeTripData, setActiveTripData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Load rider data and check for active trip
   */
  const loadDashboardData = async () => {
    try {
      // Get rider ID from storage
      const storedRiderId = await getRiderId();
      
      if (storedRiderId) {
        setRiderId(storedRiderId);
      }

      // Get rider Name from storage
      const storedRiderName = await getRiderName();
      if (storedRiderName) {
        setRiderName(`${storedRiderName}`);
      }

      // Check for active trip
      const tripData = await getTripData();
      
      if (tripData && tripData.status === 'active') {
        setHasActiveTrip(true);
        setActiveTripData(tripData);
      } else {
        setHasActiveTrip(false);
        setActiveTripData(null);
      }

      // Update current date
      setCurrentDate(getCurrentDate());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Load data on mount
   */
  useEffect(() => {
    loadDashboardData();
  }, []);

  /**
   * Refresh data when screen comes into focus
   */
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  /**
   * Navigate to Trip Tracking Screen
   */
  const handleStartTrip = () => {
    if (hasActiveTrip) {
      // Navigate to existing active trip
      Alert.alert(
        'Active Trip Found',
        'You have an ongoing trip. Do you want to continue it?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Continue Trip',
            onPress: () => navigation.navigate('TripTracking'),
          },
        ]
      );
    } else {
      // Start new trip
      navigation.navigate('TripTracking');
    }
  };

  /**
   * Navigate to Trip History Screen
   */
  const handleViewHistory = () => {
    navigation.navigate('TripHistory');
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call logout API
              await logout();
              
              // Clear all local storage
              await clearAllData();
              
              // Navigate to Login screen
              navigation.replace('Login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.riderName}>{riderName}</Text>
            </View>
            <Text style={styles.date}>{currentDate}</Text>
          </View>

          {/* Active Trip Warning */}
          {hasActiveTrip && (
            <View style={styles.activeTripBanner}>
              <View style={styles.activeTripIconContainer}>
                <Text style={styles.activeTripIcon}>🚴</Text>
              </View>
              <View style={styles.activeTripTextContainer}>
                <Text style={styles.activeTripTitle}>Active Trip</Text>
                <Text style={styles.activeTripSubtitle}>
                  You have an ongoing delivery trip
                </Text>
              </View>
            </View>
          )}

          {/* Main Actions */}
          <View style={styles.mainActions}>
            {/* Start Trip Button */}
            <View style={styles.startTripContainer}>
              <View style={styles.startTripCard}>
                <View style={styles.startTripIconContainer}>
                  <Text style={styles.startTripIcon}>📍</Text>
                </View>
                <Text style={styles.startTripTitle}>
                  {hasActiveTrip ? 'Continue Trip' : 'Start New Trip'}
                </Text>
                <Text style={styles.startTripSubtitle}>
                  {hasActiveTrip
                    ? 'Resume your active delivery'
                    : 'Begin tracking your delivery route'}
                </Text>
              </View>
              <Button
                title={hasActiveTrip ? 'Continue Trip' : 'Start Trip'}
                onPress={handleStartTrip}
                variant="primary"
              />
            </View>

            {/* View History Button */}
            <View style={styles.secondaryAction}>
              <Button
                title="View Trip History"
                onPress={handleViewHistory}
                variant="secondary"
              />
            </View>
          </View>

          {/* Quick Stats (Optional - can be expanded later) */}
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Quick Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>--</Text>
                <Text style={styles.statLabel}>Today's Trips</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>-- km</Text>
                <Text style={styles.statLabel}>Total Distance</Text>
              </View>
            </View>
          </View>

          {/* Logout Button */}
          <View style={styles.logoutContainer}>
            <Button
              title="Logout"
              onPress={handleLogout}
              variant="danger"
            />
          </View>
        </View>
      </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    marginBottom: 24,
  },
  greetingContainer: {
    marginBottom: 8,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  riderName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },
  date: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeTripBanner: {
    flexDirection: 'row',
    backgroundColor: `${colors.warning}15`,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  activeTripIconContainer: {
    marginRight: 12,
  },
  activeTripIcon: {
    fontSize: 32,
  },
  activeTripTextContainer: {
    flex: 1,
  },
  activeTripTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  activeTripSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  mainActions: {
    marginBottom: 24,
  },
  startTripContainer: {
    marginBottom: 16,
  },
  startTripCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    // Android shadow
    elevation: 2,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  startTripIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  startTripIcon: {
    fontSize: 40,
  },
  startTripTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  startTripSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  secondaryAction: {
    marginBottom: 16,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  logoutContainer: {
    marginTop: 'auto',
    paddingTop: 24,
  },
});

export default DashboardScreen;