import path from 'path';
import readline from 'readline/promises';
import { listBackups, cleanOldBackups, BACKUP_DIR } from '../utils/backup.js';

// ============================================================================
// TYPES
// ============================================================================

export interface CleanBackupsOptions {
  keep?: number;
  yes?: boolean;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
// CLEAN BACKUPS OPERATION
// ============================================================================

export async function runCleanBackups(options: CleanBackupsOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const keepCount = options.keep ?? 10;
  const backups = listBackups(cwd);

  if (backups.length === 0) {
    console.log('No backups found in .env-twin/ directory');
    process.exit(0);
  }

  if (backups.length <= keepCount) {
    console.log(`You have ${backups.length} backup(s). Keeping ${keepCount} most recent.`);
    console.log('No backups to delete.');
    process.exit(0);
  }

  const backupsToDelete = backups.slice(keepCount);

  console.log(`You have ${backups.length} backup(s). Keeping ${keepCount} most recent.`);
  console.log('');
  console.log('Backups to delete:');
  backupsToDelete.forEach(backup => {
    console.log(`  - ${formatTimestamp(backup.timestamp)} (${backup.files.join(', ')})`);
  });
  console.log('');

  if (!options.yes) {
    console.log('To skip this confirmation, use: env-twin clean-backups --yes');
    console.log(
      'To keep a different number of backups, use: env-twin clean-backups --keep <number>'
    );
    console.log('');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    try {
      const answer = await rl.question('Do you want to proceed with the cleanup? (y/N): ');

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('Cleanup cancelled.');
        process.exit(0);
      }
    } finally {
      rl.close();
    }
  }

  // Perform cleanup
  const { deleted, kept } = cleanOldBackups(cwd, keepCount);

  console.log('');
  console.log('Cleanup Summary:');
  console.log(`  ✓ Deleted ${deleted.length} backup set(s)`);
  console.log(`  ✓ Kept ${kept.length} backup set(s)`);

  console.log('');
  console.log('Cleanup completed successfully!');
}
