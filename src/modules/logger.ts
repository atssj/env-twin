/**
 * Logging Module
 *
 * This module provides comprehensive logging capabilities for the restore command.
 * It supports different log levels, file rotation, cross-platform compatibility,
 * and structured logging for better analysis and debugging.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  module?: string;
  operationId?: string;
}

export interface LoggerOptions {
  level?: LogLevel;
  enableConsole?: boolean;
  enableFile?: boolean;
  logFile?: string;
  maxFileSize?: number;
  maxFiles?: number;
  context?: Record<string, any>;
}

/**
 * Enhanced logger with file rotation and structured logging
 */
export class Logger {
  private static instance: Logger;
  private level: LogLevel;
  private enableConsole: boolean;
  private enableFile: boolean;
  private logFile: string;
  private maxFileSize: number;
  private maxFiles: number;
  private context: Record<string, any>;
  private operationId: string;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.enableConsole = options.enableConsole ?? true;
    this.enableFile = options.enableFile ?? false;
    this.logFile = options.logFile ?? '.env-twin/restore.log';
    this.maxFileSize = options.maxFileSize ?? 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles ?? 5;
    this.context = options.context ?? {};
    this.operationId = this.generateOperationId();
  }

  static getInstance(options?: LoggerOptions): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(options);
    }
    return Logger.instance;
  }

  /**
   * Generate unique operation ID for tracking
   */
  private generateOperationId(): string {
    return `restore-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current operation ID
   */
  getOperationId(): string {
    return this.operationId;
  }

  /**
   * Set logging level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Add context to all subsequent log entries
   */
  addContext(key: string, value: any): void {
    this.context[key] = value;
  }

  /**
   * Remove context entry
   */
  removeContext(key: string): void {
    delete this.context[key];
  }

  /**
   * Clear all context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.DEBUG, message, context, error);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.INFO, message, context, error);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.WARN, message, context, error);
  }

  /**
   * Log error message
   */
  error(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log fatal message
   */
  fatal(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.FATAL, message, context, error);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (level < this.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: LogLevel[level],
      message,
      context: { ...this.context, ...context },
      module: 'restore',
      operationId: this.operationId
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    // Log to console if enabled
    if (this.enableConsole) {
      this.logToConsole(entry);
    }

    // Log to file if enabled
    if (this.enableFile) {
      this.logToFile(entry).catch(err => {
        // Silent fail for file logging to avoid console spam
        if (this.enableConsole) {
          this.logToConsole({
            ...entry,
            level: LogLevel.ERROR,
            message: `Failed to write to log file: ${err instanceof Error ? err.message : String(err)}`
          });
        }
      });
    }
  }

  /**
   * Log to console with appropriate formatting
   */
  private logToConsole(entry: LogEntry): void {
    const formatted = this.formatEntry(entry);

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formatted);
        break;
    }
  }

  /**
   * Log to file with rotation
   */
  private async logToFile(entry: LogEntry): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');

      // Ensure log directory exists
      const logDir = path.dirname(this.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Check file size and rotate if necessary
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        if (stats.size >= this.maxFileSize) {
          await this.rotateLogFile();
        }
      }

      // Write log entry
      const formatted = this.formatEntry(entry) + '\n';
      fs.appendFileSync(this.logFile, formatted);

    } catch (error) {
      // Re-throw to be handled by caller
      throw error;
    }
  }

  /**
   * Rotate log file when it exceeds size limit
   */
  private async rotateLogFile(): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');

      // Remove oldest log file if we have too many
      const logPattern = this.logFile.replace('.log', '.log.');
      const existingFiles: string[] = [];

      for (let i = this.maxFiles; i > 0; i--) {
        const rotatedFile = `${logPattern}${i}`;
        if (fs.existsSync(rotatedFile)) {
          existingFiles.push(rotatedFile);
        }
      }

      // Rotate files (rename .log.N to .log.N+1, etc.)
      for (let i = existingFiles.length; i >= 1; i--) {
        const oldFile = `${logPattern}${i}`;
        const newFile = `${logPattern}${i + 1}`;

        if (fs.existsSync(oldFile)) {
          if (i + 1 > this.maxFiles) {
            fs.unlinkSync(oldFile); // Remove oldest file
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }

      // Move current log to .log.1
      if (fs.existsSync(this.logFile)) {
        fs.renameSync(this.logFile, `${logPattern}1`);
      }

    } catch (error) {
      // Silent fail for rotation
    }
  }

  /**
   * Format log entry for output
   */
  private formatEntry(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.levelName.padEnd(5);
    const operation = (entry.operationId || 'unknown').substring(0, 8);

    let formatted = `[${timestamp}] [${level}] [${operation}] ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = JSON.stringify(entry.context, null, 2);
      formatted += `\n  Context: ${contextStr}`;
    }

    if (entry.error) {
      formatted += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        formatted += `\n  Stack: ${entry.error.stack}`;
      }
    }

    return formatted;
  }

  /**
   * Create child logger with additional context
   */
  child(context: Record<string, any>): Logger {
    const childLogger = new Logger({
      level: this.level,
      enableConsole: this.enableConsole,
      enableFile: this.enableFile,
      logFile: this.logFile,
      maxFileSize: this.maxFileSize,
      maxFiles: this.maxFiles,
      context: { ...this.context, ...context }
    });

    childLogger.operationId = this.operationId;
    return childLogger;
  }

  /**
   * Create operation-specific logger
   */
  operation(operationId: string, context?: Record<string, any>): Logger {
    const opLogger = this.child({ operationId, ...context });
    opLogger.operationId = operationId;
    return opLogger;
  }

  /**
   * Log restore operation start
   */
  logRestoreStart(timestamp?: string, files?: string[]): void {
    this.info('Restore operation started', {
      targetTimestamp: timestamp,
      files,
      fileCount: files?.length || 0
    });
  }

  /**
   * Log restore operation completion
   */
  logRestoreComplete(success: boolean, restored: number, failed: number, errors?: string[]): void {
    this.info('Restore operation completed', {
      success,
      restoredFiles: restored,
      failedFiles: failed,
      errors
    });
  }

  /**
   * Log file operation details
   */
  logFileOperation(operation: 'backup' | 'restore' | 'validate' | 'rollback', fileName: string, success: boolean, details?: Record<string, any>): void {
    this.info(`File ${operation}: ${fileName}`, {
      operation,
      fileName,
      success,
      ...details
    });
  }

  /**
   * Log validation results
   */
  logValidationResults(timestamp: string, isValid: boolean, errors: string[], warnings: string[]): void {
    this.info(`Backup validation completed for ${timestamp}`, {
      timestamp,
      isValid,
      errorCount: errors.length,
      warningCount: warnings.length,
      errors,
      warnings
    });
  }

  /**
   * Log rollback operation
   */
  logRollback(rollbackId: string, success: boolean, filesRolledBack?: string[], error?: string): void {
    const logLevel = success ? LogLevel.INFO : LogLevel.WARN;
    this.log(logLevel, `Rollback operation ${success ? 'completed' : 'failed'}`, {
      rollbackId,
      success,
      filesRolledBack,
      error
    });
  }

  /**
   * Log progress update
   */
  logProgress(current: number, total: number, phase: string, currentFile?: string): void {
    this.debug('Restore progress update', {
      current,
      total,
      percentage: Math.round((current / total) * 100),
      phase,
      currentFile
    });
  }

  /**
   * Get log file path
   */
  getLogFilePath(): string {
    return this.logFile;
  }

  /**
   * Check if logging is enabled for a specific level
   */
  isLevelEnabled(level: LogLevel): boolean {
    return level >= this.level;
  }
}

