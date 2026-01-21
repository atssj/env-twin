import fs from 'fs';
import path from 'path';
import { ensureBackupDirInGitignore } from './gitignore.js';
import { writeFileSyncAtomic } from './atomic-fs.js';

// ============================================================================
// TYPES
// ============================================================================

export interface BackupInfo {
  timestamp: string;
  files: string[];
  createdAt: Date;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const BACKUP_DIR = '.env-twin';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function ensureBackupDir(cwd: string): boolean {
  const backupPath = path.join(cwd, BACKUP_DIR);
  try {
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true, mode: 0o700 });
    } else {
      // Ensure existing directory has correct permissions
      try {
        fs.chmodSync(backupPath, 0o700);
      } catch (error) {
        // Ignore chmod errors on Windows or if not owner
      }
    }

    // Ensure backup directory is in .gitignore
    ensureBackupDirInGitignore(cwd);

    return true;
  } catch (error) {
    console.error(
      `Error: Failed to create backup directory: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

// ============================================================================
// BACKUP OPERATIONS
// ============================================================================

export function createBackup(filePath: string, cwd: string): boolean {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    if (!ensureBackupDir(cwd)) {
      return false;
    }

    const fileName = path.basename(filePath);
    const timestamp = getTimestamp();
    const backupFileName = `${fileName}.${timestamp}`;
    const backupPath = path.join(cwd, BACKUP_DIR, backupFileName);

    const content = fs.readFileSync(filePath, 'utf-8');
    writeFileSyncAtomic(backupPath, content, { encoding: 'utf-8', mode: 0o600 });
    return true;
  } catch (error) {
    console.error(
      `Error: Failed to backup ${path.basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

export function createBackups(filePaths: string[], cwd: string): string | null {
  if (!ensureBackupDir(cwd)) {
    return null;
  }

  const timestamp = getTimestamp();
  let successCount = 0;

  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    try {
      const fileName = path.basename(filePath);
      const backupFileName = `${fileName}.${timestamp}`;
      const backupPath = path.join(cwd, BACKUP_DIR, backupFileName);

      const content = fs.readFileSync(filePath, 'utf-8');
      writeFileSyncAtomic(backupPath, content, { encoding: 'utf-8', mode: 0o600 });
      successCount++;
    } catch (error) {
      console.error(
        `Warning: Failed to backup ${path.basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return successCount > 0 ? timestamp : null;
}

// ============================================================================
// BACKUP LISTING
// ============================================================================

export function listBackups(cwd: string): BackupInfo[] {
  const backupPath = path.join(cwd, BACKUP_DIR);

  if (!fs.existsSync(backupPath)) {
    return [];
  }

  try {
    const files = fs.readdirSync(backupPath);
    const backupsByTimestamp = new Map<string, { files: string[]; createdAt: Date }>();

    for (const file of files) {
      const match = file.match(/^(.+)\.(\d{8}-\d{6})$/);
      if (!match) continue;

      const timestamp = match[2];
      const filePath = path.join(backupPath, file);
      const stats = fs.statSync(filePath);

      if (!backupsByTimestamp.has(timestamp)) {
        backupsByTimestamp.set(timestamp, { files: [], createdAt: stats.mtime });
      }

      const backup = backupsByTimestamp.get(timestamp)!;
      backup.files.push(match[1]);
    }

    return Array.from(backupsByTimestamp.entries())
      .map(([timestamp, data]) => ({
        timestamp,
        files: data.files.sort(),
        createdAt: data.createdAt,
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error(
      `Error: Failed to list backups: ${error instanceof Error ? error.message : String(error)}`
    );
    return [];
  }
}

// ============================================================================
// BACKUP RESTORATION
// ============================================================================

export function restoreBackup(
  timestamp: string,
  cwd: string
): { restored: string[]; failed: string[] } {
  const backupPath = path.join(cwd, BACKUP_DIR);
  const restored: string[] = [];
  const failed: string[] = [];

  if (!fs.existsSync(backupPath)) {
    return { restored, failed };
  }

  try {
    const files = fs.readdirSync(backupPath);

    for (const file of files) {
      const match = file.match(/^(.+)\.(\d{8}-\d{6})$/);
      if (!match || match[2] !== timestamp) continue;

      const originalFileName = match[1];
      const backupFilePath = path.join(backupPath, file);
      const targetFilePath = path.join(cwd, originalFileName);

      // Security Check: Path Traversal
      const relative = path.relative(cwd, targetFilePath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        console.error(`Security Warning: Skipping path traversal attempt: ${originalFileName}`);
        failed.push(originalFileName);
        continue;
      }

      try {
        const content = fs.readFileSync(backupFilePath, 'utf-8');

        // Security Check: Symlink Attack
        // Check if target exists and is a symlink before writing
        try {
          const lstat = fs.lstatSync(targetFilePath);
          if (lstat.isSymbolicLink()) {
            // Remove symlink to prevent writing through it
            fs.unlinkSync(targetFilePath);
          } else if (lstat.isDirectory()) {
            // Do not overwrite directory
            console.error(`Security Warning: Skipping directory overwrite: ${originalFileName}`);
            failed.push(originalFileName);
            continue;
          }
        } catch (error: any) {
          // Ignore ENOENT (file not found), handle other errors
          if (error.code !== 'ENOENT') {
            throw error;
          }
        }

        writeFileSyncAtomic(targetFilePath, content, { encoding: 'utf-8' });
        restored.push(originalFileName);
      } catch (error) {
        failed.push(originalFileName);
      }
    }
  } catch (error) {
    console.error(
      `Error: Failed to restore backup: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return { restored, failed };
}

// ============================================================================
// BACKUP DELETION
// ============================================================================

export function deleteBackup(timestamp: string, cwd: string): boolean {
  const backupPath = path.join(cwd, BACKUP_DIR);

  if (!fs.existsSync(backupPath)) {
    return false;
  }

  try {
    const files = fs.readdirSync(backupPath);
    let deletedCount = 0;

    for (const file of files) {
      const match = file.match(/^(.+)\.(\d{8}-\d{6})$/);
      if (!match || match[2] !== timestamp) continue;

      const filePath = path.join(backupPath, file);
      fs.unlinkSync(filePath);
      deletedCount++;
    }

    return deletedCount > 0;
  } catch (error) {
    console.error(
      `Error: Failed to delete backup: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

export function cleanOldBackups(
  cwd: string,
  keepCount: number = 10
): { deleted: string[]; kept: string[] } {
  const backups = listBackups(cwd);
  const deleted: string[] = [];
  const kept: string[] = [];

  for (let i = 0; i < backups.length; i++) {
    if (i < keepCount) {
      kept.push(backups[i].timestamp);
    } else {
      if (deleteBackup(backups[i].timestamp, cwd)) {
        deleted.push(backups[i].timestamp);
      }
    }
  }

  return { deleted, kept };
}
