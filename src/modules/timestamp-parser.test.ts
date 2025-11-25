import { describe, expect, test, beforeEach } from 'bun:test';
import { TimestampParser } from '../modules/timestamp-parser.js';

describe('Timestamp Parser Module', () => {
  describe('parseTimestamp', () => {
    test('should parse valid timestamp correctly', () => {
      const result = TimestampParser.parseTimestamp('20241125-143022');

      expect(result.isValid).toBe(true);
      expect(result.timestamp).toBe('20241125-143022');
      expect(result.year).toBe(2024);
      expect(result.month).toBe(11);
      expect(result.day).toBe(25);
      expect(result.hours).toBe(14);
      expect(result.minutes).toBe(30);
      expect(result.seconds).toBe(22);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid timestamp format', () => {
      const result = TimestampParser.parseTimestamp('invalid-timestamp');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject timestamp with invalid date', () => {
      const result = TimestampParser.parseTimestamp('20241325-143022'); // Invalid month

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject timestamp with invalid time', () => {
      const result = TimestampParser.parseTimestamp('20241125-256022'); // Invalid hour

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle edge case timestamps', () => {
      // New Year
      const result1 = TimestampParser.parseTimestamp('20000101-000000');
      expect(result1.isValid).toBe(true);

      // End of year
      const result2 = TimestampParser.parseTimestamp('20241231-235959');
      expect(result2.isValid).toBe(true);
    });
  });

  describe('generateTimestamp', () => {
    test('should generate valid timestamp format', () => {
      const timestamp = TimestampParser.generateTimestamp();
      const result = TimestampParser.parseTimestamp(timestamp);

      expect(result.isValid).toBe(true);
      expect(TimestampParser.isValidTimestampFormat(timestamp)).toBe(true);
    });

    test('should generate consistent timestamps for same date', () => {
      const date = new Date('2024-11-25T14:30:22Z');
      const timestamp1 = TimestampParser.generateTimestamp(date);
      const timestamp2 = TimestampParser.generateTimestamp(date);

      expect(timestamp1).toBe(timestamp2);
    });
  });

  describe('formatTimestamp', () => {
    test('should format timestamp for display', () => {
      const formatted = TimestampParser.formatTimestamp('20241125-143022');
      expect(formatted).toContain('11/25/2024');
      expect(formatted).toContain('14:30:22');
    });

    test('should handle invalid timestamp gracefully', () => {
      const formatted = TimestampParser.formatTimestamp('invalid');
      expect(formatted).toContain('Invalid timestamp');
    });

    test('should format with different options', () => {
      const timestamp = '20241125-143022';

      const withoutSeconds = TimestampParser.formatTimestamp(timestamp, { includeSeconds: false });
      expect(withoutSeconds).toContain('14:30');

      const twelveHour = TimestampParser.formatTimestamp(timestamp, { use24Hour: false });
      expect(twelveHour).toContain('02:30');
    });
  });

  describe('formatRelativeTime', () => {
    test('should format relative time correctly', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 3600000); // 1 hour ago
      const timestamp = TimestampParser.generateTimestamp(past);

      const relative = TimestampParser.formatRelativeTime(timestamp);
      expect(relative).toContain('hour');
      expect(relative).toContain('ago');
    });

    test('should handle future timestamps', () => {
      const future = new Date(Date.now() + 7200000); // 2 hours in future
      const timestamp = TimestampParser.generateTimestamp(future);

      const relative = TimestampParser.formatRelativeTime(timestamp);
      expect(relative).toContain('hour');
      expect(relative).toContain('in');
    });
  });

  describe('compareTimestamps', () => {
    test('should compare timestamps correctly', () => {
      const result = TimestampParser.compareTimestamps('20241125-143022', '20241125-143023');
      expect(result).toBeLessThan(0);

      const result2 = TimestampParser.compareTimestamps('20241125-143023', '20241125-143022');
      expect(result2).toBeGreaterThan(0);

      const result3 = TimestampParser.compareTimestamps('20241125-143022', '20241125-143022');
      expect(result3).toBe(0);
    });

    test('should throw error for invalid timestamps', () => {
      expect(() => {
        TimestampParser.compareTimestamps('invalid', '20241125-143022');
      }).toThrow();
    });
  });

  describe('sortTimestamps', () => {
    test('should sort timestamps from oldest to newest', () => {
      const timestamps = ['20241125-143022', '20241125-143020', '20241125-143025'];
      const sorted = TimestampParser.sortTimestamps(timestamps);

      expect(sorted).toEqual(['20241125-143020', '20241125-143022', '20241125-143025']);
    });
  });

  describe('getMostRecentTimestamp', () => {
    test('should return most recent timestamp', () => {
      const timestamps = ['20241125-143022', '20241125-143020', '20241125-143025'];
      const mostRecent = TimestampParser.getMostRecentTimestamp(timestamps);

      expect(mostRecent).toBe('20241125-143025');
    });

    test('should return null for empty array', () => {
      const mostRecent = TimestampParser.getMostRecentTimestamp([]);
      expect(mostRecent).toBeNull();
    });
  });

  describe('isTimestampInRange', () => {
    test('should check timestamp within range', () => {
      const timestamp = '20241125-143022';
      const startDate = new Date('2024-11-24T00:00:00Z');
      const endDate = new Date('2024-11-26T00:00:00Z');

      expect(TimestampParser.isTimestampInRange(timestamp, startDate, endDate)).toBe(true);
    });

    test('should reject timestamp outside range', () => {
      const timestamp = '20241125-143022';
      const startDate = new Date('2024-11-26T00:00:00Z');

      expect(TimestampParser.isTimestampInRange(timestamp, startDate)).toBe(false);
    });

    test('should handle invalid timestamp', () => {
      expect(TimestampParser.isTimestampInRange('invalid')).toBe(false);
    });
  });

  describe('isValidTimestampFormat', () => {
    test('should validate correct format', () => {
      expect(TimestampParser.isValidTimestampFormat('20241125-143022')).toBe(true);
      expect(TimestampParser.isValidTimestampFormat('20000101-000000')).toBe(true);
    });

    test('should reject incorrect format', () => {
      expect(TimestampParser.isValidTimestampFormat('2024/11/25 14:30:22')).toBe(false);
      expect(TimestampParser.isValidTimestampFormat('20241125143022')).toBe(false);
      expect(TimestampParser.isValidTimestampFormat('invalid')).toBe(false);
    });
  });

  describe('generateBackupDescription', () => {
    test('should generate human-readable description', () => {
      const description = TimestampParser.generateBackupDescription('20241125-143022');
      expect(description).toContain('Backup from');
      expect(description).toContain('11/25/2024');
    });

    test('should handle invalid timestamp', () => {
      const description = TimestampParser.generateBackupDescription('invalid');
      expect(description).toContain('Invalid backup');
    });
  });
});
