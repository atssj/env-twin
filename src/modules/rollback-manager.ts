import fs from 'fs';
import path from 'path';
import { writeFileSyncAtomic } from '../utils/atomic-fs.js';

/**
 * Rollback Management Module
 *
 * This module handles the creation and management of rollback snapshots
 * for the restore operation. It provides functionality to create pre-restore
 * state snapshots and rollback to previous state if restoration fails.
 */

export interface RollbackSnapshot {
  id: string;
  timestamp: string;
  createdAt: Date;
  files: RollbackFile[];
  cwd: string;
}

export type PartialStats = Pick<fs.Stats, 'mtime' | 'mtimeMs'>;

export interface RollbackFile {
  fileName: string;
  filePath: string;
  exists: boolean;
  size?: number;
  content?: string;
  permissions?: fs.Mode;
  stats?: fs.Stats | PartialStats;
}

export interface RollbackResult {
  success: boolean;
  snapshotId?: string;
  error?: string;
  rolledBackFiles?: string[];
}

export interface RollbackOptions {
  includeContent?: boolean; // Include file content (larger but more reliable)
  includePermissions?: boolean; // Include file permissions
  compress?: boolean; // Compress content to save space
  maxSize?: number; // Maximum size per file to include (in bytes)
}

/**
 * Enhanced rollback manager with cross-platform support
 */
export class RollbackManager {
  private cwd: string;
  private rollbackDir: string;
  private maxSnapshots: number;

  constructor(cwd: string = process.cwd(), maxSnapshots: number = 10) {
    this.cwd = path.resolve(cwd);
    this.rollbackDir = path.join(this.cwd, '.env-twin', 'rollbacks');
    this.maxSnapshots = maxSnapshots;
  }

  /**
   * Check if a file path is safe (contained within the current working directory)
   * Prevents path traversal attacks
   */
  private isPathSafe(fileName: string): boolean {
    const targetPath = path.resolve(this.cwd, fileName);
    const relative = path.relative(this.cwd, targetPath);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  }

