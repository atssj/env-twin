#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface CliOptions {
  source?: string;
  dest?: string;
  help: boolean;
  version: boolean;
  noBackup?: boolean;
  yes?: boolean;
  keep?: number;
  list?: boolean;
  timestamp?: string;
  preservePermissions?: boolean;
  preserveTimestamps?: boolean;
  createRollback?: boolean;
  force?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  json?: boolean;
}

interface ParsedArgs {
  command?: string;
  options: CliOptions;
}

type FlagKey =
  | 'SOURCE'
  | 'DEST'
  | 'HELP'
  | 'VERSION'
  | 'NO_BACKUP'
  | 'YES'
  | 'KEEP'
  | 'LIST'
  | 'PRESERVE_PERMISSIONS'
  | 'PRESERVE_TIMESTAMPS'
  | 'CREATE_ROLLBACK'
  | 'FORCE'
  | 'DRY_RUN'
  | 'VERBOSE'
  | 'JSON';

const CLI_FLAGS: Record<FlagKey, readonly string[]> = {
  SOURCE: ['--source', '--src'],
  DEST: ['--dest', '--destination', '--d', '--out', '--target'],
  HELP: ['--help', '-h'],
  VERSION: ['--version', '-v'],
  NO_BACKUP: ['--no-backup'],
  YES: ['--yes', '-y'],
  KEEP: ['--keep'],
  LIST: ['--list'],
  PRESERVE_PERMISSIONS: ['--preserve-permissions'],
  PRESERVE_TIMESTAMPS: ['--preserve-timestamps'],
  CREATE_ROLLBACK: ['--create-rollback', '--rollback'],
  FORCE: ['--force', '-f'],
  DRY_RUN: ['--dry-run', '--simulate'],
  VERBOSE: ['--verbose', '-V'],
  JSON: ['--json'],
} as const;

// ============================================================================
// ARGUMENT PARSING
// ============================================================================

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let command: string | undefined;
  const params: CliOptions = {
    help: false,
    version: false,
  };

  // Check if first argument is a command (doesn't start with -)
  let startIndex = 0;
  if (args.length > 0 && !args[0].startsWith('-')) {
    command = args[0];
    startIndex = 1;
  }

  for (let i = startIndex; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (true) {
      case CLI_FLAGS.SOURCE.includes(arg):
        if (!nextArg || nextArg.startsWith('-')) {
          throw new Error(`Missing value for ${arg} argument`);
        }
        params.source = nextArg;
        i++;
        break;

      case CLI_FLAGS.DEST.includes(arg):
        if (!nextArg || nextArg.startsWith('-')) {
          throw new Error(`Missing value for ${arg} argument`);
        }
        params.dest = nextArg;
        i++;
        break;

      case CLI_FLAGS.HELP.includes(arg):
        params.help = true;
        break;

      case CLI_FLAGS.VERSION.includes(arg):
        params.version = true;
        break;

      case CLI_FLAGS.NO_BACKUP.includes(arg):
        params.noBackup = true;
        break;

      case CLI_FLAGS.YES.includes(arg):
        params.yes = true;
        break;

      case CLI_FLAGS.KEEP.includes(arg):
        if (!nextArg || nextArg.startsWith('-')) {
          throw new Error(`Missing value for ${arg} argument`);
        }
        params.keep = parseInt(nextArg, 10);
        if (isNaN(params.keep)) {
          throw new Error(`Invalid value for ${arg}: must be a number`);
        }
        i++;
        break;

      case CLI_FLAGS.LIST.includes(arg):
        params.list = true;
        break;

      case CLI_FLAGS.PRESERVE_PERMISSIONS.includes(arg):
        params.preservePermissions = true;
        break;

      case CLI_FLAGS.PRESERVE_TIMESTAMPS.includes(arg):
        params.preserveTimestamps = true;
        break;

      case CLI_FLAGS.CREATE_ROLLBACK.includes(arg):
        params.createRollback = true;
        break;

      case CLI_FLAGS.FORCE.includes(arg):
        params.force = true;
        break;

      case CLI_FLAGS.DRY_RUN.includes(arg):
        params.dryRun = true;
        break;

      case CLI_FLAGS.VERBOSE.includes(arg):
        params.verbose = true;
        break;

      case CLI_FLAGS.JSON.includes(arg):
        params.json = true;
        break;

      default:
        if (arg.startsWith('-')) {
          throw new Error(`Unknown option '${arg}'`);
        } else if (command === 'restore') {
          if (!params.timestamp) {
            params.timestamp = arg;
          } else {
            throw new Error(
              `Unexpected argument '${arg}'. Only one timestamp argument is allowed for 'restore'.`
            );
          }
        } else {
          const cmdName = command || 'default';
          throw new Error(
            `Unexpected argument '${arg}'. The '${cmdName}' command does not accept positional arguments.`
          );
        }
    }
  }

  return { command, options: params };
}

