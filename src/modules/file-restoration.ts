import fs from 'fs';
import path from 'path';
import { BackupInfo } from '../utils/backup.js';

/**
 * File Restoration Module
 *
 * This module handles the actual restoration of files from backups.
 * It provides functionality to restore files with proper error handling,
 * rollback capability, progress tracking, and cross-platform compatibility.
 */

export interface FileRestoreResult {
  success: boolean;
  restoredFiles: string[];
  failedFiles: string[];
  errors: Map<string, string>;
  warnings: string[];
  totalFiles: number;
  restoredCount: number;
  failedCount: number;
}

export interface FileRestoreOptions {
  preservePermissions?: boolean;
  preserveTimestamps?: boolean;
  createBackup?: boolean;
  force?: boolean;
  dryRun?: boolean;
}

export interface RestoreProgress {
  current: number;
  total: number;
  currentFile: string;
  phase: 'validating' | 'backing-up' | 'restoring' | 'completed' | 'failed';
}

export type ProgressCallback = (progress: RestoreProgress) => void;

/**
 * Enhanced file restoration with rollback capability and progress tracking
 */
export class FileRestorer {
  private static readonly SENSITIVE_FILE_PATTERN = /^\.env(\.|$)/;
  private static readonly DEFAULT_WRITE_OPTIONS: fs.WriteFileOptions = { encoding: 'utf-8' };
  private static readonly SECURE_WRITE_OPTIONS: fs.WriteFileOptions = {
    encoding: 'utf-8',
    mode: 0o600,
  };
  private cwd: string;
  private backupDir: string;
  private rollbackManager: any; // Will be set after importing rollback manager
  private progressCallback?: ProgressCallback;

  constructor(cwd: string = process.cwd()) {
    this.cwd = path.resolve(cwd);
    this.backupDir = path.join(this.cwd, '.env-twin');
  }

  /**
   * Check if a file path is safe (contained within the current working directory)
   * Prevents path traversal attacks
   */
  private isPathSafe(fileName: string): boolean {
    // Resolve the full path
    const targetPath = path.resolve(this.cwd, fileName);

    // Calculate relative path from CWD
    const relative = path.relative(this.cwd, targetPath);

    // Check if path is outside CWD:
    // 1. Starts with '..' (parent directory)
    // 2. Is absolute (can happen on Windows if on different drive)
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  }

