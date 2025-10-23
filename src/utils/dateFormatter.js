/**
 * Date Formatter Utilities
 * Utility functions for formatting dates, times, and durations
 */

import { format, differenceInSeconds, parseISO, isValid } from 'date-fns';

/**
 * Parse date string or Date object
 * @param {string|Date|number} date - Date to parse
 * @returns {Date|null} Parsed Date object or null if invalid
 */
const parseDate = (date) => {
  try {
    if (!date) {
      return null;
    }

    // If already a Date object
    if (date instanceof Date) {
      return isValid(date) ? date : null;
    }

    // If ISO string
    if (typeof date === 'string') {
      const parsed = parseISO(date);
      return isValid(parsed) ? parsed : null;
    }

    // If timestamp (number)
    if (typeof date === 'number') {
      const parsed = new Date(date);
      return isValid(parsed) ? parsed : null;
    }

    return null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
};

/**
 * Format date to readable format
 * @param {string|Date|number} date - Date to format
 * @param {string} formatString - Optional custom format string
 * @returns {string} Formatted date string (e.g., "Oct 23, 2025")
 */
export const formatDate = (date, formatString = 'MMM dd, yyyy') => {
  try {
    const parsedDate = parseDate(date);
    
    if (!parsedDate) {
      return 'Invalid Date';
    }

    return format(parsedDate, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format time to 12-hour format with AM/PM
 * @param {string|Date|number} date - Date/time to format
 * @param {string} formatString - Optional custom format string
 * @returns {string} Formatted time string (e.g., "09:30 AM")
 */
export const formatTime = (date, formatString = 'hh:mm a') => {
  try {
    const parsedDate = parseDate(date);
    
    if (!parsedDate) {
      return '--:--';
    }

    return format(parsedDate, formatString);
  } catch (error) {
    console.error('Error formatting time:', error);
    return '--:--';
  }
};

/**
 * Format date and time together
 * @param {string|Date|number} date - Date/time to format
 * @param {string} formatString - Optional custom format string
 * @returns {string} Formatted date/time string (e.g., "Oct 23, 2025 09:30 AM")
 */
export const formatDateTime = (date, formatString = 'MMM dd, yyyy hh:mm a') => {
  try {
    const parsedDate = parseDate(date);
    
    if (!parsedDate) {
      return 'Invalid Date';
    }

    return format(parsedDate, formatString);
  } catch (error) {
    console.error('Error formatting date/time:', error);
    return 'Invalid Date';
  }
};

/**
 * Format seconds to duration string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "2h 30m" or "45m")
 */
export const formatDuration = (seconds) => {
  try {
    if (typeof seconds !== 'number' || seconds < 0 || isNaN(seconds)) {
      return '--';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    // If duration is 1 hour or more
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    // If duration is 1 minute or more
    if (minutes > 0) {
      return `${minutes}m`;
    }

    // Less than a minute
    return `${secs}s`;
  } catch (error) {
    console.error('Error formatting duration:', error);
    return '--';
  }
};

/**
 * Format duration with seconds (HH:MM:SS)
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "02:30:45")
 */
export const formatDurationWithSeconds = (seconds) => {
  try {
    if (typeof seconds !== 'number' || seconds < 0 || isNaN(seconds)) {
      return '00:00:00';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Error formatting duration with seconds:', error);
    return '00:00:00';
  }
};

/**
 * Calculate duration between two dates in seconds
 * @param {string|Date|number} startTime - Start date/time
 * @param {string|Date|number} endTime - End date/time
 * @returns {number} Duration in seconds
 */
export const getDuration = (startTime, endTime) => {
  try {
    const start = parseDate(startTime);
    const end = parseDate(endTime);

    if (!start || !end) {
      return 0;
    }

    const duration = differenceInSeconds(end, start);

    // Return 0 if duration is negative
    return duration < 0 ? 0 : duration;
  } catch (error) {
    console.error('Error calculating duration:', error);
    return 0;
  }
};

/**
 * Format date to long format
 * @param {string|Date|number} date - Date to format
 * @returns {string} Long formatted date (e.g., "Wednesday, October 23, 2025")
 */
export const formatDateLong = (date) => {
  return formatDate(date, 'EEEE, MMMM dd, yyyy');
};

/**
 * Format date to short format
 * @param {string|Date|number} date - Date to format
 * @returns {string} Short formatted date (e.g., "10/23/25")
 */
export const formatDateShort = (date) => {
  return formatDate(date, 'MM/dd/yy');
};

/**
 * Format time to 24-hour format
 * @param {string|Date|number} date - Date/time to format
 * @returns {string} 24-hour formatted time (e.g., "13:30")
 */
export const formatTime24Hour = (date) => {
  return formatTime(date, 'HH:mm');
};

/**
 * Check if date is today
 * @param {string|Date|number} date - Date to check
 * @returns {boolean} True if date is today
 */
export const isToday = (date) => {
  try {
    const parsedDate = parseDate(date);
    if (!parsedDate) return false;

    const today = new Date();
    return (
      parsedDate.getDate() === today.getDate() &&
      parsedDate.getMonth() === today.getMonth() &&
      parsedDate.getFullYear() === today.getFullYear()
    );
  } catch (error) {
    return false;
  }
};

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {string|Date|number} date - Date to format
 * @returns {string} Relative time string
 */
export const getRelativeTime = (date) => {
  try {
    const parsedDate = parseDate(date);
    if (!parsedDate) return '';

    const now = new Date();
    const diffSeconds = differenceInSeconds(now, parsedDate);

    if (diffSeconds < 60) {
      return 'just now';
    }

    if (diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }

    if (diffSeconds < 86400) {
      const hours = Math.floor(diffSeconds / 3600);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }

    const days = Math.floor(diffSeconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } catch (error) {
    console.error('Error getting relative time:', error);
    return '';
  }
};

/**
 * Format timestamp to readable format
 * @param {number} timestamp - Unix timestamp (milliseconds)
 * @returns {string} Formatted date/time
 */
export const formatTimestamp = (timestamp) => {
  return formatDateTime(timestamp);
};

/**
 * Get current date formatted
 * @param {string} formatString - Optional format string
 * @returns {string} Formatted current date
 */
export const getCurrentDate = (formatString) => {
  return formatDate(new Date(), formatString);
};

/**
 * Get current time formatted
 * @param {string} formatString - Optional format string
 * @returns {string} Formatted current time
 */
export const getCurrentTime = (formatString) => {
  return formatTime(new Date(), formatString);
};

// Export all functions as default
export default {
  formatDate,
  formatTime,
  formatDateTime,
  formatDuration,
  formatDurationWithSeconds,
  getDuration,
  formatDateLong,
  formatDateShort,
  formatTime24Hour,
  isToday,
  getRelativeTime,
  formatTimestamp,
  getCurrentDate,
  getCurrentTime,
};