/**
 * App Navigator
 * Main navigation configuration for Express Rider GPS tracking app
 */

import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import TripTrackingScreen from '../screens/TripTrackingScreen';
import TripHistoryScreen from '../screens/TripHistoryScreen';

// Services
import { getAuthToken } from '../services/storage';
import colors from '../constants/colors';

// Create Stack Navigator
const Stack = createNativeStackNavigator();

/**
 * Auth Loading Screen Component
 * Shows loading spinner while checking authentication
 */
const AuthLoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

/**
 * App Navigator Component
 * Main navigation container with authentication check
 */
const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /**
   * Check authentication status on mount
   */
  useEffect(() => {
    checkAuthStatus();
  }, []);

  /**
   * Check if user is authenticated
   */
  const checkAuthStatus = async () => {
    try {
      const token = await getAuthToken();
      
      // User is authenticated if token exists
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      // Small delay to prevent flash of loading screen
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  };

  /**
   * Show loading screen while checking authentication
   */
  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'Dashboard' : 'Login'}
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.primary,
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          headerShadowVisible: true,
          animation: 'slide_from_right',
        }}
      >
        {/* Login Screen */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />

        {/* Dashboard Screen */}
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            title: 'Dashboard',
            headerShown: true,
            headerLeft: () => null, // Disable back button
            gestureEnabled: false, // Disable swipe back gesture
          }}
        />

        {/* Trip Tracking Screen */}
        <Stack.Screen
          name="TripTracking"
          component={TripTrackingScreen}
          options={{
            title: 'Active Trip',
            headerShown: true,
            headerBackTitle: 'Dashboard',
            gestureEnabled: false, // Prevent accidental back swipe during tracking
          }}
        />

        {/* Trip History Screen */}
        <Stack.Screen
          name="TripHistory"
          component={TripHistoryScreen}
          options={{
            title: 'Trip History',
            headerShown: false, // Using custom back button in screen
            headerBackTitle: 'Dashboard',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

export default AppNavigator;