// ============================================================================
// USAGE AND HELP
// ============================================================================

function printUsage() {
  console.log(
    `
Usage: env-twin [command] [options]

Commands:
  sync                  Synchronize environment variable keys across all .env* files
  restore [timestamp]   Restore .env* files from a backup (auto-selects most recent if no timestamp)
  clean-backups         Delete old backups, keeping the most recent ones

Options:
  --source, --src       Source .env file path (default: .env)
  --dest, --destination Destination .env.example file path (default: .env.example)
  --help, -h            Display this help message
  --version, -v         Display version information

Enhanced Restore Features:
  ✅ Automatic backup discovery - no timestamp needed!
  ✅ Backup validation and integrity checks
  ✅ Rollback capability on restoration failures
  ✅ Cross-platform file system compatibility
  ✅ Preserve permissions and timestamps
  ✅ Progress tracking and comprehensive logging

Examples:
  env-twin --src .env.development --destination .env.dev.example
  env-twin sync
  env-twin restore                    # Automatically restore most recent backup
  env-twin restore 20241125-143022   # Restore specific backup
  env-twin clean-backups --keep 5
`
  );
}

function printSyncUsage() {
  console.log(
    `
Usage: env-twin sync [options]

Synchronize environment variable keys across all .env* files in the current directory.

Options:
  --no-backup           Skip creating a backup before syncing
  --yes, -y             Skip confirmation prompts (auto-accept non-destructive actions)
  --source, --src       Specify the "Source of Truth" file (keys synced FROM this file)
  --json                Output analysis report in JSON format (AI friendly)
  --help, -h            Display this help message

The sync command will:
  - Detect all .env* files (.env, .env.local, .env.development, .env.testing, .env.staging, .env.example)
  - Analyze differences between files
  - Interactively ask how to resolve missing keys (Add Empty, Copy Value, Skip)
  - Ensure .env.example contains all keys with placeholder values
  - Preserve existing values and file structure
  - Create a backup in .env-twin/ before modifying files

Examples:
  env-twin sync
  env-twin sync --source .env.example
  env-twin sync --json
  env-twin sync --yes
`
  );
}

function printRestoreUsage() {
  console.log(
    `
Usage: env-twin restore [timestamp] [options]

Restore .env* files from a backup. When no timestamp is provided,
the most recent valid backup will be automatically selected.

Arguments:
  timestamp             Specific backup timestamp to restore (format: YYYYMMDD-HHMMSS)
                       If omitted, the most recent backup will be used automatically

Options:
  --yes, -y             Skip confirmation prompt
  --list                List available backups without restoring
  --preserve-permissions Preserve original file permissions
  --preserve-timestamps  Preserve original file timestamps
  --create-rollback      Create pre-restore snapshot for rollback capability
  --force, -f            Force restore without checking for changes
  --dry-run, --simulate  Show what would be restored without making changes
  --verbose, -V          Enable verbose logging
  --help, -h             Display this help message

Enhanced Features:
  ✅ Automatic backup discovery - finds most recent backup when no timestamp provided
  ✅ Backup validation - checks integrity before restoration
  ✅ Rollback capability - automatic recovery if restoration fails
  ✅ Cross-platform compatibility - works on Windows, macOS, and Linux
  ✅ Progress tracking - real-time feedback during restoration
  ✅ Comprehensive logging - detailed operation logs for debugging

Examples:
  env-twin restore                           # Restore most recent backup
  env-twin restore 20241125-143022          # Restore specific backup
  env-twin restore 20241125-143022 --yes    # Restore without confirmation
  env-twin restore --list                    # List all available backups
  env-twin restore --dry-run                 # Preview restore without changes
  env-twin restore --verbose                 # Enable detailed logging

Advanced Usage:
  env-twin restore --create-rollback --preserve-permissions --verbose
`
  );
}

