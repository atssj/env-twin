import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { BackupDiscovery, BackupValidationResult } from '../modules/backup-discovery.js';
import { TimestampParser } from '../modules/timestamp-parser.js';
import { FileRestorer, FileRestoreOptions, RestoreProgress } from '../modules/file-restoration.js';
import { RollbackManager, RollbackSnapshot } from '../modules/rollback-manager.js';
import { logger, RestoreLogger } from '../modules/logger.js';
import { listBackups } from '../utils/backup.js';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface RestoreOptions {
  timestamp?: string;
  yes?: boolean;
  list?: boolean;
}

export interface EnhancedRestoreOptions {
  timestamp?: string;
  yes?: boolean;
  list?: boolean;
  preservePermissions?: boolean;
  preserveTimestamps?: boolean;
  createRollback?: boolean;
  force?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface RestoreSession {
  sessionId: string;
  selectedBackup: any;
  rollbackSnapshot?: RollbackSnapshot;
  startedAt: Date;
  filesToRestore: string[];
  options: EnhancedRestoreOptions;
}

// ============================================================================
// ENHANCED RESTORE COMMAND
// ============================================================================

/**
 * Enhanced restore command with comprehensive error handling, rollback capability,
 * and automatic most-recent-backup selection
 */
export async function runEnhancedRestore(options: EnhancedRestoreOptions = {}): Promise<void> {
  const operationId = logger.getOperationId();
  const restoreLogger = new RestoreLogger(operationId);

  try {
    // Log operation start
    logger.info('Restore operation started', {
      targetTimestamp: options.timestamp,
      sessionId: operationId
    });

    // Create restore session
    const session = createRestoreSession(options);

    // Run the restore process
    await runRestoreProcess(session, restoreLogger);

  } catch (error) {
    logger.fatal('Restore operation failed', { error: error instanceof Error ? error.message : String(error) });
    console.error(`\n❌ Restore operation failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// ============================================================================
// RESTORE SESSION MANAGEMENT
// ============================================================================

/**
 * Create and initialize a restore session
 */
function createRestoreSession(options: EnhancedRestoreOptions): RestoreSession {
  const sessionId = `restore-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  logger.info('Creating restore session', {
    sessionId,
    options
  });

  return {
    sessionId,
    selectedBackup: null,
    rollbackSnapshot: undefined,
    startedAt: new Date(),
    filesToRestore: [],
    options
  };
}

// ============================================================================
// MAIN RESTORE PROCESS
// ============================================================================

/**
 * Main restore process orchestrator
 */
async function runRestoreProcess(session: RestoreSession, restoreLogger: RestoreLogger): Promise<void> {
  const {
    timestamp: requestedTimestamp,
    list: shouldList,
    yes: skipConfirmation,
    dryRun,
    verbose
  } = session.options;

  console.log('\n🔄 Starting enhanced restore process...\n');

  // Step 1: Discover and validate backups
  const discoveryResult = await discoverBackups(session, restoreLogger);
  if (!discoveryResult.success) {
    throw new Error(discoveryResult.error);
  }

  // Step 2: Handle list mode
  if (shouldList) {
    await listAvailableBackups(discoveryResult.data!, restoreLogger);
    return;
  }

  // Step 3: Select backup
  const selectedBackup = await selectBackup(session, discoveryResult.data!, restoreLogger);
  session.selectedBackup = selectedBackup;
  session.filesToRestore = selectedBackup.files;

  // Step 4: Validate selected backup
  const validationResult = await validateSelectedBackup(session, restoreLogger);
  if (!validationResult.isValid) {
    throw new Error(`Selected backup is invalid: ${validationResult.errors.join(', ')}`);
  }

  // Step 5: Check for changes and create rollback if needed
  if (session.options.createRollback && !dryRun) {
    const rollbackResult = await createPreRestoreSnapshot(session, restoreLogger);
    if (rollbackResult.success && rollbackResult.snapshot) {
      session.rollbackSnapshot = rollbackResult.snapshot;
    }
  }

  // Step 6: Confirm restore operation
  if (!skipConfirmation) {
    const userConfirmed = await confirmRestoreOperation(session, restoreLogger);
    if (!userConfirmed) {
      console.log('\n❌ Restore operation cancelled by user');
      logger.info('Restore operation cancelled by user');
      process.exit(0);
    }
  }

  // Step 7: Perform the restore
  await performRestore(session, restoreLogger);

  // Step 8: Complete operation
  console.log('\n✅ Restore operation completed successfully!');
  logger.logRestoreComplete(true, session.filesToRestore.length, 0);
}

/**
 * Discover and validate available backups
 */
async function discoverBackups(session: RestoreSession, restoreLogger: RestoreLogger): Promise<{ success: boolean; data?: BackupValidationResult; error?: string }> {
  try {
    console.log('📁 Discovering available backups...');

    const backupDiscovery = new BackupDiscovery(process.cwd());
    const result = backupDiscovery.discoverAndValidateBackups();

    restoreLogger.logBackupDiscovery(result.validatedBackups.length, result.validatedBackups.filter(b => b.isValid).length);

    if (result.validatedBackups.length === 0) {
      return { success: false, error: 'No backups found in .env-twin/ directory' };
    }

    if (result.errors.length > 0) {
      console.log('⚠️  Backup discovery warnings:');
      result.errors.forEach(error => console.log(`   • ${error}`));
    }

    return { success: true, data: result };

  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * List available backups
 */
async function listAvailableBackups(result: BackupValidationResult, restoreLogger: RestoreLogger): Promise<void> {
  console.log('📋 Available backups:\n');

  const validBackups = result.validatedBackups.filter(b => b.isValid);
  const invalidBackups = result.validatedBackups.filter(b => !b.isValid);

  if (validBackups.length > 0) {
    console.log('✅ Valid backups:');
    validBackups.forEach((backup, index) => {
      const description = TimestampParser.generateBackupDescription(backup.timestamp);
      console.log(`   ${index + 1}. ${description}`);
      console.log(`      Files: ${backup.files.join(', ')}`);
      console.log(`      Created: ${backup.createdAt.toISOString()}\n`);
    });
  }

  if (invalidBackups.length > 0) {
    console.log('⚠️  Invalid backups:');
    invalidBackups.forEach((backup, index) => {
      console.log(`   ${index + 1}. ${backup.timestamp}`);
      console.log(`      Errors: ${backup.errors.join(', ')}\n`);
    });
  }

  console.log('\n💡 Usage examples:');
  if (validBackups.length > 0) {
    const mostRecent = validBackups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    console.log(`   env-twin restore                    # Restore most recent (${mostRecent.timestamp})`);
    console.log(`   env-twin restore ${mostRecent.timestamp}         # Restore specific backup`);
  }
  console.log(`   env-twin restore --list             # List all backups`);
}

/**
 * Select backup (automatic or user input)
 */
async function selectBackup(session: RestoreSession, result: BackupValidationResult, restoreLogger: RestoreLogger): Promise<any> {
  const { timestamp: requestedTimestamp } = session.options;
  const validBackups = result.validatedBackups.filter(b => b.isValid);

  if (requestedTimestamp) {
    // User specified a timestamp - validate it
    const backup = validBackups.find(b => b.timestamp === requestedTimestamp);
    if (!backup) {
      throw new Error(`Backup with timestamp '${requestedTimestamp}' not found or invalid`);
    }

    console.log(`🎯 Selected specific backup: ${TimestampParser.generateBackupDescription(requestedTimestamp)}`);
    logger.info(`User selected specific backup`, { timestamp: requestedTimestamp });
    return backup;
  } else {
    // Auto-select most recent backup
    const mostRecent = validBackups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    if (!mostRecent) {
      throw new Error('No valid backups available for automatic selection');
    }

    console.log(`🎯 Auto-selected most recent backup: ${TimestampParser.generateBackupDescription(mostRecent.timestamp)}`);
    restoreLogger.logMostRecentSelection(mostRecent.timestamp);
    return mostRecent;
  }
}

/**
 * Validate the selected backup
 */
async function validateSelectedBackup(session: RestoreSession, restoreLogger: RestoreLogger): Promise<{ isValid: boolean; errors: string[] }> {
  console.log('🔍 Validating selected backup...');

  const backup = session.selectedBackup as any;
  const errors: string[] = [];

  // Validate each file in backup
  for (const fileName of backup.files) {
    const filePath = path.join(process.cwd(), fileName);

    // Check if file would be overwritten
    if (fs.existsSync(filePath)) {
      // File exists - check if it has been modified
      const stats = fs.statSync(filePath);
      const modifiedTime = stats.mtime.toISOString();
      console.log(`   ⚠️  ${fileName} exists (last modified: ${modifiedTime})`);
    } else {
      console.log(`   ✅ ${fileName} will be created`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Create pre-restore snapshot for rollback capability
 */
async function createPreRestoreSnapshot(session: RestoreSession, restoreLogger: RestoreLogger): Promise<{ success: boolean; snapshot?: RollbackSnapshot; error?: string }> {
  try {
    console.log('📸 Creating pre-restore snapshot...');

    const rollbackManager = new RollbackManager(process.cwd());
    const snapshot = await rollbackManager.createSnapshot(session.filesToRestore, {
      includeContent: true,
      includePermissions: true,
      maxSize: 1024 * 1024 // 1MB limit per file
    });

    console.log(`   ✅ Snapshot created: ${snapshot.id}`);
    logger.info('Pre-restore snapshot created', {
      snapshotId: snapshot.id,
      fileCount: snapshot.files.length
    });

    return { success: true, snapshot };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`   ❌ Failed to create snapshot: ${errorMsg}`);
    logger.warn('Failed to create pre-restore snapshot', { error: errorMsg });
    return { success: false, error: errorMsg };
  }
}

/**
 * Confirm restore operation with user
 */
async function confirmRestoreOperation(session: RestoreSession, restoreLogger: RestoreLogger): Promise<boolean> {
  const backup = session.selectedBackup as any;

  console.log('\n📋 Restore Operation Summary:');
  console.log(`   Backup: ${TimestampParser.generateBackupDescription(backup.timestamp)}`);
  console.log(`   Files to restore: ${backup.files.join(', ')}`);

  if (session.rollbackSnapshot) {
    console.log(`   Rollback available: ${session.rollbackSnapshot.id}`);
  }

  if (session.options.dryRun) {
    console.log(`   Mode: DRY RUN (no actual changes will be made)`);
  }

  console.log('\n❓ Do you want to proceed with the restore? (y/N)');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Answer: ', (answer) => {
      rl.close();
      const confirmed = answer.toLowerCase().startsWith('y');
      restoreLogger.logUserConfirmation(confirmed);
      resolve(confirmed);
    });
  });
}

/**
 * Perform the actual restore operation
 */
async function performRestore(session: RestoreSession, restoreLogger: RestoreLogger): Promise<void> {
  console.log('\n🚀 Starting restore operation...\n');

  const backup = session.selectedBackup as any;
  const fileRestorer = new FileRestorer(process.cwd());

  // Set up progress callback
  fileRestorer.setProgressCallback((progress: RestoreProgress) => {
    const percentage = Math.round((progress.current / progress.total) * 100);
    console.log(`   ${percentage}% - ${progress.phase}: ${progress.currentFile}`);
    logger.logProgress(progress.current, progress.total, progress.phase, progress.currentFile);
  });

  // Set up restore options
  const restoreOptions: FileRestoreOptions = {
    preservePermissions: session.options.preservePermissions !== false,
    preserveTimestamps: session.options.preserveTimestamps !== false,
    createBackup: false, // We handle rollback separately
    force: session.options.force,
    dryRun: session.options.dryRun
  };

  // Perform restore
  const restoreResult = await fileRestorer.restoreFiles(backup, restoreOptions);

  console.log('\n📊 Restore Results:');
  console.log(`   ✅ Successfully restored: ${restoreResult.restoredCount} files`);

  if (restoreResult.failedCount > 0) {
    console.log(`   ❌ Failed to restore: ${restoreResult.failedCount} files`);
    restoreResult.errors.forEach((error, fileName) => {
      console.log(`      ${fileName}: ${error}`);
    });
  }

  if (restoreResult.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    restoreResult.warnings.forEach(warning => console.log(`   • ${warning}`));
  }

  // Handle rollback if restore failed
  if (!restoreResult.success && session.rollbackSnapshot) {
    console.log('\n🔄 Restore failed, initiating rollback...');

    try {
      const rollbackManager = new RollbackManager(process.cwd());
      const rollbackResult = await rollbackManager.rollbackToSnapshot(session.rollbackSnapshot.id);

      if (rollbackResult.success) {
        console.log('✅ Rollback completed successfully');
        logger.logRollback(session.rollbackSnapshot.id, true, rollbackResult.rolledBackFiles);
      } else {
        console.log('❌ Rollback failed');
        logger.logRollback(session.rollbackSnapshot.id, false, undefined, rollbackResult.error);
      }
    } catch (error) {
      console.log('❌ Rollback operation failed');
      logger.logRollback(session.rollbackSnapshot.id, false, undefined, error instanceof Error ? error.message : String(error));
    }
  }

  // Final status
  if (restoreResult.success) {
    console.log('\n🎉 Restore operation completed successfully!');
    logger.logRestoreComplete(true, restoreResult.restoredCount, restoreResult.failedCount);
  } else {
    console.log('\n❌ Restore operation completed with errors');
    logger.logRestoreComplete(false, restoreResult.restoredCount, restoreResult.failedCount, Array.from(restoreResult.errors.values()));
    process.exit(1);
  }
}

// ============================================================================
// LEGACY COMPATIBILITY FUNCTIONS
// ============================================================================

/**
 * Legacy function for backward compatibility
 */
export async function runRestore(options: RestoreOptions = {}): Promise<void> {
  const enhancedOptions: EnhancedRestoreOptions = {
    timestamp: options.timestamp,
    yes: options.yes,
    list: options.list,
    preservePermissions: true,
    preserveTimestamps: true,
    createRollback: true,
    verbose: process.env.NODE_ENV !== 'production'
  };

  return await runEnhancedRestore(enhancedOptions);
}

// ============================================================================
// HELPER FUNCTIONS FOR COMMAND-LINE INTERFACE
// ============================================================================

/**
 * Format backup for display
 */
function formatBackupForDisplay(backup: any, index: number): string {
  const timestamp = TimestampParser.formatTimestamp(backup.timestamp);
  const relativeTime = TimestampParser.formatRelativeTime(backup.timestamp);

  return `${index + 1}. ${timestamp} (${relativeTime})
   Files: ${backup.files.join(', ')}
   Status: ${backup.isValid ? '✅ Valid' : '❌ Invalid'}`;
}

/**
 * Get most recent valid backup
 */
function getMostRecentValidBackup(): any {
  const backupDiscovery = new BackupDiscovery(process.cwd());
  return backupDiscovery.findMostRecentValidBackup();
}
