/**
 * Trip History Screen
 * Display list of past trips for the rider
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getTripHistory } from '../services/api';
import { getRiderId } from '../services/storage';
import TripCard from '../components/TripCard';
import colors from '../constants/colors';

/**
 * TripHistoryScreen Component
 * @param {Object} props - Component props
 * @param {Object} props.navigation - React Navigation object
 */
const TripHistoryScreen = ({ navigation }) => {
  // State management
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [riderId, setRiderId] = useState(null);

  /**
   * Fetch trip history from API
   * @param {boolean} isRefreshing - Whether this is a refresh action
   */
  const fetchTripHistory = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Get rider ID from storage
      const storedRiderId = await getRiderId();

      if (!storedRiderId) {
        throw new Error('Rider ID not found. Please login again.');
      }

      setRiderId(storedRiderId);

      // Fetch trip history from API
      const response = await getTripHistory(storedRiderId);

      if (response.success) {
        // Process and format trip data
        const formattedTrips = formatTripData(response.data);
        setTrips(formattedTrips);
      } else {
        throw new Error(response.message || 'Failed to fetch trip history');
      }
    } catch (err) {
      console.error('Fetch trip history error:', err);
      setError(err.message || 'Failed to load trip history');
      
      // If rider ID issue, redirect to login
      if (err.message.includes('login')) {
        setTimeout(() => {
          navigation.replace('Login');
        }, 2000);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Format trip data for display
   * @param {Array|Object} data - Raw trip data from API
   * @returns {Array} Formatted trip array
   */
  const formatTripData = (data) => {
    try {
      // Handle different API response formats
      let tripArray = [];

      if (Array.isArray(data)) {
        tripArray = data;
      } else if (data.trips && Array.isArray(data.trips)) {
        tripArray = data.trips;
      } else if (data.data && Array.isArray(data.data)) {
        tripArray = data.data;
      } else {
        return [];
      }

      // Format each trip
      return tripArray.map((trip) => ({
        id: trip.id || trip.trip_id,
        date: trip.date || trip.start_time || trip.created_at,
        startTime: trip.start_time,
        endTime: trip.end_time,
        distance: parseFloat(trip.total_distance || trip.distance || 0),
        status: trip.status || 'completed',
        // Additional data for potential detail view
        coordinates: trip.coordinates || [],
        riderId: trip.rider_id,
      }));
    } catch (err) {
      console.error('Error formatting trip data:', err);
      return [];
    }
  };

  /**
   * Handle pull to refresh
   */
  const handleRefresh = () => {
    fetchTripHistory(true);
  };

  /**
   * Handle trip card press
   * @param {Object} trip - Trip data
   */
  const handleTripPress = (trip) => {
    // Navigate to trip detail screen (optional feature)
    // For now, we can show an alert or do nothing
    console.log('Trip pressed:', trip);
    
    // Example: Navigate to detail screen
    // navigation.navigate('TripDetail', { trip });
  };

  /**
   * Handle retry button press
   */
  const handleRetry = () => {
    fetchTripHistory(false);
  };

  /**
   * Fetch trip history on mount
   */
  useEffect(() => {
    fetchTripHistory(false);
  }, []);

  /**
   * Refresh trip history when screen comes into focus
   */
  useFocusEffect(
    useCallback(() => {
      // Refresh data when returning to this screen
      fetchTripHistory(true);
    }, [])
  );

  /**
   * Render individual trip item
   * @param {Object} params - Render params
   * @returns {JSX.Element} Trip card component
   */
  const renderTripItem = ({ item }) => (
    <TripCard trip={item} onPress={handleTripPress} />
  );

  /**
   * Render list header
   * @returns {JSX.Element} Header component
   */
  const renderListHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.headerTitle}>Trip History</Text>
      <Text style={styles.headerSubtitle}>
        {trips.length} {trips.length === 1 ? 'trip' : 'trips'} recorded
      </Text>
    </View>
  );

  /**
   * Render empty state
   * @returns {JSX.Element} Empty state component
   */
  const renderEmptyState = () => {
    if (loading) {
      return null;
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📦</Text>
        <Text style={styles.emptyTitle}>No Trips Yet</Text>
        <Text style={styles.emptyText}>
          Your completed trips will appear here.{'\n'}
          Start a new trip to get started!
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.emptyButtonText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  };

  /**
   * Render error state
   * @returns {JSX.Element} Error state component
   */
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Oops!</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render loading state
   * @returns {JSX.Element} Loading component
   */
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Loading trips...</Text>
    </View>
  );

  /**
   * Render footer (loading indicator for pagination)
   * @returns {JSX.Element|null} Footer component
   */
  const renderListFooter = () => {
    if (!refreshing || trips.length === 0) {
      return null;
    }

    return (
      <View style={styles.footerLoading}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  /**
   * Item separator component
   * @returns {JSX.Element} Separator
   */
  const ItemSeparator = () => <View style={styles.separator} />;

  /**
   * Extract unique key for FlatList
   * @param {Object} item - Trip item
   * @returns {string} Unique key
   */
  const keyExtractor = (item) => item.id.toString();

  // Render loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {renderLoadingState()}
      </SafeAreaView>
    );
  }

  // Render error state
  if (error && !loading && trips.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {renderErrorState()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        {/* Trip List */}
        <FlatList
          data={trips}
          renderItem={renderTripItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderListFooter}
          ItemSeparatorComponent={ItemSeparator}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            trips.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
        />
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
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  separator: {
    height: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  footerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default TripHistoryScreen;