  /**
   * Create a rollback snapshot of specified files
   */
  createSnapshot(files: string[], options: RollbackOptions = {}): Promise<RollbackSnapshot> {
    const {
      includeContent = true,
      includePermissions = true,
      compress = false,
      maxSize = 1024 * 1024, // 1MB default
    } = options;

    return new Promise((resolve, reject) => {
      try {
        const snapshotId = this.generateSnapshotId();
        const createdAt = new Date();
        const timestamp = createdAt.toISOString();

        const snapshot: RollbackSnapshot = {
          id: snapshotId,
          timestamp,
          createdAt,
          files: [],
          cwd: this.cwd,
        };

        // Ensure rollback directory exists
        this.ensureRollbackDirectory();

        // Create snapshot directory for this snapshot
        const snapshotDir = path.join(this.rollbackDir, snapshotId);
        if (!fs.existsSync(snapshotDir)) {
          fs.mkdirSync(snapshotDir, { recursive: true, mode: 0o700 });
        }

        // Process each file
        const processFile = (fileName: string): Promise<RollbackFile> => {
          return new Promise(resolveFile => {
            // Security check: Prevent path traversal
            if (!this.isPathSafe(fileName)) {
              // We return a "non-existent" file for unsafe paths to skip them safely
              // In a real app we might want to log this violation
              resolveFile({
                fileName,
                filePath: path.join(this.cwd, fileName),
                exists: false
              });
              return;
            }

            const filePath = path.join(this.cwd, fileName);
            const rollbackFile: RollbackFile = {
              fileName,
              filePath,
              exists: fs.existsSync(filePath),
            };

            if (!rollbackFile.exists) {
              resolveFile(rollbackFile);
              return;
            }

            try {
              // Get file stats
              const stats = fs.statSync(filePath);
              rollbackFile.size = stats.size;
              rollbackFile.stats = stats;

              if (includePermissions && process.platform !== 'win32') {
                rollbackFile.permissions = stats.mode;
              }

              // Read file content if requested and file is small enough
              if (includeContent && stats.size <= maxSize) {
                try {
                  rollbackFile.content = fs.readFileSync(filePath, 'utf-8');
                } catch (error) {
                  // Continue without content if read fails
                }
              }

              resolveFile(rollbackFile);
            } catch (error) {
              resolveFile(rollbackFile);
            }
          });
        };

        // Process all files
        Promise.all(files.map(processFile))
          .then(processedFiles => {
            snapshot.files = processedFiles;

            // Save file contents to snapshot directory
            for (const file of processedFiles) {
              if (file.content) {
                const contentPath = path.join(snapshotDir, file.fileName);
                const contentDir = path.dirname(contentPath);
                if (!fs.existsSync(contentDir)) {
                  fs.mkdirSync(contentDir, { recursive: true, mode: 0o700 });
                }
                writeFileSyncAtomic(contentPath, file.content, { encoding: 'utf-8', mode: 0o600 });
              }
            }

            // Save snapshot metadata
            const metadataPath = path.join(snapshotDir, 'metadata.json');
            const metadata = {
              id: snapshot.id,
              timestamp: snapshot.timestamp,
              createdAt: snapshot.createdAt.toISOString(),
              files: snapshot.files.map(f => ({
                fileName: f.fileName,
                exists: f.exists,
                size: f.size,
                permissions: f.permissions,
                hasContent: !!f.content,
                mtimeMs: f.stats ? f.stats.mtimeMs : undefined,
              })),
              cwd: snapshot.cwd,
              options,
            };

            writeFileSyncAtomic(metadataPath, JSON.stringify(metadata, null, 2), {
              encoding: 'utf-8',
              mode: 0o600,
            });

            // Clean up old snapshots if necessary
            this.cleanupOldSnapshots();

            resolve(snapshot);
          })
          .catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Rollback to a specific snapshot
   */
  async rollbackToSnapshot(snapshotId: string): Promise<RollbackResult> {
    try {
      const snapshotDir = path.join(this.rollbackDir, snapshotId);

      if (!fs.existsSync(snapshotDir)) {
        return {
          success: false,
          error: `Rollback snapshot ${snapshotId} not found`,
        };
      }

      // Load snapshot metadata
      const metadataPath = path.join(snapshotDir, 'metadata.json');
      if (!fs.existsSync(metadataPath)) {
        return {
          success: false,
          error: `Rollback snapshot metadata not found for ${snapshotId}`,
        };
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      const snapshot: RollbackSnapshot = {
        id: metadata.id,
        timestamp: metadata.timestamp,
        createdAt: new Date(metadata.createdAt),
        files: [], // We'll reload files from individual files
        cwd: metadata.cwd,
      };

      const rolledBackFiles: string[] = [];

      // Process each file in the snapshot
      for (const fileInfo of metadata.files) {
        try {
          // Security check: Prevent path traversal during restore
          if (!this.isPathSafe(fileInfo.fileName)) {
            continue;
          }

          const filePath = path.join(this.cwd, fileInfo.fileName);

          if (fileInfo.exists && fileInfo.hasContent) {
            // Restore file from snapshot content
            const contentPath = path.join(snapshotDir, fileInfo.fileName);
            if (fs.existsSync(contentPath)) {
              const content = fs.readFileSync(contentPath, 'utf-8');

              // Ensure directory exists
              const dir = path.dirname(filePath);
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }

              // Write file (Atomic with permissions if available)
              writeFileSyncAtomic(filePath, content, {
                encoding: 'utf-8',
                mode: fileInfo.permissions
              });

              rolledBackFiles.push(fileInfo.fileName);
            }
          } else if (!fileInfo.exists) {
            // File didn't exist in snapshot, remove if it exists now
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              rolledBackFiles.push(fileInfo.fileName);
            }
          }
        } catch (error) {
          // Continue with other files
        }
      }

      return {
        success: true,
        snapshotId,
        rolledBackFiles,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * List available rollback snapshots
   */
  listSnapshots(): RollbackSnapshot[] {
    try {
      if (!fs.existsSync(this.rollbackDir)) {
        return [];
      }

      const snapshots: RollbackSnapshot[] = [];

      const entries = fs.readdirSync(this.rollbackDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const snapshotId = entry.name;
          const metadataPath = path.join(this.rollbackDir, snapshotId, 'metadata.json');

          if (fs.existsSync(metadataPath)) {
            try {
              const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
              snapshots.push({
                id: metadata.id,
                timestamp: metadata.timestamp,
                createdAt: new Date(metadata.createdAt),
                files: (metadata.files || []).map((f: any) => this.reconstructSnapshotFile(f)),
                cwd: metadata.cwd,
              });
            } catch (error) {
              // Skip invalid snapshots
            }
          }
        }
      }

      // Sort by creation date (newest first)
      return snapshots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      return [];
    }
  }

  /**
   * Get snapshot by ID
   */
  getSnapshot(snapshotId: string): RollbackSnapshot | null {
    try {
      const snapshotDir = path.join(this.rollbackDir, snapshotId);
      const metadataPath = path.join(snapshotDir, 'metadata.json');

      if (!fs.existsSync(metadataPath)) {
        return null;
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

      return {
        id: metadata.id,
        timestamp: metadata.timestamp,
        createdAt: new Date(metadata.createdAt),
        files: (metadata.files || []).map((f: any) => this.reconstructSnapshotFile(f)),
        cwd: metadata.cwd,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete a specific snapshot
   */
  deleteSnapshot(snapshotId: string): boolean {
    try {
      const snapshotDir = path.join(this.rollbackDir, snapshotId);

      if (!fs.existsSync(snapshotDir)) {
        return false;
      }

      // Remove directory and all contents
      fs.rmSync(snapshotDir, { recursive: true, force: true });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clean up old snapshots (keep only the most recent ones)
   */
  cleanupOldSnapshots(): void {
    try {
      const snapshots = this.listSnapshots();

      if (snapshots.length <= this.maxSnapshots) {
        return;
      }

      const snapshotsToDelete = snapshots.slice(this.maxSnapshots);

      for (const snapshot of snapshotsToDelete) {
        this.deleteSnapshot(snapshot.id);
      }
    } catch (error) {
      // Silent fail for cleanup
    }
  }

  /**
   * Get size information about a snapshot
   */
  getSnapshotSize(snapshotId: string): { totalSize: number; fileCount: number } {
    try {
      const snapshotDir = path.join(this.rollbackDir, snapshotId);

      if (!fs.existsSync(snapshotDir)) {
        return { totalSize: 0, fileCount: 0 };
      }

      // Recursive helper to walk directory tree
      const walkDir = (dir: string): { totalSize: number; fileCount: number } => {
        let totalSize = 0;
        let fileCount = 0;
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const entryPath = path.join(dir, entry.name);
          try {
            if (entry.isDirectory()) {
              const sub = walkDir(entryPath);
              totalSize += sub.totalSize;
              fileCount += sub.fileCount;
            } else {
              const stats = fs.statSync(entryPath);
              totalSize += stats.size;
              fileCount += 1;
            }
          } catch {
            // Continue on error
          }
        }

        return { totalSize, fileCount };
      };

      return walkDir(snapshotDir);
    } catch (error) {
      return { totalSize: 0, fileCount: 0 };
    }
  }

  /**
   * Reconstruct file with stats from metadata
   */
  private reconstructSnapshotFile(fileMetadata: any): RollbackFile {
    const stats: PartialStats | undefined =
      fileMetadata.mtimeMs !== undefined
        ? {
            mtime: new Date(fileMetadata.mtimeMs),
            mtimeMs: fileMetadata.mtimeMs,
          }
        : undefined;

    return {
      ...fileMetadata,
      stats,
    };
  }

  /**
   * Check if a snapshot is still valid (files haven't changed since creation)
   */
  isSnapshotValid(snapshotId: string): { isValid: boolean; changedFiles: string[] } {
    try {
      const snapshot = this.getSnapshot(snapshotId);

      if (!snapshot) {
        return { isValid: false, changedFiles: [] };
      }

      const changedFiles: string[] = [];

      for (const fileInfo of snapshot.files) {
        try {
          const filePath = path.join(this.cwd, fileInfo.fileName);
          const exists = fs.existsSync(filePath);

          // If file existence changed, it's invalid
          if (exists !== fileInfo.exists) {
            changedFiles.push(fileInfo.fileName);
            continue;
          }

          if (exists) {
            const stats = fs.statSync(filePath);

            // Check if size changed
            if (stats.size !== fileInfo.size) {
              changedFiles.push(fileInfo.fileName);
              continue;
            }

            // Check if modification time changed significantly
            // Normalize mtime to handle cases where it's a string from JSON
            const snapshotMtime = fileInfo.stats?.mtime;

            if (snapshotMtime != null) {
              let snapshotMtimeMs: number | undefined;

              if (snapshotMtime instanceof Date) {
                snapshotMtimeMs = snapshotMtime.getTime();
              } else if (typeof snapshotMtime === 'string') {
                snapshotMtimeMs = new Date(snapshotMtime).getTime();
              } else if (typeof snapshotMtime === 'number') {
                snapshotMtimeMs = snapshotMtime;
              }

              if (snapshotMtimeMs !== undefined) {
                const currentTimeMs =
                  stats.mtime instanceof Date
                    ? stats.mtime.getTime()
                    : new Date(stats.mtime).getTime();
                const timeDiff = Math.abs(currentTimeMs - snapshotMtimeMs);

                if (timeDiff > 1000) {
                  // 1 second tolerance
                  changedFiles.push(fileInfo.fileName);
                }
              }
            }
          }
        } catch (error) {
          // File access error indicates potential invalidation
          changedFiles.push(fileInfo.fileName);
        }
      }

      return {
        isValid: changedFiles.length === 0,
        changedFiles,
      };
    } catch (error) {
      return { isValid: false, changedFiles: [] };
    }
  }

  /**
   * Generate unique snapshot ID
   */
  private generateSnapshotId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `rollback-${timestamp}-${random}`;
  }

  /**
   * Ensure rollback directory exists
   */
  private ensureRollbackDirectory(): void {
    if (!fs.existsSync(this.rollbackDir)) {
      fs.mkdirSync(this.rollbackDir, { recursive: true, mode: 0o700 });
    } else {
      // Ensure existing directory has correct permissions
      try {
        fs.chmodSync(this.rollbackDir, 0o700);
      } catch (error) {
        // Ignore chmod errors on Windows or if not owner
      }
    }
  }

  /**
   * Get rollback directory path
   */
  getRollbackDirectory(): string {
    return this.rollbackDir;
  }

  /**
   * Check if rollback functionality is available
   */
  isRollbackAvailable(): boolean {
    try {
      fs.accessSync(this.rollbackDir, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Cross-platform rollback utilities
 */
export class RollbackUtils {
  /**
   * Create temporary rollback file for atomic operations
   */
  static createTempRollbackFile(originalPath: string, content: string): string {
    const tempPath = `${originalPath}.rollback.${Date.now()}`;
    writeFileSyncAtomic(tempPath, content, { encoding: 'utf-8', mode: 0o600 });
    return tempPath;
  }

  /**
   * Atomically replace file with rollback capability
   */
  static atomicFileReplace(
    originalPath: string,
    newContent: string,
    backupContent?: string
  ): { success: boolean; rollbackPath?: string } {
    try {
      let rollbackPath: string | undefined;

      // Create backup if content provided
      if (backupContent) {
        rollbackPath = this.createTempRollbackFile(originalPath, backupContent);
      } else if (fs.existsSync(originalPath)) {
        const originalContent = fs.readFileSync(originalPath, 'utf-8');
        rollbackPath = this.createTempRollbackFile(originalPath, originalContent);
      }

      // Write new content
      writeFileSyncAtomic(originalPath, newContent, { encoding: 'utf-8' });

      return { success: true, rollbackPath };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Rollback atomic file operation
   */
  static rollbackAtomicOperation(originalPath: string, rollbackPath?: string): boolean {
    try {
      if (rollbackPath && fs.existsSync(rollbackPath)) {
        const content = fs.readFileSync(rollbackPath, 'utf-8');
        writeFileSyncAtomic(originalPath, content, { encoding: 'utf-8' });
        fs.unlinkSync(rollbackPath);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
}
