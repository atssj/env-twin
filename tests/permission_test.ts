import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('Permission Preservation', () => {
  const testDir = path.join(__dirname, 'test-perm-temp');

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
    if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  test('should preserve file permissions during sync', () => {
    if (process.platform === 'win32') return; // Permissions are different on Windows

    const envPath = path.join(testDir, '.env');
    const examplePath = path.join(testDir, '.env.example');
    const srcPath = path.resolve(__dirname, '../src/index.ts');

    // Create .env with restrictive permissions (0o600)
    fs.writeFileSync(envPath, 'VAR1=value1\n');
    fs.chmodSync(envPath, 0o600);

    // Verify initial permissions
    const initialStats = fs.statSync(envPath);
    expect(initialStats.mode & 0o777).toBe(0o600);

    // Create .env.example with an extra key to trigger an update
    fs.writeFileSync(examplePath, 'VAR1=value1\nVAR2=value2\n');

    // Run sync
    execSync(`bun ${srcPath} sync --yes`, { cwd: testDir });

    // Verify content updated
    const content = fs.readFileSync(envPath, 'utf-8');
    expect(content).toContain('VAR2=');

    // Verify permissions preserved
    const finalStats = fs.statSync(envPath);
    // This is expected to fail currently if the bug exists
    expect(finalStats.mode & 0o777).toBe(0o600);
  });
});
