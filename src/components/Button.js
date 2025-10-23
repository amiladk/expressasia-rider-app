/**
 * Reusable Button Component
 * Custom button component with multiple variants and states
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import PropTypes from 'prop-types';
import colors from '../constants/colors';

/**
 * Button Component
 * @param {Object} props - Component props
 * @param {string} props.title - Button text
 * @param {Function} props.onPress - Click handler function
 * @param {string} props.variant - Button style variant ('primary', 'secondary', 'danger')
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.loading - Loading state (shows spinner)
 */
const Button = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}) => {
  /**
   * Get button background color based on variant and state
   */
  const getBackgroundColor = () => {
    if (disabled) {
      return colors.border;
    }

    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.secondary;
      case 'danger':
        return colors.danger;
      default:
        return colors.primary;
    }
  };

  /**
   * Get text color based on variant
   */
  const getTextColor = () => {
    if (disabled) {
      return colors.textSecondary;
    }
    return '#ffffff'; // White text for all variants
  };

  /**
   * Get spinner color based on variant
   */
  const getSpinnerColor = () => {
    return '#ffffff'; // White spinner for all variants
  };

  /**
   * Handle button press
   */
  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        disabled && styles.disabled,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={getSpinnerColor()} size="small" />
      ) : (
        <Text style={[styles.buttonText, { color: getTextColor() }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

/**
 * Prop Types
 */
Button.propTypes = {
  title: PropTypes.string.isRequired,
  onPress: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
};

/**
 * Default Props
 */
Button.defaultProps = {
  variant: 'primary',
  disabled: false,
  loading: false,
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  disabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
});

export default Button;