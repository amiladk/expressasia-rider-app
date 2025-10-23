/**
 * Login Screen
 * Authentication screen for Express Rider GPS tracking app
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { login } from '../services/api';
import { saveRiderId } from '../services/storage';
import Button from '../components/Button';
import colors from '../constants/colors';

/**
 * LoginScreen Component
 * @param {Object} props - Component props
 * @param {Object} props.navigation - React Navigation object
 */
const LoginScreen = ({ navigation }) => {
  // State management
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Refs
  const usernameInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  /**
   * Auto-focus on username field when screen loads
   */
  useEffect(() => {
    // Small delay to ensure the keyboard shows properly
    const timer = setTimeout(() => {
      usernameInputRef.current?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  /**
   * Clear error message when user starts typing
   */
  useEffect(() => {
    if (error) {
      setError('');
    }
  }, [username, password]);

  /**
   * Validate form inputs
   * @returns {boolean} Whether form is valid
   */
  const validateForm = () => {
    // Clear previous error
    setError('');

    // Check username
    if (!username.trim()) {
      setError('Please enter your username');
      return false;
    }

    // Check password
    if (!password.trim()) {
      setError('Please enter your password');
      return false;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return false;
    }

    return true;
  };

  /**
   * Handle login submission
   */
  const handleLogin = async () => {
    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Call login API
      const response = await login(username.trim(), password);

      if (response.success) {
        // Extract rider ID from response
        const riderId = response.data?.rider_id || response.data?.id;

        if (riderId) {
          // Save rider ID to storage
          await saveRiderId(riderId);
        }

        // Show success message
        Alert.alert(
          'Login Successful',
          'Welcome back!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to Dashboard
                navigation.replace('Dashboard');
              },
            },
          ],
          { cancelable: false }
        );
      } else {
        // Login failed
        setError(response.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.message || 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Enter key on password field
   */
  const handlePasswordSubmit = () => {
    handleLogin();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Express Rider</Text>
              <Text style={styles.subtitle}>GPS Tracking System</Text>
            </View>

            {/* Login Form */}
            <View style={styles.form}>
              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Username Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  ref={usernameInputRef}
                  style={styles.input}
                  placeholder="Enter your username"
                  placeholderTextColor={colors.textSecondary}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  editable={!loading}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    ref={passwordInputRef}
                    style={styles.passwordInput}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={handlePasswordSubmit}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    <Text style={styles.eyeButtonText}>
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Login Button */}
              <View style={styles.buttonContainer}>
                <Button
                  title="Login"
                  onPress={handleLogin}
                  variant="primary"
                  loading={loading}
                  disabled={loading}
                />
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Express Rider v1.0.0
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  form: {
    width: '100%',
  },
  errorContainer: {
    backgroundColor: `${colors.danger}15`,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 48,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    minHeight: 48,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeButtonText: {
    fontSize: 20,
  },
  buttonContainer: {
    marginTop: 12,
  },
  footer: {
    alignItems: 'center',
    marginTop: 48,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default LoginScreen;