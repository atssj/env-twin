import fs from 'fs';
import path from 'path';
import { listBackups, restoreBackup, BACKUP_DIR } from '../utils/backup.js';

// ============================================================================
// TYPES
// ============================================================================

export interface RestoreOptions {
  timestamp?: string;
  yes?: boolean;
  list?: boolean;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatTimestamp(timestamp: string): string {
  const year = timestamp.substring(0, 4);
  const month = timestamp.substring(4, 6);
  const day = timestamp.substring(6, 8);
  const hours = timestamp.substring(9, 11);
  const minutes = timestamp.substring(11, 13);
  const seconds = timestamp.substring(13, 15);
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// ============================================================================
// RESTORE OPERATIONS
// ============================================================================

export function runRestore(options: RestoreOptions = {}): void {
  const cwd = process.cwd();
  const backups = listBackups(cwd);

  if (backups.length === 0) {
    console.log('No backups found in .env-twin/ directory');
    process.exit(0);
  }

  // If --list flag is provided, just list backups
  if (options.list) {
    console.log('Available backups:');
    backups.forEach((backup, index) => {
      console.log(`  ${index + 1}. ${formatTimestamp(backup.timestamp)} - Files: ${backup.files.join(', ')}`);
    });
    process.exit(0);
  }

  let selectedTimestamp = options.timestamp;

  // If no timestamp provided, show interactive selection
  if (!selectedTimestamp) {
    console.log('Available backups (most recent first):');
    backups.forEach((backup, index) => {
      console.log(`  ${index + 1}. ${formatTimestamp(backup.timestamp)} - Files: ${backup.files.join(', ')}`);
    });
    console.log('');
    console.log('To restore a backup, run: env-twin restore <timestamp>');
    console.log('Example: env-twin restore ' + backups[0].timestamp);
    process.exit(0);
  }

  // Validate timestamp exists
  const backup = backups.find((b) => b.timestamp === selectedTimestamp);
  if (!backup) {
    console.error(`Error: Backup with timestamp '${selectedTimestamp}' not found`);
    console.log('');
    console.log('Available backups:');
    backups.forEach((b) => {
      console.log(`  - ${b.timestamp}`);
    });
    process.exit(1);
  }

  // Show what will be restored
  console.log(`Restoring backup from ${formatTimestamp(selectedTimestamp)}`);
  console.log(`Files to restore: ${backup.files.join(', ')}`);
  console.log('');

  // Ask for confirmation unless --yes flag is provided
  if (!options.yes) {
    console.log('This will overwrite the following files in the current directory:');
    backup.files.forEach((file) => {
      console.log(`  - ${file}`);
    });
    console.log('');
    console.log('To skip this confirmation, use: env-twin restore <timestamp> --yes');
    console.log('');
    console.log('Proceeding with restore...');
  }

  // Perform restore
  const { restored, failed } = restoreBackup(selectedTimestamp, cwd);

  if (restored.length === 0 && failed.length === 0) {
    console.error('Error: No files were restored');
    process.exit(1);
  }

  console.log('');
  console.log('Restore Summary:');
  restored.forEach((file) => {
    console.log(`  ✓ ${file}: Restored`);
  });

  if (failed.length > 0) {
    failed.forEach((file) => {
      console.log(`  ✗ ${file}: Failed to restore`);
    });
  }

  console.log('');
  console.log('Restore completed successfully!');
}

