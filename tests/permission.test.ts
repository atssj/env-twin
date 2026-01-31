import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('Security: Permission Preservation', () => {
  const testDir = path.join(__dirname, 'test-security-temp');
  const envPath = path.join(testDir, '.env');
  const envLocalPath = path.join(testDir, '.env.local');

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
    // Clean up test files before each test
    const envFiles = ['.env', '.env.local', '.env.example'];
    envFiles.forEach(file => {
      const filePath = path.join(testDir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    // Clean up backup directory
    const backupDir = path.join(testDir, '.env-twin');
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
  });

  test('should preserve file permissions during atomic write', () => {
    if (process.platform === 'win32') return; // Skip permission check on Windows

    // 1. Create .env with restricted permissions (0600)
    fs.writeFileSync(envPath, 'SECRET_KEY=12345\n');
    fs.chmodSync(envPath, 0o600);

    // Verify initial permissions
    const initialStats = fs.statSync(envPath);
    expect(initialStats.mode & 0o777).toBe(0o600);

    // 2. Create another file to trigger a sync
    fs.writeFileSync(envLocalPath, 'OTHER_KEY=abc\n');

    // 3. Run sync
    try {
      execSync(`bun ${path.join(__dirname, '../src/index.ts')} sync --yes`, { cwd: testDir });
    } catch (e) {
      console.error('Sync failed', e);
    }

    // 4. Verify permissions are preserved
    const finalStats = fs.statSync(envPath);

    // This is expected to fail if the vulnerability exists
    expect(finalStats.mode & 0o777).toBe(0o600);
  });
});
