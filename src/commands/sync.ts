import fs from 'fs';
import path from 'path';
import { createBackups } from '../utils/backup.js';
import { writeAtomic } from '../utils/atomic-fs.js';

// ============================================================================
// TYPES
// ============================================================================

interface EnvFileInfo {
  filePath: string;
  fileName: string;
  exists: boolean;
  content?: string;
  lines?: string[];
}

interface ParsedEnvLine {
  key: string;
  value: string;
  originalLine: string;
  isComment: boolean;
  isEmpty: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ENV_FILES = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.testing',
  '.env.staging',
  '.env.example',
];

// ============================================================================
// FILE DISCOVERY
// ============================================================================

function discoverEnvFiles(cwd: string): EnvFileInfo[] {
  return ENV_FILES.map(fileName => {
    const filePath = path.join(cwd, fileName);
    const exists = fs.existsSync(filePath);
    return {
      filePath,
      fileName,
      exists,
    };
  });
}

// ============================================================================
// ENV FILE PARSING
// ============================================================================

function parseEnvLine(line: string): ParsedEnvLine {
  const trimmed = line.trim();
  const isComment = trimmed.startsWith('#');
  const isEmpty = trimmed === '';

  if (isComment || isEmpty) {
    return {
      key: '',
      value: '',
      originalLine: line,
      isComment,
      isEmpty,
    };
  }

  const eqIndex = line.indexOf('=');
  if (eqIndex === -1) {
    return {
      key: '',
      value: '',
      originalLine: line,
      isComment: false,
      isEmpty: false,
    };
  }

  const key = line.substring(0, eqIndex).trim();
  const value = line.substring(eqIndex + 1);

  return {
    key,
    value,
    originalLine: line,
    isComment: false,
    isEmpty: false,
  };
}

function readEnvFile(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n');
  } catch (error) {
    console.error(
      `Warning: Failed to read ${path.basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`
    );
    return [];
  }
}

// ============================================================================
// KEY COLLECTION
// ============================================================================

function collectAllKeys(envFiles: EnvFileInfo[]): Set<string> {
  const keys = new Set<string>();

  for (const file of envFiles) {
    if (!file.exists) continue;

    const lines = readEnvFile(file.filePath);
    for (const line of lines) {
      const parsed = parseEnvLine(line);
      if (parsed.key) {
        keys.add(parsed.key);
      }
    }
  }

  return keys;
}

function getExistingKeys(filePath: string): Set<string> {
  const keys = new Set<string>();
  const lines = readEnvFile(filePath);

  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (parsed.key) {
      keys.add(parsed.key);
    }
  }

  return keys;
}

// ============================================================================
// KEY SANITIZATION
// ============================================================================

/**
 * Sanitize a key name for use in placeholder values.
 * Converts to lowercase, replaces non-alphanumeric characters with underscores,
 * collapses multiple underscores, and trims leading/trailing underscores.
 */
function sanitizeKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
}

// ============================================================================
// FILE MERGING
// ============================================================================

function mergeEnvFile(filePath: string, allKeys: Set<string>, isExample: boolean): string {
  const lines = readEnvFile(filePath);
  const existingKeys = getExistingKeys(filePath);
  const missingKeys = Array.from(allKeys)
    .filter(key => !existingKeys.has(key))
    .sort();

  // Build the merged content
  let mergedLines = [...lines];

  // Add missing keys at the end
  if (missingKeys.length > 0) {
    // Add a blank line before new keys if file is not empty
    if (mergedLines.length > 0 && mergedLines[mergedLines.length - 1].trim() !== '') {
      mergedLines.push('');
    }

    for (const key of missingKeys) {
      if (isExample) {
        // For .env.example, use a sanitized placeholder
        mergedLines.push(`${key}=input_${sanitizeKey(key)}`);
      } else {
        mergedLines.push(`${key}=`);
      }
    }
  }

  return mergedLines.join('\n');
}

// ============================================================================
// FILE WRITING
// ============================================================================

function writeEnvFile(filePath: string, content: string): boolean {
  try {
    // Try to get existing mode to preserve it
    let mode: number | undefined;
    if (fs.existsSync(filePath)) {
      try {
        const stats = fs.statSync(filePath);
        mode = stats.mode;
      } catch (e) {
        // Ignore error reading stats
      }
    }

    writeAtomic(filePath, content, { mode });
    return true;
  } catch (error) {
    console.error(
      `Error: Failed to write ${path.basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

export function runSync(options: { noBackup?: boolean } = {}): void {
  const cwd = process.cwd();
  const envFiles = discoverEnvFiles(cwd);
  const existingFiles = envFiles.filter(f => f.exists);

  if (existingFiles.length === 0) {
    console.log('No .env* files found in the current directory.');
    console.log(`Searched for: ${ENV_FILES.join(', ')}`);
    process.exit(0);
  }

  console.log(`Found ${existingFiles.length} .env* file(s):`);
  existingFiles.forEach(f => console.log(`  - ${f.fileName}`));
  console.log('');

  // Create backups before modifying files
  let backupTimestamp: string | null = null;
  if (!options.noBackup) {
    const filesToBackup = existingFiles.map(f => f.filePath);
    backupTimestamp = createBackups(filesToBackup, cwd);
    if (backupTimestamp) {
      console.log(
        `✓ Created backup in ${path.join(path.basename(cwd), '.env-twin')} (timestamp: ${backupTimestamp})`
      );
      console.log('');
    }
  }

  // Collect all keys from all files
  const allKeys = collectAllKeys(envFiles);

  if (allKeys.size === 0) {
    console.log('No environment variables found in any .env* files.');
    process.exit(0);
  }

  console.log(`Collected ${allKeys.size} unique environment variable key(s)`);
  console.log('');

  // Sync each file
  const syncResults: { fileName: string; added: number }[] = [];

  for (const file of envFiles) {
    if (!file.exists) continue;

    const isExample = file.fileName === '.env.example';
    const existingKeys = getExistingKeys(file.filePath);
    const missingKeys = Array.from(allKeys).filter(key => !existingKeys.has(key));

    if (missingKeys.length > 0) {
      const mergedContent = mergeEnvFile(file.filePath, allKeys, isExample);
      if (writeEnvFile(file.filePath, mergedContent)) {
        syncResults.push({
          fileName: file.fileName,
          added: missingKeys.length,
        });
      }
    } else {
      syncResults.push({
        fileName: file.fileName,
        added: 0,
      });
    }
  }

  // Create .env.example if it doesn't exist
  const exampleFile = envFiles.find(f => f.fileName === '.env.example');
  if (!exampleFile?.exists) {
    const exampleContent = Array.from(allKeys)
      .sort()
      .map(key => `${key}=input_${sanitizeKey(key)}`)
      .join('\n');

    if (exampleContent) {
      if (writeEnvFile(path.join(cwd, '.env.example'), exampleContent)) {
        syncResults.push({
          fileName: '.env.example',
          added: allKeys.size,
        });
      }
    }
  }

  // Print summary
  console.log('Sync Summary:');
  syncResults.forEach(result => {
    if (result.added > 0) {
      console.log(`  ✓ ${result.fileName}: Added ${result.added} variable(s)`);
    } else {
      console.log(`  ✓ ${result.fileName}: Already up to date`);
    }
  });

  console.log('');
  console.log('Sync completed successfully!');

  if (backupTimestamp) {
    console.log('');
    console.log('Tip: You can restore from backup using: env-twin restore');
  }
}
