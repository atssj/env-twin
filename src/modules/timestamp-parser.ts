/**
 * Timestamp Parser Module
 *
 * This module handles parsing and formatting of backup timestamps.
 * It provides functionality to parse timestamp strings, format dates,
 * and validate timestamp formats across different platforms and locales.
 */

export interface ParsedTimestamp {
  timestamp: string;
  date: Date;
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  isValid: boolean;
  errors: string[];
}

export interface TimestampFormatOptions {
  includeSeconds?: boolean;
  use24Hour?: boolean;
  locale?: string;
  timeZone?: string;
}

/**
 * Enhanced timestamp parser with validation and formatting capabilities
 */
export class TimestampParser {
  private static readonly TIMESTAMP_FORMAT = /^\d{8}-\d{6}$/;
  private static readonly DATE_FORMAT = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/;

  /**
   * Parse a timestamp string into a structured object
   */
  static parseTimestamp(timestamp: string): ParsedTimestamp {
    const result: ParsedTimestamp = {
      timestamp,
      date: new Date(),
      year: 0,
      month: 0,
      day: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isValid: false,
      errors: []
    };

    // Basic format validation
    if (!this.TIMESTAMP_FORMAT.test(timestamp)) {
      result.errors.push(`Invalid timestamp format: ${timestamp}. Expected format: YYYYMMDD-HHMMSS`);
      return result;
    }

    try {
      // Extract components using regex
      const match = timestamp.match(this.DATE_FORMAT);
      if (!match) {
        result.errors.push(`Failed to parse timestamp components: ${timestamp}`);
        return result;
      }

      const [, yearStr, monthStr, dayStr, hoursStr, minutesStr, secondsStr] = match;

      // Convert to numbers
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      const seconds = parseInt(secondsStr, 10);

      // Validate individual components
      const componentErrors = this.validateTimestampComponents(year, month, day, hours, minutes, seconds);
      if (componentErrors.length > 0) {
        result.errors.push(...componentErrors);
        return result;
      }

      // Create Date object
      const date = new Date(year, month - 1, day, hours, minutes, seconds);

      // Additional validation - ensure the date object represents the same date
      if (date.getFullYear() !== year ||
          date.getMonth() !== (month - 1) ||
          date.getDate() !== day ||
          date.getHours() !== hours ||
          date.getMinutes() !== minutes ||
          date.getSeconds() !== seconds) {
        result.errors.push(`Invalid date/time components: ${timestamp}`);
        return result;
      }

      // Populate result
      result.date = date;
      result.year = year;
      result.month = month;
      result.day = day;
      result.hours = hours;
      result.minutes = minutes;
      result.seconds = seconds;
      result.isValid = true;

    } catch (error) {
      result.errors.push(`Failed to parse timestamp: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Validate individual timestamp components
   */
  private static validateTimestampComponents(
    year: number,
    month: number,
    day: number,
    hours: number,
    minutes: number,
    seconds: number
  ): string[] {
    const errors: string[] = [];

    // Year validation (reasonable range)
    if (year < 2000 || year > 2100) {
      errors.push(`Year must be between 2000 and 2100, got: ${year}`);
    }

    // Month validation
    if (month < 1 || month > 12) {
      errors.push(`Month must be between 1 and 12, got: ${month}`);
    }

    // Day validation
    if (day < 1 || day > 31) {
      errors.push(`Day must be between 1 and 31, got: ${day}`);
    }

    // Hours validation
    if (hours < 0 || hours > 23) {
      errors.push(`Hours must be between 0 and 23, got: ${hours}`);
    }

    // Minutes validation
    if (minutes < 0 || minutes > 59) {
      errors.push(`Minutes must be between 0 and 59, got: ${minutes}`);
    }

    // Seconds validation
    if (seconds < 0 || seconds > 59) {
      errors.push(`Seconds must be between 0 and 59, got: ${seconds}`);
    }

    return errors;
  }

  /**
   * Generate a timestamp from current date/time
   */
  static generateTimestamp(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  /**
   * Format timestamp for display
   */
  static formatTimestamp(timestamp: string, options: TimestampFormatOptions = {}): string {
    const parsed = this.parseTimestamp(timestamp);

    if (!parsed.isValid) {
      return `Invalid timestamp: ${timestamp}`;
    }

    const {
      includeSeconds = true,
      use24Hour = true,
      locale = 'en-US',
      timeZone = 'UTC'
    } = options;

    try {
      const date = parsed.date;

      // Format date part
      const datePart = date.toLocaleDateString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone
      });

      // Format time part
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        timeZone,
        hour12: !use24Hour
      };

      if (includeSeconds) {
        timeOptions.second = '2-digit';
      }

      const timePart = date.toLocaleTimeString(locale, timeOptions);

      return `${datePart} ${timePart}`;
    } catch (error) {
      return `Error formatting timestamp: ${timestamp}`;
    }
  }

  /**
   * Format relative time (e.g., "2 hours ago", "in 3 days")
   */
  static formatRelativeTime(timestamp: string): string {
    const parsed = this.parseTimestamp(timestamp);

    if (!parsed.isValid) {
      return `Invalid timestamp: ${timestamp}`;
    }

    const now = new Date();
    const diffMs = parsed.date.getTime() - now.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    const isPast = diffMs < 0;
    const absDiffSecs = Math.abs(diffSecs);
    const absDiffMins = Math.abs(diffMins);
    const absDiffHours = Math.abs(diffHours);
    const absDiffDays = Math.abs(diffDays);

    if (absDiffSecs < 60) {
      return isPast ? `${absDiffSecs} seconds ago` : `in ${absDiffSecs} seconds`;
    } else if (absDiffMins < 60) {
      return isPast ? `${absDiffMins} minutes ago` : `in ${absDiffMins} minutes`;
    } else if (absDiffHours < 24) {
      return isPast ? `${absDiffHours} hours ago` : `in ${absDiffHours} hours`;
    } else if (absDiffDays < 30) {
      return isPast ? `${absDiffDays} days ago` : `in ${absDiffDays} days`;
    } else {
      // For longer periods, just show the formatted date
      return this.formatTimestamp(timestamp);
    }
  }

  /**
   * Compare two timestamps
   */
  static compareTimestamps(timestamp1: string, timestamp2: string): number {
    const parsed1 = this.parseTimestamp(timestamp1);
    const parsed2 = this.parseTimestamp(timestamp2);

    if (!parsed1.isValid || !parsed2.isValid) {
      throw new Error('Cannot compare invalid timestamps');
    }

    return parsed1.date.getTime() - parsed2.date.getTime();
  }

  /**
   * Sort timestamps (returns array sorted from oldest to newest)
   */
  static sortTimestamps(timestamps: string[]): string[] {
    return timestamps.sort((a, b) => this.compareTimestamps(a, b));
  }

  /**
   * Get most recent timestamp from array
   */
  static getMostRecentTimestamp(timestamps: string[]): string | null {
    if (timestamps.length === 0) {
      return null;
    }

    const sorted = this.sortTimestamps(timestamps);
    return sorted[sorted.length - 1];
  }

  /**
   * Get oldest timestamp from array
   */
  static getOldestTimestamp(timestamps: string[]): string | null {
    if (timestamps.length === 0) {
      return null;
    }

    const sorted = this.sortTimestamps(timestamps);
    return sorted[0];
  }

  /**
   * Check if timestamp is within a specified range
   */
  static isTimestampInRange(
    timestamp: string,
    startDate?: Date,
    endDate: Date = new Date()
  ): boolean {
    const parsed = this.parseTimestamp(timestamp);

    if (!parsed.isValid) {
      return false;
    }

    const timestampDate = parsed.date;

    if (startDate && timestampDate < startDate) {
      return false;
    }

    if (timestampDate > endDate) {
      return false;
    }

    return true;
  }

  /**
   * Validate timestamp format (basic regex check)
   */
  static isValidTimestampFormat(timestamp: string): boolean {
    return this.TIMESTAMP_FORMAT.test(timestamp);
  }

  /**
   * Generate human-readable backup description
   */
  static generateBackupDescription(timestamp: string): string {
    const parsed = this.parseTimestamp(timestamp);

    if (!parsed.isValid) {
      return `Invalid backup (${timestamp})`;
    }

    const formatted = this.formatTimestamp(timestamp);
    const relative = this.formatRelativeTime(timestamp);

    return `Backup from ${formatted} (${relative})`;
  }
}
