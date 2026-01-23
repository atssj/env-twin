import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('Security Regression Tests', () => {
  const testDir = path.join(process.cwd(), 'tests/temp-security-test');
  const indexScript = path.join(process.cwd(), 'src/index.ts');

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
    // Clean up
    if (fs.existsSync(testDir)) {
        fs.readdirSync(testDir).forEach(file => {
            const filePath = path.join(testDir, file);
            fs.rmSync(filePath, { recursive: true, force: true });
        });
    }
  });

  test('sync command should preserve 0600 permissions on sensitive files', () => {
    if (process.platform === 'win32') {
        console.log('Skipping permission test on Windows');
        return;
    }

    const envFile = path.join(testDir, '.env');
    const envLocal = path.join(testDir, '.env.local');

    // Create .env with 0600
    fs.writeFileSync(envFile, 'SECRET_KEY=secret\n', { mode: 0o600 });

    // Create .env.local with an extra key to trigger sync
    fs.writeFileSync(envLocal, 'SECRET_KEY=secret\nNEW_KEY=new_value\n', { mode: 0o600 });

    // Verify initial permissions
    const initialStats = fs.statSync(envFile);
    const initialMode = (initialStats.mode & 0o777).toString(8);
    expect(initialMode).toBe('600');

    // Run sync
    execSync(`bun ${indexScript} sync --yes`, { cwd: testDir });

    // Verify content updated
    const updatedContent = fs.readFileSync(envFile, 'utf-8');
    expect(updatedContent).toContain('NEW_KEY=');

    // Verify permissions preserved
    const finalStats = fs.statSync(envFile);
    const finalMode = (finalStats.mode & 0o777).toString(8);

    expect(finalMode).toBe('600');
  });
});
