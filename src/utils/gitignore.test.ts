import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import {
  ensureGitignoreEntry,
  ensureBackupDirInGitignore,
  getGitignoreEntries,
  hasGitignoreEntry,
  isBackupDirInGitignore,
  BACKUP_DIR_PATTERN,
  GITIGNORE_FILE,
} from './gitignore.js';

describe('gitignore module', () => {
  const testDir = path.join(__dirname, 'test-gitignore-temp');
  const gitignorePath = path.join(testDir, GITIGNORE_FILE);

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should create a new .gitignore with an entry', () => {
    const result = ensureGitignoreEntry(testDir, 'node_modules/', 'Dependencies');

    expect(result.success).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.entries[0].pattern).toBe('node_modules/');
    expect(result.entries[0].comment).toBe('Dependencies');

    const content = fs.readFileSync(gitignorePath, 'utf-8');
    expect(content).toContain('# Dependencies');
    expect(content).toContain('node_modules/');
  });

  test('should not duplicate existing entries', () => {
    ensureGitignoreEntry(testDir, 'node_modules/', 'Dependencies');
    const result = ensureGitignoreEntry(testDir, 'node_modules/', 'Dependencies');

    expect(result.success).toBe(true);
    expect(result.changed).toBe(false);

    const content = fs.readFileSync(gitignorePath, 'utf-8');
    const nodeModulesCount = (content.match(/node_modules\//g) || []).length;
    expect(nodeModulesCount).toBe(1);
  });

  test('should add multiple entries to the same file', () => {
    ensureGitignoreEntry(testDir, 'node_modules/', 'Dependencies');
    ensureGitignoreEntry(testDir, 'dist/', 'Build output');

    const content = fs.readFileSync(gitignorePath, 'utf-8');
    expect(content).toContain('node_modules/');
    expect(content).toContain('dist/');
    expect(content).toContain('# Dependencies');
    expect(content).toContain('# Build output');
  });

  test('should ensure backup directory is in .gitignore', () => {
    const result = ensureBackupDirInGitignore(testDir);

    expect(result.success).toBe(true);
    expect(result.changed).toBe(true);

    const content = fs.readFileSync(gitignorePath, 'utf-8');
    expect(content).toContain(BACKUP_DIR_PATTERN);
    expect(content).toContain('env-twin backup directory');
  });

  test('should get all gitignore entries', () => {
    ensureGitignoreEntry(testDir, 'node_modules/', 'Dependencies');
    ensureGitignoreEntry(testDir, 'dist/', 'Build output');
    ensureGitignoreEntry(testDir, '.DS_Store');

    const entries = getGitignoreEntries(testDir);

    expect(entries.length).toBe(3);
    expect(entries[0].pattern).toBe('node_modules/');
    expect(entries[0].comment).toBe('Dependencies');
    expect(entries[1].pattern).toBe('dist/');
    expect(entries[1].comment).toBe('Build output');
    expect(entries[2].pattern).toBe('.DS_Store');
    expect(entries[2].comment).toBeUndefined();
  });

  test('should check if entry exists in .gitignore', () => {
    ensureGitignoreEntry(testDir, 'node_modules/', 'Dependencies');

    expect(hasGitignoreEntry(testDir, 'node_modules/')).toBe(true);
    expect(hasGitignoreEntry(testDir, 'dist/')).toBe(false);
  });

  test('should check if backup directory is in .gitignore', () => {
    expect(isBackupDirInGitignore(testDir)).toBe(false);

    ensureBackupDirInGitignore(testDir);

    expect(isBackupDirInGitignore(testDir)).toBe(true);
  });

  test('should handle .gitignore with comments and empty lines', () => {
    // Create a .gitignore file with comments and empty lines
    const content = `# This is a comment
node_modules/

# Another section
dist/
build/

`;
    fs.writeFileSync(gitignorePath, content);

    const entries = getGitignoreEntries(testDir);

    expect(entries.length).toBe(3);
    expect(entries[0].pattern).toBe('node_modules/');
    expect(entries[1].pattern).toBe('dist/');
    expect(entries[2].pattern).toBe('build/');
  });

  test('should preserve existing content when adding new entries', () => {
    const initialContent = 'node_modules/\ndist/\n';
    fs.writeFileSync(gitignorePath, initialContent);

    const result = ensureGitignoreEntry(testDir, 'build/', 'Build output');

    expect(result.success).toBe(true);
    expect(result.changed).toBe(true);

    const content = fs.readFileSync(gitignorePath, 'utf-8');
    expect(content).toContain('node_modules/');
    expect(content).toContain('dist/');
    expect(content).toContain('build/');
  });

  test('should handle missing .gitignore gracefully', () => {
    const entries = getGitignoreEntries(testDir);

    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBe(0);
  });

  test('should trim trailing whitespace and ensure proper newline', () => {
    ensureGitignoreEntry(testDir, 'node_modules/', 'Dependencies');

    const content = fs.readFileSync(gitignorePath, 'utf-8');
    expect(content.endsWith('\n')).toBe(true);
  });
});