function printCleanBackupsUsage() {
  console.log(
    `
Usage: env-twin clean-backups [options]

Delete old backups, keeping the most recent ones.

Options:
  --keep <number>       Number of recent backups to keep (default: 10)
  --yes, -y             Skip confirmation prompt
  --help, -h            Display this help message

Examples:
  env-twin clean-backups
  env-twin clean-backups --keep 5
  env-twin clean-backups --keep 5 --yes
`
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getVersion(): string {
  try {
    const packagePath = path.resolve(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    return packageJson.version || 'unknown';
  } catch (error) {
    return '1.0.0';
  }
}

// ============================================================================
// DEFAULT COMMAND (copy .env to .env.example)
// ============================================================================

function runDefaultCommand(options: CliOptions): void {
  const envPath: string = path.resolve(process.cwd(), options.source || '.env');
  const examplePath: string = path.resolve(process.cwd(), options.dest || '.env.example');

  // Check if source file exists
  if (!fs.existsSync(envPath)) {
    console.error(`Error: Source file '${envPath}' not found!`);
    console.error(`Use --src or --source to specify a different source file.`);
    printUsage();
    process.exit(1);
  }

  // Read source file
  let envContent: string;
  try {
    envContent = fs.readFileSync(envPath, 'utf-8');
  } catch (error) {
    console.error(`Error: Failed to read '${envPath}'`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Process content
  const exampleContent: string = envContent
    .split('\n')
    .map((line: string): string => {
      if (line.trim() === '' || line.trim().startsWith('#')) {
        return line;
      }
      const [key] = line.split('=');
      if (!key) return line;

      // Convert key to lowercase and replace underscores
      const inputValue = `input_${key.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
      return `${key}="${inputValue}"`;
    })
    .join('\n');

  // Create directory if it doesn't exist
  const destDir = path.dirname(examplePath);
  try {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Write to destination file
    fs.writeFileSync(examplePath, exampleContent);
    console.log(
      `Success: Generated '${path.basename(examplePath)}' from '${path.basename(envPath)}'`
    );
    console.log('Note: All environment variable values have been removed for security.');
  } catch (error) {
    console.error(`Error: Failed to write to '${examplePath}'`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

try {
  const parsed = parseArgs();
  const { command, options } = parsed;

  // Handle --help flag
  if (options.help) {
    if (command === 'sync') {
      printSyncUsage();
    } else if (command === 'restore') {
      printRestoreUsage();
    } else if (command === 'clean-backups') {
      printCleanBackupsUsage();
    } else {
      printUsage();
    }
    process.exit(0);
  }

  // Handle --version flag
  if (options.version) {
    console.log(`env-twin version ${getVersion()}`);
    process.exit(0);
  }

  // Dispatch to appropriate command
  if (command === 'sync') {
    // Import and run sync command
    const { runSync } = await import('./commands/sync.js');
    await runSync({
      noBackup: options.noBackup,
      yes: options.yes,
      json: options.json,
      source: options.source,
    });
  } else if (command === 'restore') {
    // Import and run enhanced restore command
    const { runEnhancedRestore } = await import('./commands/restore.js');
    await runEnhancedRestore({
      timestamp: options.timestamp,
      yes: options.yes,
      list: options.list,
      preservePermissions: options.preservePermissions,
      preserveTimestamps: options.preserveTimestamps,
      createRollback: options.createRollback,
      force: options.force,
      dryRun: options.dryRun,
      verbose: options.verbose,
    });
  } else if (command === 'clean-backups') {
    // Import and run clean-backups command
    const { runCleanBackups } = await import('./commands/clean-backups.js');
    await runCleanBackups({
      keep: options.keep,
      yes: options.yes,
    });
  } else if (!command) {
    // Show usage if no arguments provided and no default files exist
    if (!options.source && !options.dest && !fs.existsSync('.env')) {
      printUsage();
      process.exit(0);
    }

    // Run default command
    runDefaultCommand(options);
  } else {
    console.error(`Error: Unknown command '${command}'`);
    printUsage();
    process.exit(1);
  }
} catch (error) {
  console.error('An unexpected error occurred:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
