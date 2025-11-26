import fs from 'fs';
import path from 'path';
import { listBackups, BackupInfo } from '../utils/backup.js';

/**
 * Backup Discovery Module
 *
 * This module handles the discovery and validation of backup files.
 * It provides functionality to automatically find the most recent backup
 * and validate backup integrity across different platforms.
 */

export interface ValidatedBackup extends BackupInfo {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileStats: Map<string, fs.Stats>;
}

/**
 * Backup validation result containing detailed information about each file
 */
export interface BackupValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedBackups: ValidatedBackup[];
}

/**
 * Cross-platform backup discovery and validation
 */
export class BackupDiscovery {
  private cwd: string;
  private backupDir: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = path.resolve(cwd);
    this.backupDir = path.join(this.cwd, '.env-twin');
  }

  /**
   * Discover all available backups and validate their integrity
   */
  discoverAndValidateBackups(): BackupValidationResult {
    const result: BackupValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      validatedBackups: [],
    };

    try {
      // Check if backup directory exists
      if (!fs.existsSync(this.backupDir)) {
        result.errors.push('Backup directory .env-twin/ not found');
        result.isValid = false;
        return result;
      }

      // Check if backup directory is readable
      try {
        fs.accessSync(this.backupDir, fs.constants.R_OK);
      } catch (error) {
        result.errors.push(
          `Backup directory not readable: ${error instanceof Error ? error.message : String(error)}`
        );
        result.isValid = false;
        return result;
      }

      // Get list of backups
      const backups = listBackups(this.cwd);

      if (backups.length === 0) {
        result.warnings.push('No backups found in .env-twin/ directory');
        return result;
      }

      // Validate each backup
      for (const backup of backups) {
        const validatedBackup = this.validateBackup(backup);
        result.validatedBackups.push(validatedBackup);

        if (!validatedBackup.isValid) {
          result.isValid = false;
          result.errors.push(...validatedBackup.errors);
        }

        if (validatedBackup.errors.length > 0) {
          result.warnings.push(
            `Backup ${backup.timestamp} has issues: ${validatedBackup.errors.join(', ')}`
          );
        }
      }
    } catch (error) {
      result.errors.push(
        `Failed to discover backups: ${error instanceof Error ? error.message : String(error)}`
      );
      result.isValid = false;
    }

    return result;
  }

  /**
   * Find the most recent valid backup
   */
  findMostRecentValidBackup(): BackupInfo | null {
    const result = this.discoverAndValidateBackups();
    const validBackups = result.validatedBackups.filter(b => b.isValid);

    if (validBackups.length === 0) {
      return null;
    }

    // Sort by createdAt (most recent first) and return the first one
    return validBackups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }

  /**
   * Get backup by timestamp with validation
   */
  getBackupByTimestamp(timestamp: string): ValidatedBackup | null {
    const result = this.discoverAndValidateBackups();
    const backup = result.validatedBackups.find(b => b.timestamp === timestamp);
    return backup || null;
  }

  /**
   * Validate a single backup for integrity and accessibility
   */
  private validateBackup(backup: BackupInfo): ValidatedBackup {
    const validatedBackup: ValidatedBackup = {
      ...backup,
      isValid: true,
      errors: [],
      warnings: [],
      fileStats: new Map(),
    };

    // Validate each file in the backup
    for (const fileName of backup.files) {
      try {
        const filePath = path.join(this.backupDir, `${fileName}.${backup.timestamp}`);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          validatedBackup.errors.push(`File ${fileName} is missing from backup`);
          validatedBackup.isValid = false;
          continue;
        }

        // Get file stats
        const stats = fs.statSync(filePath);
        validatedBackup.fileStats.set(fileName, stats);

        // Check if file is readable
        try {
          fs.accessSync(filePath, fs.constants.R_OK);
        } catch (error) {
          validatedBackup.errors.push(
            `File ${fileName} is not readable: ${error instanceof Error ? error.message : String(error)}`
          );
          validatedBackup.isValid = false;
          continue;
        }

        // Check file size (should not be 0 for non-empty original files)
        if (stats.size === 0) {
          validatedBackup.warnings.push(`File ${fileName} is empty in backup`);
        }

        // Validate timestamp format
        if (!this.isValidTimestampFormat(backup.timestamp)) {
          validatedBackup.errors.push(`Invalid timestamp format: ${backup.timestamp}`);
          validatedBackup.isValid = false;
        }
      } catch (error) {
        validatedBackup.errors.push(
          `Failed to validate file ${fileName}: ${error instanceof Error ? error.message : String(error)}`
        );
        validatedBackup.isValid = false;
      }
    }

    return validatedBackup;
  }

  /**
   * Check if timestamp follows the expected format (YYYYMMDD-HHMMSS)
   */
  private isValidTimestampFormat(timestamp: string): boolean {
    const timestampRegex = /^\d{8}-\d{6}$/;
    return timestampRegex.test(timestamp);
  }

  /**
   * Check if backup directory is accessible for writing (needed for operations)
   */
  checkBackupDirectoryWriteAccess(): boolean {
    try {
      fs.accessSync(this.backupDir, fs.constants.W_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * List all available backup timestamps for user selection
   */
  listAvailableTimestamps(): string[] {
    const result = this.discoverAndValidateBackups();
    return result.validatedBackups
      .filter(b => b.isValid)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(b => b.timestamp);
  }

  /**
   * Get backup directory path
   */
  getBackupDirectory(): string {
    return this.backupDir;
  }
}

/**
 * Utility function to check if a timestamp is valid
 */
export function isValidTimestamp(timestamp: string): boolean {
  const timestampRegex = /^\d{8}-\d{6}$/;
  if (!timestampRegex.test(timestamp)) {
    return false;
  }

  try {
    const year = parseInt(timestamp.substring(0, 4), 10);
    const month = parseInt(timestamp.substring(4, 6), 10);
    const day = parseInt(timestamp.substring(6, 8), 10);
    const hours = parseInt(timestamp.substring(9, 11), 10);
    const minutes = parseInt(timestamp.substring(11, 13), 10);
    const seconds = parseInt(timestamp.substring(13, 15), 10);

    // Basic date validation
    if (
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31 ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59 ||
      seconds < 0 ||
      seconds > 59
    ) {
      return false;
    }

    // Create a date object to validate the date
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  } catch (error) {
    return false;
  }
}
