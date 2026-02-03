import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('env-twin CLI Permissions Security', () => {
  const testDir = path.join(__dirname, 'test-perms-temp');
  const indexScript = path.resolve(__dirname, '../src/index.ts');

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
    // Clean
    const files = fs.readdirSync(testDir);
    for (const file of files) {
      fs.rmSync(path.join(testDir, file), { recursive: true, force: true });
    }
  });

  test('should preserve 0600 permissions when syncing existing sensitive files', () => {
    if (process.platform === 'win32') return; // Skip on Windows

    const envFile = path.join(testDir, '.env');
    const localEnvFile = path.join(testDir, '.env.local');

    // 1. Create .env with 0600
    fs.writeFileSync(envFile, 'VAR1=value1\n', { mode: 0o600 });
    // 2. Create .env.local with new key to trigger sync
    fs.writeFileSync(localEnvFile, 'VAR2=value2\n', { mode: 0o600 });

    const originalStat = fs.statSync(envFile);
    expect(originalStat.mode & 0o777).toBe(0o600);

    // 3. Run sync
    try {
        execSync(`bun ${indexScript} sync --yes`, { cwd: testDir });
    } catch (e) {
        console.error('Sync failed:', e);
        throw e;
    }

    // 4. Check permissions of .env (it should have received VAR2)
    const content = fs.readFileSync(envFile, 'utf-8');
    expect(content).toContain('VAR2='); // Verify it was actually written to

    const newStat = fs.statSync(envFile);
    // Should still be 600
    if ((newStat.mode & 0o777) !== 0o600) {
        console.error(`Expected 0600 but got ${(newStat.mode & 0o777).toString(8)}`);
    }
    expect(newStat.mode & 0o777).toBe(0o600);

    // Check .env.local (should have received VAR1)
    const localContent = fs.readFileSync(localEnvFile, 'utf-8');
    expect(localContent).toContain('VAR1=');

    const localStat = fs.statSync(localEnvFile);
    expect(localStat.mode & 0o777).toBe(0o600);
  });
});
