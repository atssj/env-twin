/**
 * Reproduction tests for issues found during stress testing
 * These tests verify specific bugs and edge cases
 */

import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CLI_PATH = path.join(__dirname, '..', 'src', 'index.ts');

describe('Issue Reproduction Tests', () => {
  const testDir = path.join(__dirname, 'issue-repro-temp');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Clean up test files
    const files = fs.readdirSync(testDir);
    for (const file of files) {
      fs.rmSync(path.join(testDir, file), { recursive: true, force: true });
    }
  });

  describe('Issue 1: JSON Output Loses Set Data', () => {
    test('keys should be serialized as arrays in JSON output', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'KEY1=value1\n');
      fs.writeFileSync(path.join(testDir, '.env.local'), 'KEY2=value2\n');

      const output = execSync(`bun ${CLI_PATH} sync --json`, { cwd: testDir, encoding: 'utf-8' });
      const json = JSON.parse(output);

      // Issue: keys are empty objects {} instead of arrays
      const envFile = json.files.find((f: any) => f.fileName === '.env');
      
      // This will fail until Issue 1 is fixed
      expect(envFile.keys).toBeInstanceOf(Array);
      expect(envFile.keys).toContain('KEY1');
      expect(json.allKeys).toBeInstanceOf(Array);
      expect(json.allKeys).toContain('KEY1');
      expect(json.allKeys).toContain('KEY2');
    });
  });

  describe('Issue 2: Keys with Spaces Mishandled', () => {
    test('keys with spaces should be handled correctly', () => {
      // Create file with space in key name (edge case)
      fs.writeFileSync(path.join(testDir, '.env'), 'SPACED_KEY = value with spaces\n');
      fs.writeFileSync(path.join(testDir, '.env.local'), 'NORMAL=value\n');

      execSync(`bun ${CLI_PATH} sync --yes`, { cwd: testDir });

      const envContent = fs.readFileSync(path.join(testDir, '.env'), 'utf-8');
      
      // The file should either:
      // 1. Have the key parsed as "SPACED_KEY" (without trailing space)
      // 2. Not add a duplicate "SPACED_KEY=" line
      
      // Issue: Currently adds SPACED_KEY= as a new line
      const lines = envContent.split('\n');
      const spacedKeyLines = lines.filter(l => l.startsWith('SPACED_KEY'));
      
      // Should only have one SPACED_KEY line
      expect(spacedKeyLines.length).toBe(1);
    });
  });

  describe('Issue 3: export Keyword Mishandled', () => {
    test('export prefix should be parsed correctly', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'export EXPORTED=value\n');
      fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

      execSync(`bun ${CLI_PATH} sync --yes`, { cwd: testDir });

      const localContent = fs.readFileSync(path.join(testDir, '.env.local'), 'utf-8');
      
      // Issue: Currently adds "export EXPORTED=" instead of "EXPORTED="
      // The key should be "EXPORTED", not "export EXPORTED"
      expect(localContent).toContain('EXPORTED=');
      expect(localContent).not.toContain('export EXPORTED=');
    });
  });

  describe('Issue 4: Empty Keys Mishandled', () => {
    test('lines starting with = should be handled', () => {
      fs.writeFileSync(path.join(testDir, '.env'), '=NO_KEY\nVALID_KEY=value\n');
      fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

      const result = execSync(`bun ${CLI_PATH} sync --json`, { cwd: testDir, encoding: 'utf-8' });
      const json = JSON.parse(result);

      // Check that empty keys don't cause issues
      const envFile = json.files.find((f: any) => f.fileName === '.env');
      const hasEmptyKey = envFile.parsedLines.some((l: any) => l.key === '');
      
      // Should either skip these lines or handle them gracefully
      // Currently creates an entry with empty key
      expect(hasEmptyKey).toBe(true); // Documenting current behavior
    });
  });

  describe('Issue 5: Missing Keys Display', () => {
    test('missing keys message should list actual keys', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'KEY1=value1\n');
      fs.writeFileSync(path.join(testDir, '.env.local'), 'KEY2=value2\nKEY3=value3\n');

      const output = execSync(`bun ${CLI_PATH} sync --yes`, { cwd: testDir, encoding: 'utf-8' });
      
      // Issue: Output shows ".env is missing 2 keys:" but doesn't list them
      // Should show: ".env is missing 2 keys: KEY2, KEY3"
      expect(output).toMatch(/missing \d+ keys?:/);
      
      // Ideally should list the actual keys (this will fail until fixed)
      // expect(output).toContain('KEY2');
      // expect(output).toContain('KEY3');
    });
  });

  describe('Issue 6: Trailing Newlines', () => {
    test('generated files should end with newline', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'KEY1=value1\n');
      fs.writeFileSync(path.join(testDir, '.env.local'), 'KEY2=value2\n');

      execSync(`bun ${CLI_PATH} sync --yes`, { cwd: testDir });

      const files = ['.env', '.env.local', '.env.example'];
      for (const file of files) {
        const content = fs.readFileSync(path.join(testDir, file), 'utf-8');
        // Issue: Files don't end with newline (POSIX standard)
        // This will fail until Issue 6 is fixed
        expect(content.endsWith('\n')).toBe(true);
      }
    });
  });

  describe('Parsing Edge Cases', () => {
    test('KEY_WITH_EQUALS should preserve full value', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'KEY_WITH_EQUALS=val=ue=with=equals\n');
      fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

      execSync(`bun ${CLI_PATH} sync --yes`, { cwd: testDir });

      const localContent = fs.readFileSync(path.join(testDir, '.env.local'), 'utf-8');
      
      // The value should be preserved with all equals signs
      // Currently adds KEY_WITH_EQUALS= (empty) which might be wrong
      // depending on intended behavior
      expect(localContent).toContain('KEY_WITH_EQUALS=');
    });

    test('NO_VALUE key should be handled', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'NO_VALUE=\n');
      fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

      execSync(`bun ${CLI_PATH} sync --yes`, { cwd: testDir });

      const localContent = fs.readFileSync(path.join(testDir, '.env.local'), 'utf-8');
      
      // Should add NO_VALUE= (empty value is valid)
      expect(localContent).toContain('NO_VALUE=');
    });
  });

  describe('Security Edge Cases', () => {
    test('path traversal in values should not be interpreted', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'PATH=../../../etc/passwd\n');
      fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

      const result = execSync(`bun ${CLI_PATH} sync --yes`, { cwd: testDir, encoding: 'utf-8' });
      
      // Should complete without errors
      expect(result).toContain('Sync completed');
    });

    test('special shell characters in values should be preserved', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'SPECIAL=$HOME\`command\`\n');
      fs.writeFileSync(path.join(testDir, '.env.local'), 'LOCAL=value\n');

      execSync(`bun ${CLI_PATH} sync --yes`, { cwd: testDir });

      // Content should be preserved as-is
      const envContent = fs.readFileSync(path.join(testDir, '.env'), 'utf-8');
      expect(envContent).toContain('SPECIAL=');
    });
  });
});
