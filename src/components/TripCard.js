/**
 * TripCard Component
 * Card component for displaying trip history information
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import PropTypes from 'prop-types';
import colors from '../constants/colors';
import { formatDate, formatTime, getDuration, formatDuration } from '../utils/dateFormatter';

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
// const formatDate = (date) => {
//   try {
//     const dateObj = typeof date === 'string' ? new Date(date) : date;
    
//     const options = {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//     };
    
//     return dateObj.toLocaleDateString('en-US', options);
//   } catch (error) {
//     return 'Invalid Date';
//   }
// };

/**
 * Format time to 12-hour format with AM/PM
 * @param {string|Date} time - Time to format
 * @returns {string} Formatted time string
 */
const formatTime = (time) => {
  try {
    const timeObj = typeof time === 'string' ? new Date(time) : time;
    
    const options = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    
    return timeObj.toLocaleTimeString('en-US', options);
  } catch (error) {
    return '--:--';
  }
};

/**
 * Calculate duration between two times
 * @param {string|Date} startTime - Start time
 * @param {string|Date} endTime - End time
 * @returns {string} Duration string (e.g., "2h 30m")
 */
const calculateDuration = (startTime, endTime) => {
  try {
    const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
    
    const durationMs = end - start;
    
    if (durationMs < 0) {
      return '--';
    }
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    
    return `${minutes}m`;
  } catch (error) {
    return '--';
  }
};

/**
 * TripCard Component
 * @param {Object} props - Component props
 * @param {Object} props.trip - Trip data object
 * @param {string|number} props.trip.id - Trip ID
 * @param {string|Date} props.trip.date - Trip date
 * @param {string|Date} props.trip.startTime - Trip start time
 * @param {string|Date} props.trip.endTime - Trip end time
 * @param {number} props.trip.distance - Total distance in kilometers
 * @param {string} props.trip.status - Trip status ('completed' or 'active')
 * @param {Function} props.onPress - Optional click handler
 */
const TripCard = ({ trip, onPress }) => {
  const {
    id,
    date,
    startTime,
    endTime,
    distance,
    status,
  } = trip;

  const formattedDate = formatDate(date);
  const formattedStartTime = formatTime(startTime);
  const formattedEndTime = endTime ? formatTime(endTime) : '--:--';
  
  const duration = endTime 
    ? formatDuration(getDuration(startTime, endTime))
    : 'In Progress';

  /**
   * Get status badge color
   */
  const getStatusColor = () => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return colors.secondary;
      case 'active':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  /**
   * Get status badge background color
   */
  const getStatusBackgroundColor = () => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return `${colors.secondary}15`; // 15 = ~8% opacity in hex
      case 'active':
        return `${colors.warning}15`;
      default:
        return colors.background;
    }
  };

  /**
   * Format distance with proper decimals
   */
  const formatDistance = (dist) => {
    if (typeof dist !== 'number') {
      return '0.00';
    }
    return dist.toFixed(2);
  };

  /**
   * Render card content
   */
  const renderContent = () => (
    <View style={styles.card}>
      {/* Header with Date and Status */}
      <View style={styles.header}>
        <Text style={styles.date}>{formattedDate}</Text>
        <Text style={styles.time}>{formattedStartTime} - {formattedEndTime}</Text>
        <Text style={styles.duration}>{duration}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusBackgroundColor() },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor() },
            ]}
          >
            {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
          </Text>
        </View>
      </View>

      {/* Trip Details */}
      <View style={styles.detailsContainer}>
        {/* Time Section */}
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Start Time</Text>
            <Text style={styles.detailValue}>{formatTime(startTime)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>End Time</Text>
            <Text style={styles.detailValue}>
              {endTime ? formatTime(endTime) : '--:--'}
            </Text>
          </View>
        </View>

        {/* Distance and Duration Section */}
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Distance</Text>
            <Text style={styles.detailValue}>
              {formatDistance(distance)} km
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>
              {endTime ? calculateDuration(startTime, endTime) : 'In Progress'}
            </Text>
          </View>
        </View>
      </View>

      {/* Trip ID (optional, for reference) */}
      <Text style={styles.tripId}>Trip #{id}</Text>
    </View>
  );

  /**
   * Render with or without TouchableOpacity based on onPress prop
   */
  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={() => onPress(trip)}
        activeOpacity={0.7}
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return <View style={styles.container}>{renderContent()}</View>;
};

/**
 * Prop Types
 */
TripCard.propTypes = {
  trip: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    date: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)])
      .isRequired,
    startTime: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.instanceOf(Date),
    ]).isRequired,
    endTime: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    distance: PropTypes.number.isRequired,
    status: PropTypes.oneOf(['completed', 'active', 'Active', 'Completed'])
      .isRequired,
  }).isRequired,
  onPress: PropTypes.func,
};

/**
 * Default Props
 */
TripCard.defaultProps = {
  onPress: null,
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    // Android shadow
    elevation: 3,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  date: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  detailsContainer: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  tripId: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default TripCard;