/**
 * Global logger instance
 */
export const logger = Logger.getInstance({
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableFile: true
});

/**
 * Utility functions for common logging scenarios
 */
export class RestoreLogger {
  private logger: Logger;

  constructor(operationId?: string) {
    this.logger = operationId ? logger.operation(operationId) : logger;
  }

  /**
   * Log discovery phase
   */
  logBackupDiscovery(backupCount: number, validCount: number): void {
    this.logger.info(`Discovered ${backupCount} backups (${validCount} valid)`, {
      totalBackups: backupCount,
      validBackups: validCount
    });
  }

  /**
   * Log most recent backup selection
   */
  logMostRecentSelection(timestamp: string): void {
    this.logger.info(`Selected most recent backup: ${timestamp}`, {
      selectedTimestamp: timestamp
    });
  }

  /**
   * Log user confirmation
   */
  logUserConfirmation(userConfirmed: boolean): void {
    this.logger.info(`User ${userConfirmed ? 'confirmed' : 'cancelled'} restore operation`, {
      userConfirmed
    });
  }

  /**
   * Log file permissions preservation
   */
  logPermissionsPreservation(fileName: string, preserved: boolean): void {
    this.logger.debug(`File permissions ${preserved ? 'preserved' : 'not preserved'} for ${fileName}`, {
      fileName,
      preserved
    });
  }

  /**
   * Log cross-platform compatibility info
   */
  logPlatformInfo(): void {
    const platform = process.platform;
    const arch = process.arch;

    this.logger.info(`Running on platform: ${platform} (${arch})`, {
      platform,
      architecture: arch,
      supportsPermissions: platform !== 'win32'
    });
  }
}
