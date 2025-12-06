import fs from 'fs';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface GitignoreEntry {
  pattern: string;
  comment?: string;
  added?: boolean;
}

export interface GitignoreResult {
  success: boolean;
  changed: boolean;
  entries: GitignoreEntry[];
  message?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const BACKUP_DIR_PATTERN = '.env-twin/';
export const GITIGNORE_FILE = '.gitignore';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Read the current .gitignore file and parse its entries
 */
function readGitignoreFile(cwd: string): string[] {
  const gitignorePath = path.join(cwd, GITIGNORE_FILE);
  try {
    if (!fs.existsSync(gitignorePath)) {
      return [];
    }
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    return content.split('\n');
  } catch (error) {
    console.error(
      `Warning: Failed to read ${GITIGNORE_FILE}: ${error instanceof Error ? error.message : String(error)}`
    );
    return [];
  }
}

/**
 * Write content to the .gitignore file
 */
function writeGitignoreFile(cwd: string, content: string): boolean {
  const gitignorePath = path.join(cwd, GITIGNORE_FILE);
  try {
    fs.writeFileSync(gitignorePath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error(
      `Warning: Failed to write ${GITIGNORE_FILE}: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

/**
 * Check if a pattern is already in the .gitignore file
 */
function isPatternInGitignore(lines: string[], pattern: string): boolean {
  return lines.some(line => {
    const trimmed = line.trim();
    return trimmed === pattern && !trimmed.startsWith('#');
  });
}

/**
 * Add an entry to .gitignore if it doesn't already exist
 */
export function ensureGitignoreEntry(
  cwd: string,
  pattern: string,
  comment?: string
): GitignoreResult {
  const lines = readGitignoreFile(cwd);

  // Check if entry already exists
  if (isPatternInGitignore(lines, pattern)) {
    return {
      success: true,
      changed: false,
      entries: [{ pattern, comment }],
      message: `Entry '${pattern}' already exists in ${GITIGNORE_FILE}`,
    };
  }

  // Add entry with comment if provided
  const newLines = [...lines];

  // Remove trailing empty lines
  while (newLines.length > 0 && newLines[newLines.length - 1].trim() === '') {
    newLines.pop();
  }

  // Add empty line if file has content
  if (newLines.length > 0) {
    newLines.push('');
  }

  // Add comment if provided
  if (comment) {
    newLines.push(`# ${comment}`);
  }

  // Add pattern
  newLines.push(pattern);

  // Ensure file ends with newline
  const content = newLines.join('\n');
  const contentWithNewline = content.endsWith('\n') ? content : content + '\n';

  if (writeGitignoreFile(cwd, contentWithNewline)) {
    return {
      success: true,
      changed: true,
      entries: [{ pattern, comment, added: true }],
      message: `Added '${pattern}' to ${GITIGNORE_FILE}`,
    };
  }

  return {
    success: false,
    changed: false,
    entries: [{ pattern, comment }],
    message: `Failed to write to ${GITIGNORE_FILE}`,
  };
}

/**
 * Ensure the backup directory is added to .gitignore
 */
export function ensureBackupDirInGitignore(cwd: string): GitignoreResult {
  return ensureGitignoreEntry(cwd, BACKUP_DIR_PATTERN, 'env-twin backup directory');
}

/**
 * Get all entries in .gitignore file
 */
export function getGitignoreEntries(cwd: string): GitignoreEntry[] {
  const lines = readGitignoreFile(cwd);
  const entries: GitignoreEntry[] = [];

  let currentComment: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (trimmed === '') {
      currentComment = undefined;
      continue;
    }

    // Handle comments
    if (trimmed.startsWith('#')) {
      currentComment = trimmed.substring(1).trim();
      continue;
    }

    // Add entry
    entries.push({
      pattern: trimmed,
      comment: currentComment,
    });

    currentComment = undefined;
  }

  return entries;
}

/**
 * Check if a pattern exists in .gitignore
 */
export function hasGitignoreEntry(cwd: string, pattern: string): boolean {
  const lines = readGitignoreFile(cwd);
  return isPatternInGitignore(lines, pattern);
}

/**
 * Check if backup directory is in .gitignore
 */
export function isBackupDirInGitignore(cwd: string): boolean {
  return hasGitignoreEntry(cwd, BACKUP_DIR_PATTERN);
}