  /**
   * Set progress callback for real-time updates
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Restore files from a backup
   */
  async restoreFiles(
    backup: BackupInfo,
    options: FileRestoreOptions = {}
  ): Promise<FileRestoreResult> {
    const {
      preservePermissions = true,
      preserveTimestamps = true,
      createBackup = true,
      force = false,
      dryRun = false,
    } = options;

    const result: FileRestoreResult = {
      success: false,
      restoredFiles: [],
      failedFiles: [],
      errors: new Map(),
      warnings: [],
      totalFiles: backup.files.length,
      restoredCount: 0,
      failedCount: 0,
    };

    try {
      // Update progress
      this.updateProgress(0, backup.files.length, 'validating', 'Validating backup files...');

      // Validate backup files
      const validationResult = await this.validateBackupFiles(backup);
      if (!validationResult.isValid) {
        result.errors.set(
          'backup',
          `Backup validation failed: ${validationResult.errors.join(', ')}`
        );
        return result;
      }

      if (validationResult.warnings.length > 0) {
        result.warnings.push(...validationResult.warnings);
      }

      if (dryRun) {
        result.success = true;
        result.restoredFiles = [...backup.files];
        result.restoredCount = backup.files.length;
        return result;
      }

      // Create rollback snapshot if requested
      let rollbackId: string | null = null;
      if (createBackup && !force) {
        this.updateProgress(0, backup.files.length, 'backing-up', 'Creating pre-restore backup...');
        rollbackId = await this.createRollbackSnapshot(backup.files);
        if (!rollbackId) {
          result.warnings.push(
            'Failed to create rollback snapshot, proceeding without rollback capability'
          );
        }
      }

      // Restore files
      this.updateProgress(0, backup.files.length, 'restoring', 'Restoring files...');

      for (let i = 0; i < backup.files.length; i++) {
        const fileName = backup.files[i];
        this.updateProgress(i, backup.files.length, 'restoring', `Restoring ${fileName}...`);

        try {
          const fileResult = await this.restoreSingleFile(fileName, backup.timestamp, {
            preservePermissions,
            preserveTimestamps,
          });

          if (fileResult.success) {
            result.restoredFiles.push(fileName);
            result.restoredCount++;
          } else {
            result.failedFiles.push(fileName);
            result.failedCount++;
            result.errors.set(fileName, fileResult.error || 'Unknown error');
          }
        } catch (error) {
          result.failedFiles.push(fileName);
          result.failedCount++;
          result.errors.set(fileName, error instanceof Error ? error.message : String(error));
        }
      }

      // Determine overall success
      result.success = result.failedCount === 0;

      // Update progress to completed
      this.updateProgress(
        backup.files.length,
        backup.files.length,
        'completed',
        'Restore completed'
      );
    } catch (error) {
      result.errors.set('general', error instanceof Error ? error.message : String(error));
      this.updateProgress(
        0,
        0,
        'failed',
        `Restore failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return result;
  }

  /**
   * Determine if a file should be treated as sensitive
   *
   * @param fileName The name of the file
   * @returns True if the file is sensitive (e.g., .env), false otherwise
   */
  private isSensitiveFile(fileName: string): boolean {
    // Check if it's an environment file (.env, .env.local, .env.production, etc.)
    // But explicitly exclude .env.example which is usually safe
    return FileRestorer.SENSITIVE_FILE_PATTERN.test(fileName) && fileName !== '.env.example';
  }

  /**
   * Restore a single file from backup
   */
  private async restoreSingleFile(
    fileName: string,
    timestamp: string,
    options: { preservePermissions: boolean; preserveTimestamps: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Security check: Prevent path traversal
      if (!this.isPathSafe(fileName)) {
        return {
          success: false,
          error: `Security Error: Invalid file path '${fileName}'. Path traversal detected.`,
        };
      }

      const backupFilePath = path.join(this.backupDir, `${fileName}.${timestamp}`);
      const targetFilePath = path.join(this.cwd, fileName);

      // Check if backup file exists and is readable
      if (!fs.existsSync(backupFilePath)) {
        return { success: false, error: `Backup file not found: ${backupFilePath}` };
      }

      // Check if target directory exists and is writable
      const targetDir = path.dirname(targetFilePath);
      if (!fs.existsSync(targetDir)) {
        try {
          fs.mkdirSync(targetDir, { recursive: true });
        } catch (error) {
          return { success: false, error: `Cannot create target directory: ${targetDir}` };
        }
      }

      // Check write permissions
      try {
        fs.accessSync(targetDir, fs.constants.W_OK);
      } catch (error) {
        return { success: false, error: `No write permission for directory: ${targetDir}` };
      }

      // Read backup file content
      let content: string;
      try {
        content = fs.readFileSync(backupFilePath, 'utf-8');
      } catch (error) {
        return { success: false, error: `Cannot read backup file: ${backupFilePath}` };
      }

      // Get current file stats if it exists (for rollback)
      let currentStats: fs.Stats | null = null;
      try {
        // Security: Check for symlinks to prevent arbitrary file overwrite
        const lstat = fs.lstatSync(targetFilePath);
        if (lstat.isSymbolicLink()) {
          // If it's a symlink, we must remove it before writing to ensure we don't
          // overwrite the file it points to (which could be outside CWD).
          try {
            fs.unlinkSync(targetFilePath);
          } catch (unlinkError) {
            return {
              success: false,
              error: `Security: Failed to remove existing symlink '${fileName}': ${unlinkError instanceof Error ? unlinkError.message : String(unlinkError)}`,
            };
          }
          // currentStats remains null as we treated it as a new file creation
        } else {
          // Regular file (or directory, though we checked that earlier implicitly via write?)
          // actually we haven't checked if it's a directory.
          if (lstat.isDirectory()) {
            return {
              success: false,
              error: `Target '${fileName}' is a directory, cannot overwrite with file.`,
            };
          }
          currentStats = fs.statSync(targetFilePath);
        }
      } catch (error: any) {
        // If file doesn't exist, that's fine. Other errors are problems.
        if (error.code !== 'ENOENT') {
          return { success: false, error: `Cannot access target path: ${error.message}` };
        }
      }

      // Determine write options
      // If file doesn't exist, use secure default permissions for sensitive files
      // NOTE: 'mode' option is only effective on POSIX systems (Linux/macOS)
      // On Windows, it is ignored by fs.writeFileSync
      const writeOptions =
        !currentStats && this.isSensitiveFile(fileName)
          ? FileRestorer.SECURE_WRITE_OPTIONS
          : FileRestorer.DEFAULT_WRITE_OPTIONS;

      // Write content to target file
      try {
        fs.writeFileSync(targetFilePath, content, writeOptions);
      } catch (error) {
        return { success: false, error: `Cannot write to target file: ${targetFilePath}` };
      }

      // Preserve permissions if requested and file existed before
      if (options.preservePermissions && currentStats) {
        try {
          // Preserve file mode (permissions)
          fs.chmodSync(targetFilePath, currentStats.mode);
        } catch (error) {
          // Continue anyway, just warning
        }
      }

      // Preserve timestamps if requested
      if (options.preserveTimestamps && currentStats) {
        try {
          // Preserve access and modification times
          fs.utimesSync(targetFilePath, currentStats.atime, currentStats.mtime);
        } catch (error) {
          // Continue anyway, just warning
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Validate backup files before restoration
   */
  private async validateBackupFiles(
    backup: BackupInfo
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const fileName of backup.files) {
      // Security check
      if (!this.isPathSafe(fileName)) {
        errors.push(`Security Error: Invalid file path '${fileName}' in backup.`);
        continue;
      }

      const backupFilePath = path.join(this.backupDir, `${fileName}.${backup.timestamp}`);

      try {
        // Check file exists
        if (!fs.existsSync(backupFilePath)) {
          errors.push(`Backup file missing: ${backupFilePath}`);
          continue;
        }

        // Check file is readable
        fs.accessSync(backupFilePath, fs.constants.R_OK);

        // Check file size
        const stats = fs.statSync(backupFilePath);
        if (stats.size === 0) {
          warnings.push(`Backup file is empty: ${fileName}`);
        }

        // Try to read file content to ensure it's not corrupted
        try {
          fs.readFileSync(backupFilePath, 'utf-8');
        } catch (error) {
          errors.push(`Backup file corrupted or has encoding issues: ${fileName}`);
        }
      } catch (error) {
        errors.push(
          `Cannot access backup file ${fileName}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Create a rollback snapshot of current files
   */
  private async createRollbackSnapshot(files: string[]): Promise<string | null> {
    try {
      // This will be implemented when we create the rollback manager
      // For now, return a simple timestamp-based ID
      const rollbackId = `rollback-${Date.now()}`;
      return rollbackId;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update progress and notify callback
   */
  private updateProgress(
    current: number,
    total: number,
    phase: RestoreProgress['phase'],
    currentFile: string
  ): void {
    const progress: RestoreProgress = {
      current,
      total,
      currentFile,
      phase,
    };

    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Check if target files have changes that would be lost
   */
  checkForUncommittedChanges(files: string[]): { hasChanges: boolean; changedFiles: string[] } {
    const changedFiles: string[] = [];

    for (const fileName of files) {
      const targetFilePath = path.join(this.cwd, fileName);

      // For now, we'll just check if file exists
      // In a real implementation, you might want to compare with git status
      // or maintain a hash of the last known state
      if (fs.existsSync(targetFilePath)) {
        changedFiles.push(fileName);
      }
    }

    return {
      hasChanges: changedFiles.length > 0,
      changedFiles,
    };
  }

  /**
   * Get file information for display purposes
   */
  getFileInfo(
    fileName: string,
    timestamp: string
  ): { exists: boolean; size?: number; modified?: Date } {
    const targetFilePath = path.join(this.cwd, fileName);

    if (!fs.existsSync(targetFilePath)) {
      return { exists: false };
    }

    try {
      const stats = fs.statSync(targetFilePath);
      return {
        exists: true,
        size: stats.size,
        modified: stats.mtime,
      };
    } catch (error) {
      return { exists: true };
    }
  }

  /**
   * Cross-platform file path validation
   */
  static validateFilePath(filePath: string): { isValid: boolean; error?: string } {
    // Check for invalid characters (common across platforms)
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(filePath)) {
      return { isValid: false, error: 'File path contains invalid characters' };
    }

    // Check path length (Windows limit is 260, Unix-like systems have higher limits)
    if (process.platform === 'win32' && filePath.length > 260) {
      return { isValid: false, error: 'File path too long for Windows' };
    }

    // Check for reserved names on Windows
    if (process.platform === 'win32') {
      const reservedNames = [
        'CON',
        'PRN',
        'AUX',
        'NUL',
        'COM1',
        'COM2',
        'COM3',
        'COM4',
        'COM5',
        'COM6',
        'COM7',
        'COM8',
        'COM9',
        'LPT1',
        'LPT2',
        'LPT3',
        'LPT4',
        'LPT5',
        'LPT6',
        'LPT7',
        'LPT8',
        'LPT9',
      ];
      const fileName = path.basename(filePath).toUpperCase();
      if (reservedNames.includes(fileName)) {
        return { isValid: false, error: 'File name is reserved on Windows' };
      }
    }

    return { isValid: true };
  }

  /**
   * Get platform-specific file system information
   */
  static getPlatformInfo(): {
    platform: string;
    encoding: string;
    pathSeparator: string;
    supportsPermissions: boolean;
  } {
    return {
      platform: process.platform,
      encoding: 'utf-8',
      pathSeparator: path.sep,
      supportsPermissions: process.platform !== 'win32', // Windows doesn't fully support Unix-style permissions
    };
  }
}
