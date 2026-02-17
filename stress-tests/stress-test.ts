#!/usr/bin/env bun
/**
 * Comprehensive Stress Tests for env-twin
 * Tests edge cases, error scenarios, and unusual conditions
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TEST_BASE_DIR = path.join(__dirname, 'test-scenarios');
const CLI_PATH = path.join(__dirname, '..', 'src', 'index.ts');

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function ensureCleanDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function runCli(args: string, cwd: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`bun ${CLI_PATH} ${args}`, { 
      cwd, 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: any) {
    return { 
      stdout: error.stdout || '', 
      stderr: error.stderr || '', 
      exitCode: error.status || 1 
    };
  }
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.push({ 
      name, 
      passed: false, 
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start
    });
    console.log(`❌ ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// STRESS TEST SCENARIOS
// ============================================================================

async function testUnicodeAndSpecialCharacters() {
  const testDir = path.join(TEST_BASE_DIR, 'unicode-test');
  ensureCleanDir(testDir);

  // Test with unicode variable names and values
  fs.writeFileSync(path.join(testDir, '.env'), `
# Unicode test
VAR_üñíçödé=value1
EMOJI_🚀=rocket
CHINESE_中文=chinese
ARABIC_عربي=arabic
SPECIAL_\n=newline
SPECIAL_\t=tab
  `.trim());

  fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR_LOCAL=value\n');

  const result = runCli('sync --yes', testDir);
  
  // Check if sync handled unicode properly
  const envContent = fs.readFileSync(path.join(testDir, '.env'), 'utf-8');
  
  if (!envContent.includes('VAR_LOCAL=')) {
    throw new Error('Sync failed to add VAR_LOCAL to .env');
  }
}

async function testVeryLongValues() {
  const testDir = path.join(TEST_BASE_DIR, 'long-values');
  ensureCleanDir(testDir);

  // Create a value with 100KB of data
  const longValue = 'A'.repeat(100 * 1024);
  fs.writeFileSync(path.join(testDir, '.env'), `LONG_VAR=${longValue}\n`);
  fs.writeFileSync(path.join(testDir, '.env.local'), 'OTHER=value\n');

  const result = runCli('sync --yes', testDir);
  
  const envContent = fs.readFileSync(path.join(testDir, '.env'), 'utf-8');
  if (!envContent.includes('OTHER=')) {
    throw new Error('Sync failed with very long values');
  }
}

async function testMalformedEnvFiles() {
  const testDir = path.join(TEST_BASE_DIR, 'malformed');
  ensureCleanDir(testDir);

  // Various malformed env files
  fs.writeFileSync(path.join(testDir, '.env'), `
# Valid line
VALID_KEY=value
MALFORMED_NO_EQUALS
=VALUE_ONLY
KEY_WITH_EQUALS_INSIDE=value=with=equals
QUOTED="value with spaces"
SINGLE_QUOTED='single quoted'
EXPORT EXPORTED_KEY=value
  `);

  fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL_KEY=local\n');

  const result = runCli('sync --yes', testDir);
  
  // Should complete without crashing
  if (result.exitCode !== 0 && !result.stdout.includes('Sync completed')) {
    throw new Error(`Sync failed with malformed file: ${result.stderr}`);
  }
}

async function testEmptyAndWhitespaceOnlyFiles() {
  const testDir = path.join(TEST_BASE_DIR, 'empty-files');
  ensureCleanDir(testDir);

  // Completely empty file
  fs.writeFileSync(path.join(testDir, '.env'), '');
  // Whitespace only file
  fs.writeFileSync(path.join(testDir, '.env.local'), '   \n\n   \n');
  // File with only newlines
  fs.writeFileSync(path.join(testDir, '.env.development'), '\n\n\n');

  const result = runCli('sync --yes', testDir);
  
  // Should handle gracefully
  if (result.exitCode !== 0) {
    throw new Error(`Failed with empty/whitespace files: ${result.stderr}`);
  }
}

async function testManyFiles() {
  const testDir = path.join(TEST_BASE_DIR, 'many-files');
  ensureCleanDir(testDir);

  // Create 50 env files
  for (let i = 0; i < 50; i++) {
    fs.writeFileSync(path.join(testDir, `.env.file${i}`), `VAR_${i}=value${i}\n`);
  }

  const result = runCli('sync --yes', testDir);
  
  // Should complete without issues
  if (result.exitCode !== 0) {
    throw new Error(`Failed with many files: ${result.stderr}`);
  }
}

async function testManyVariables() {
  const testDir = path.join(TEST_BASE_DIR, 'many-variables');
  ensureCleanDir(testDir);

  // Create file with 1000 variables
  let content = '';
  for (let i = 0; i < 1000; i++) {
    content += `VARIABLE_${i}=value_${i}\n`;
  }
  fs.writeFileSync(path.join(testDir, '.env'), content);
  fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL_VAR=local\n');

  const result = runCli('sync --yes', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`Failed with many variables: ${result.stderr}`);
  }

  // Verify local var was added
  const envContent = fs.readFileSync(path.join(testDir, '.env'), 'utf-8');
  if (!envContent.includes('LOCAL_VAR=')) {
    throw new Error('LOCAL_VAR not added to .env');
  }
}

async function testBinaryGarbageInEnv() {
  const testDir = path.join(TEST_BASE_DIR, 'binary-garbage');
  ensureCleanDir(testDir);

  // Write some binary garbage followed by valid content
  const garbage = Buffer.concat([
    Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe]),
    Buffer.from('VALID_KEY=valid_value\n'),
    Buffer.from([0x00, 0x01]),
    Buffer.from('ANOTHER_KEY=another_value\n')
  ]);
  
  fs.writeFileSync(path.join(testDir, '.env'), garbage);
  fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

  const result = runCli('sync --yes', testDir);
  
  // Should handle gracefully (may show warnings but not crash)
  console.log(`    Binary garbage test exit code: ${result.exitCode}`);
}

async function testPathTraversalInEnvContent() {
  const testDir = path.join(TEST_BASE_DIR, 'path-traversal');
  ensureCleanDir(testDir);

  // These should not be interpreted as file paths
  fs.writeFileSync(path.join(testDir, '.env'), `
KEY=../../../etc/passwd
ANOTHER=/absolute/path/test
RELATIVE=./relative/path
`);
  fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

  const result = runCli('sync --yes', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`Failed with path-like values: ${result.stderr}`);
  }
}

async function testCircularReferences() {
  const testDir = path.join(TEST_BASE_DIR, 'circular');
  ensureCleanDir(testDir);

  // Files that reference each other's variables
  fs.writeFileSync(path.join(testDir, '.env'), 'ENV_VAR=${LOCAL_VAR}\n');
  fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL_VAR=${ENV_VAR}\n');

  const result = runCli('sync --yes', testDir);
  
  // Should handle without issues
  if (result.exitCode !== 0) {
    throw new Error(`Failed with circular-like content: ${result.stderr}`);
  }
}

async function testRapidSuccessiveSyncs() {
  const testDir = path.join(TEST_BASE_DIR, 'rapid-syncs');
  ensureCleanDir(testDir);

  fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\n');
  fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR2=value2\n');

  // Run 10 syncs in rapid succession
  for (let i = 0; i < 10; i++) {
    const result = runCli('sync --yes', testDir);
    if (result.exitCode !== 0) {
      throw new Error(`Rapid sync ${i} failed: ${result.stderr}`);
    }
  }
}

async function testRestoreWithoutBackups() {
  const testDir = path.join(TEST_BASE_DIR, 'no-backups');
  ensureCleanDir(testDir);

  // Try to restore when no backups exist
  const result = runCli('restore --yes', testDir);
  
  // Should fail gracefully with helpful message
  if (result.exitCode === 0) {
    throw new Error('Restore should fail when no backups exist');
  }
  
  if (!result.stderr.includes('No backups') && !result.stdout.includes('No backups')) {
    console.log(`    Warning: Expected 'No backups' message but got: ${result.stderr || result.stdout}`);
  }
}

async function testRestoreCorruptedBackup() {
  const testDir = path.join(TEST_BASE_DIR, 'corrupted-backup');
  ensureCleanDir(testDir);

  fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\n');
  fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR2=value2\n');

  // Create a backup
  runCli('sync --yes', testDir);

  // Corrupt the backup file
  const backupDir = path.join(testDir, '.env-twin');
  const files = fs.readdirSync(backupDir);
  for (const file of files) {
    fs.writeFileSync(path.join(backupDir, file), '\x00\x01\x02corrupted');
  }

  // Try to restore corrupted backup
  const result = runCli('restore --yes', testDir);
  
  console.log(`    Corrupted backup test - exit code: ${result.exitCode}`);
}

async function testConcurrentModifications() {
  const testDir = path.join(TEST_BASE_DIR, 'concurrent');
  ensureCleanDir(testDir);

  fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\n');
  fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR2=value2\n');

  // Create backup
  runCli('sync --yes', testDir);

  // Modify file during restore (simulate by running concurrently)
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(Promise.resolve(runCli('sync --yes', testDir)));
  }

  await Promise.all(promises);
  
  // Should complete without crashes
}

async function testPermissionDenied() {
  const testDir = path.join(TEST_BASE_DIR, 'permissions');
  ensureCleanDir(testDir);

  fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\n');
  fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR2=value2\n');

  // Make file read-only (Unix only)
  if (process.platform !== 'win32') {
    fs.chmodSync(path.join(testDir, '.env'), 0o444);

    try {
      const result = runCli('sync --yes', testDir);
      console.log(`    Permission test - exit code: ${result.exitCode}`);
    } finally {
      // Restore permissions for cleanup
      fs.chmodSync(path.join(testDir, '.env'), 0o644);
    }
  }
}

async function testVeryLongKeyNames() {
  const testDir = path.join(TEST_BASE_DIR, 'long-keys');
  ensureCleanDir(testDir);

  // Key with 500 characters
  const longKey = 'A'.repeat(500);
  fs.writeFileSync(path.join(testDir, '.env'), `${longKey}=value\n`);
  fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

  const result = runCli('sync --yes', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`Failed with long key names: ${result.stderr}`);
  }
}

async function testSpecialCharactersInKeys() {
  const testDir = path.join(TEST_BASE_DIR, 'special-keys');
  ensureCleanDir(testDir);

  fs.writeFileSync(path.join(testDir, '.env'), `
KEY-WITH-DASH=value1
KEY.WITH.DOTS=value2
KEY@WITH@AT=value3
KEY#WITH#HASH=value4
KEY$WITH$DOLLAR=value5
KEY%WITH%PERCENT=value6
KEY&WITH&ampersand=value7
KEY*WITH*STAR=value8
KEY+WITH+PLUS=value9
KEY=WITH=EQUALS=value10
KEY?WITH?QUESTION=value11
KEY[WITH[BRACKET=value12
`);

  fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

  const result = runCli('sync --yes', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`Failed with special characters in keys: ${result.stderr}`);
  }
}

async function testDuplicateKeys() {
  const testDir = path.join(TEST_BASE_DIR, 'duplicate-keys');
  ensureCleanDir(testDir);

  // File with duplicate keys (last one should win typically)
  fs.writeFileSync(path.join(testDir, '.env'), `
DUPLICATE=first
DUPLICATE=second
DUPLICATE=third
`);

  fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

  const result = runCli('sync --yes', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`Failed with duplicate keys: ${result.stderr}`);
  }
}

async function testMultilineValues() {
  const testDir = path.join(TEST_BASE_DIR, 'multiline');
  ensureCleanDir(testDir);

  // Various multiline formats
  fs.writeFileSync(path.join(testDir, '.env'), `
SIMPLE_MULTILINE="line1\nline2\nline3"
JSON_VALUE='{"key": "value", "array": [1,2,3]}'
HEREDOC_STYLE="BEGIN\n  indented content\n  more content\nEND"
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEp...\n-----END RSA PRIVATE KEY-----"
`);

  fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

  const result = runCli('sync --yes', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`Failed with multiline values: ${result.stderr}`);
  }
}

async function testCleanBackupsEdgeCases() {
  const testDir = path.join(TEST_BASE_DIR, 'clean-backups');
  ensureCleanDir(testDir);

  // Try clean with no backups
  let result = runCli('clean-backups --yes', testDir);
  console.log(`    Clean with no backups - exit code: ${result.exitCode}`);

  // Create a few backups
  fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\n');
  fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR2=value2\n');
  
  runCli('sync --yes', testDir);
  
  // Modify and sync again
  fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=modified\n');
  runCli('sync --yes', testDir);

  // Clean keeping more than exist
  result = runCli('clean-backups --keep 100 --yes', testDir);
  if (result.exitCode !== 0) {
    throw new Error(`clean-backups failed: ${result.stderr}`);
  }

  // Clean keeping 0 (edge case)
  result = runCli('clean-backups --keep 0 --yes', testDir);
  console.log(`    Clean with keep=0 - exit code: ${result.exitCode}`);
}

async function testInvalidTimestamps() {
  const testDir = path.join(TEST_BASE_DIR, 'invalid-timestamps');
  ensureCleanDir(testDir);

  fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\n');
  runCli('sync --yes', testDir);

  // Try restore with various invalid timestamps
  const invalidTimestamps = [
    'not-a-timestamp',
    '20241301-000000', // invalid month
    '20240132-000000', // invalid day
    '20240101-250000', // invalid hour
    '20240101-006000', // invalid minute
    '20240101-000060', // invalid second
    '',
    '2024',
    '../../etc/passwd',
    '..-..-..',
  ];

  for (const ts of invalidTimestamps) {
    const result = runCli(`restore ${ts} --yes`, testDir);
    console.log(`    Invalid timestamp '${ts}' - exit code: ${result.exitCode}`);
  }
}

async function testNestedDirectoriesInEnvFiles() {
  const testDir = path.join(TEST_BASE_DIR, 'nested-dirs');
  ensureCleanDir(testDir);

  // Create subdirectory structure (which shouldn't be scanned)
  fs.mkdirSync(path.join(testDir, 'subproject'), { recursive: true });
  fs.writeFileSync(path.join(testDir, 'subproject', '.env'), 'SUBPROJECT=sub\n');

  // Main env files
  fs.writeFileSync(path.join(testDir, '.env'), 'MAIN=main\n');
  fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=local\n');

  const result = runCli('sync --yes', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`Failed: ${result.stderr}`);
  }

  // Verify subproject .env was not modified
  const subContent = fs.readFileSync(path.join(testDir, 'subproject', '.env'), 'utf-8');
  if (subContent.includes('MAIN=') || subContent.includes('LOCAL=')) {
    throw new Error('Subproject .env was incorrectly modified');
  }
}

async function testSymlinkHandling() {
  const testDir = path.join(TEST_BASE_DIR, 'symlinks');
  ensureCleanDir(testDir);

  fs.writeFileSync(path.join(testDir, '.env.real'), 'REAL=value\n');
  fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

  // Create symlink (Unix only)
  if (process.platform !== 'win32') {
    fs.symlinkSync(
      path.join(testDir, '.env.real'),
      path.join(testDir, '.env')
    );

    const result = runCli('sync --yes', testDir);
    console.log(`    Symlink test - exit code: ${result.exitCode}`);
  }
}

async function testBackupDirectoryPermissions() {
  const testDir = path.join(TEST_BASE_DIR, 'backup-perms');
  ensureCleanDir(testDir);

  fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\n');
  fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR2=value2\n');

  // Pre-create backup dir with wrong permissions
  fs.mkdirSync(path.join(testDir, '.env-twin'), { recursive: true });
  
  if (process.platform !== 'win32') {
    fs.chmodSync(path.join(testDir, '.env-twin'), 0o555); // read-only

    try {
      const result = runCli('sync --yes', testDir);
      console.log(`    Backup dir read-only test - exit code: ${result.exitCode}`);
    } finally {
      fs.chmodSync(path.join(testDir, '.env-twin'), 0o755);
    }
  }
}

async function testJsonOutput() {
  const testDir = path.join(TEST_BASE_DIR, 'json-output');
  ensureCleanDir(testDir);

  fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\n');
  fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR2=value2\n');

  const result = runCli('sync --json', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`JSON output failed: ${result.stderr}`);
  }

  // Verify output is valid JSON
  try {
    const json = JSON.parse(result.stdout);
    if (!json.files || !Array.isArray(json.files)) {
      throw new Error('JSON output missing files array');
    }
  } catch (e) {
    throw new Error(`Invalid JSON output: ${e}`);
  }
}

async function testSourceOfTruthOverride() {
  const testDir = path.join(TEST_BASE_DIR, 'source-override');
  ensureCleanDir(testDir);

  fs.writeFileSync(path.join(testDir, '.env'), 'ENV_ONLY=env\nSHARED=from_env\n');
  fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL_ONLY=local\nSHARED=from_local\n');
  fs.writeFileSync(path.join(testDir, '.env.example'), 'EXAMPLE_ONLY=example\nSHARED=from_example\n');

  // Sync with explicit source
  let result = runCli('sync --source .env.example --yes', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`Source override failed: ${result.stderr}`);
  }

  // Verify .env now has EXAMPLE_ONLY
  const envContent = fs.readFileSync(path.join(testDir, '.env'), 'utf-8');
  if (!envContent.includes('EXAMPLE_ONLY=')) {
    throw new Error('Source override did not work correctly');
  }
}

async function testDryRunMode() {
  const testDir = path.join(TEST_BASE_DIR, 'dry-run');
  ensureCleanDir(testDir);

  fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\n');
  fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR2=value2\n');

  // Get initial content
  const initialContent = fs.readFileSync(path.join(testDir, '.env'), 'utf-8');

  // Run sync with dry-run
  const result = runCli('sync --dry-run --yes', testDir);
  
  // Note: The sync command doesn't have dry-run flag, but restore does
  // This test checks if dry-run is handled gracefully
  console.log(`    Dry-run test - exit code: ${result.exitCode}`);
}

async function testVerboseMode() {
  const testDir = path.join(TEST_BASE_DIR, 'verbose');
  ensureCleanDir(testDir);

  fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\n');
  runCli('sync --yes', testDir);

  fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=modified\n');

  const result = runCli('restore --verbose --yes', testDir);
  
  // Should produce verbose output
  if (!result.stdout.includes('Starting') && !result.stdout.includes('restore')) {
    console.log(`    Warning: Verbose mode may not be producing expected output`);
  }
}

async function testEmptySourceOfTruth() {
  const testDir = path.join(TEST_BASE_DIR, 'empty-source');
  ensureCleanDir(testDir);

  // .env.example exists but is empty
  fs.writeFileSync(path.join(testDir, '.env.example'), '');
  fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\n');
  fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR2=value2\n');

  const result = runCli('sync --source .env.example --yes', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`Empty source of truth failed: ${result.stderr}`);
  }
}

async function testOnlyCommentsInFiles() {
  const testDir = path.join(TEST_BASE_DIR, 'only-comments');
  ensureCleanDir(testDir);

  fs.writeFileSync(path.join(testDir, '.env'), `# Just a comment
# Another comment
`);
  fs.writeFileSync(path.join(testDir, '.env.local'), `# Local comment
LOCAL=value
`);

  const result = runCli('sync --yes', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`Only comments test failed: ${result.stderr}`);
  }
}

async function testWindowsLineEndings() {
  const testDir = path.join(TEST_BASE_DIR, 'windows-endings');
  ensureCleanDir(testDir);

  // File with Windows line endings (CRLF)
  fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\r\nVAR2=value2\r\n');
  fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR3=value3\r\n');

  const result = runCli('sync --yes', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`Windows line endings failed: ${result.stderr}`);
  }
}

async function testMixedLineEndings() {
  const testDir = path.join(TEST_BASE_DIR, 'mixed-endings');
  ensureCleanDir(testDir);

  // File with mixed line endings
  fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\r\nVAR2=value2\nVAR3=value3\r\n');
  fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR4=value4\n');

  const result = runCli('sync --yes', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`Mixed line endings failed: ${result.stderr}`);
  }
}

async function testVeryDeepNestingInValues() {
  const testDir = path.join(TEST_BASE_DIR, 'deep-nesting');
  ensureCleanDir(testDir);

  // Deeply nested JSON
  let deepJson = '{"level":0}';
  for (let i = 1; i < 100; i++) {
    deepJson = `{"level":${i},"nested":${deepJson}}`;
  }
  
  fs.writeFileSync(path.join(testDir, '.env'), `DEEP_JSON='${deepJson}'\n`);
  fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

  const result = runCli('sync --yes', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`Deep nesting failed: ${result.stderr}`);
  }
}

async function testEnvironmentVariableExpansionInValues() {
  const testDir = path.join(TEST_BASE_DIR, 'env-expansion');
  ensureCleanDir(testDir);

  // Values that look like shell variable expansion
  fs.writeFileSync(path.join(testDir, '.env'), `
HOME_DIR=$HOME
USER_NAME=\${USER}
COMPLEX=\${VAR:-default}
BACKTICK=\`command\`
PAREN=\$(command)
`);

  fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

  const result = runCli('sync --yes', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`Env expansion test failed: ${result.stderr}`);
  }
}

async function testBase64EncodedValues() {
  const testDir = path.join(TEST_BASE_DIR, 'base64');
  ensureCleanDir(testDir);

  // Base64 encoded values (common for secrets)
  const base64Value = Buffer.from('secret data here').toString('base64');
  fs.writeFileSync(path.join(testDir, '.env'), `BASE64_SECRET=${base64Value}\n`);
  fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

  const result = runCli('sync --yes', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`Base64 test failed: ${result.stderr}`);
  }
}

async function testUrlValues() {
  const testDir = path.join(TEST_BASE_DIR, 'url-values');
  ensureCleanDir(testDir);

  // Various URL formats
  fs.writeFileSync(path.join(testDir, '.env'), `
DATABASE_URL=postgres://user:pass@localhost:5432/db?sslmode=require
REDIS_URL=redis://:password@localhost:6379/0
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/db
HTTPS_URL=https://user:pass@api.example.com/v1?param=value&other=test
`);

  fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

  const result = runCli('sync --yes', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`URL values test failed: ${result.stderr}`);
  }
}

async function testNullBytesAndControlChars() {
  const testDir = path.join(TEST_BASE_DIR, 'control-chars');
  ensureCleanDir(testDir);

  // Values with control characters
  fs.writeFileSync(path.join(testDir, '.env'), `
TAB_VALUE="value\twith\ttabs"
NEWLINE_VALUE="value\nwith\nnewlines"
CARRIAGE_RETURN="value\rwith\rcarriage"
BELL=beep\x07
`);

  fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

  const result = runCli('sync --yes', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`Control chars test failed: ${result.stderr}`);
  }
}

async function testBackupTamperingDetection() {
  const testDir = path.join(TEST_BASE_DIR, 'tamper-detection');
  ensureCleanDir(testDir);

  fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\n');
  fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR2=value2\n');

  // Create backup
  runCli('sync --yes', testDir);

  // Tamper with backup by adding extra files
  const backupDir = path.join(testDir, '.env-twin');
  const files = fs.readdirSync(backupDir);
  if (files.length > 0) {
    const timestamp = files[0].match(/\.(\d{8}-\d{6})$/)?.[1];
    if (timestamp) {
      // Add a file that shouldn't be there
      fs.writeFileSync(path.join(backupDir, `fakefile.${timestamp}`), 'fake content');
      
      const result = runCli('restore --yes', testDir);
      console.log(`    Tamper detection test - exit code: ${result.exitCode}`);
    }
  }
}

async function testNonExistentSourceOfTruth() {
  const testDir = path.join(TEST_BASE_DIR, 'nonexistent-source');
  ensureCleanDir(testDir);

  fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\n');

  // Try to use non-existent source
  const result = runCli('sync --source .env.nonexistent --yes', testDir);
  
  console.log(`    Non-existent source test - exit code: ${result.exitCode}`);
}

async function testCaseSensitivity() {
  const testDir = path.join(TEST_BASE_DIR, 'case-sensitivity');
  ensureCleanDir(testDir);

  // Test case sensitivity
  fs.writeFileSync(path.join(testDir, '.env'), `
lowercase=value1
UPPERCASE=value2
MixedCase=value3
lowercase=duplicate
`);

  fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

  const result = runCli('sync --yes', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`Case sensitivity test failed: ${result.stderr}`);
  }
}

async function testFileWithOnlyBOM() {
  const testDir = path.join(TEST_BASE_DIR, 'bom-only');
  ensureCleanDir(testDir);

  // File with only UTF-8 BOM
  fs.writeFileSync(path.join(testDir, '.env'), '\ufeff');
  fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

  const result = runCli('sync --yes', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`BOM-only file test failed: ${result.stderr}`);
  }
}

async function testFileWithBOMAndContent() {
  const testDir = path.join(TEST_BASE_DIR, 'bom-content');
  ensureCleanDir(testDir);

  // File with UTF-8 BOM and content
  fs.writeFileSync(path.join(testDir, '.env'), '\ufeffVAR1=value1\n');
  fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR2=value2\n');

  const result = runCli('sync --yes', testDir);
  
  if (result.exitCode !== 0) {
    throw new Error(`BOM with content test failed: ${result.stderr}`);
  }
}

async function testFileSizeLimits() {
  const testDir = path.join(TEST_BASE_DIR, 'large-file');
  ensureCleanDir(testDir);

  // Create a 10MB env file
  const line = 'A'.repeat(1000);
  let content = '';
  for (let i = 0; i < 10000; i++) {
    content += `VAR_${i}=${line}\n`;
  }
  
  fs.writeFileSync(path.join(testDir, '.env'), content);
  fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

  const startTime = Date.now();
  const result = runCli('sync --yes', testDir);
  const duration = Date.now() - startTime;
  
  console.log(`    Large file (10MB) sync took ${duration}ms - exit code: ${result.exitCode}`);
  
  if (duration > 30000) {
    console.log(`    Warning: Large file sync took over 30 seconds`);
  }
}

async function testConcurrentBackupAccess() {
  const testDir = path.join(TEST_BASE_DIR, 'concurrent-backup');
  ensureCleanDir(testDir);

  fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\n');
  fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR2=value2\n');

  // Run multiple syncs concurrently
  const promises = [];
  for (let i = 0; i < 5; i++) {
    fs.writeFileSync(path.join(testDir, '.env'), `VAR1=value${i}\n`);
    promises.push(Promise.resolve(runCli('sync --yes', testDir)));
  }

  const syncResults = await Promise.all(promises);
  const failures = syncResults.filter(r => r.exitCode !== 0);
  
  console.log(`    Concurrent backup access: ${failures.length} failures out of 5`);
}

async function testMemoryLeaks() {
  const testDir = path.join(TEST_BASE_DIR, 'memory-test');
  ensureCleanDir(testDir);

  // Monitor memory usage over many operations
  const initialMemory = process.memoryUsage().heapUsed;
  
  for (let i = 0; i < 100; i++) {
    fs.writeFileSync(path.join(testDir, '.env'), `VAR_${i}=value${i}\n`);
    fs.writeFileSync(path.join(testDir, '.env.local'), `LOCAL_${i}=local${i}\n`);
    runCli('sync --yes', testDir);
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  const finalMemory = process.memoryUsage().heapUsed;
  const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024;
  
  console.log(`    Memory growth after 100 syncs: ${memoryGrowth.toFixed(2)} MB`);
  
  if (memoryGrowth > 100) {
    console.log(`    Warning: Significant memory growth detected`);
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n🧪 Starting env-twin Stress Tests\n');
  console.log('=' .repeat(60));
  
  // Clean up any previous test runs
  ensureCleanDir(TEST_BASE_DIR);

  // Run all tests
  const tests = [
    // Character encoding and content tests
    ['Unicode and Special Characters', testUnicodeAndSpecialCharacters],
    ['Very Long Values (100KB)', testVeryLongValues],
    ['Malformed Env Files', testMalformedEnvFiles],
    ['Empty and Whitespace Only Files', testEmptyAndWhitespaceOnlyFiles],
    ['Binary Garbage in Env', testBinaryGarbageInEnv],
    ['Path Traversal in Values', testPathTraversalInEnvContent],
    ['Multiline Values', testMultilineValues],
    ['Windows Line Endings', testWindowsLineEndings],
    ['Mixed Line Endings', testMixedLineEndings],
    ['Null Bytes and Control Chars', testNullBytesAndControlChars],
    ['BOM Only File', testFileWithOnlyBOM],
    ['BOM With Content', testFileWithBOMAndContent],
    
    // Key name tests
    ['Very Long Key Names (500 chars)', testVeryLongKeyNames],
    ['Special Characters in Keys', testSpecialCharactersInKeys],
    ['Duplicate Keys', testDuplicateKeys],
    ['Case Sensitivity', testCaseSensitivity],
    
    // Value type tests
    ['Circular References', testCircularReferences],
    ['Deep Nesting in Values', testVeryDeepNestingInValues],
    ['Environment Variable Expansion', testEnvironmentVariableExpansionInValues],
    ['Base64 Encoded Values', testBase64EncodedValues],
    ['URL Values', testUrlValues],
    
    // Scale tests
    ['Many Files (50 files)', testManyFiles],
    ['Many Variables (1000 vars)', testManyVariables],
    ['Large File (10MB)', testFileSizeLimits],
    
    // Concurrency tests
    ['Rapid Successive Syncs', testRapidSuccessiveSyncs],
    ['Concurrent Modifications', testConcurrentModifications],
    ['Concurrent Backup Access', testConcurrentBackupAccess],
    
    // Backup/restore tests
    ['Restore Without Backups', testRestoreWithoutBackups],
    ['Restore Corrupted Backup', testRestoreCorruptedBackup],
    ['Clean Backups Edge Cases', testCleanBackupsEdgeCases],
    ['Invalid Timestamps', testInvalidTimestamps],
    ['Backup Tampering Detection', testBackupTamperingDetection],
    
    // File system tests
    ['Nested Directories', testNestedDirectoriesInEnvFiles],
    ['Symlink Handling', testSymlinkHandling],
    ['Permission Denied', testPermissionDenied],
    ['Backup Directory Permissions', testBackupDirectoryPermissions],
    
    // Command tests
    ['JSON Output', testJsonOutput],
    ['Source of Truth Override', testSourceOfTruthOverride],
    ['Empty Source of Truth', testEmptySourceOfTruth],
    ['Non-Existent Source of Truth', testNonExistentSourceOfTruth],
    ['Only Comments in Files', testOnlyCommentsInFiles],
    ['Dry Run Mode', testDryRunMode],
    ['Verbose Mode', testVerboseMode],
    
    // Memory tests
    ['Memory Leaks', testMemoryLeaks],
  ];

  for (const [name, testFn] of tests) {
    await runTest(name as string, testFn as () => Promise<void>);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`Total tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total duration: ${(totalDuration / 1000).toFixed(2)}s`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }

  // Cleanup
  fs.rmSync(TEST_BASE_DIR, { recursive: true, force: true });
  
  console.log('\n✨ Stress testing complete!\n');
  
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
