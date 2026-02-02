import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('env-twin sync security', () => {
  const testDir = path.join(__dirname, 'test-security-temp');
  const envPath = path.join(testDir, '.env');

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
    if (fs.existsSync(envPath)) fs.unlinkSync(envPath);
    if (fs.existsSync(path.join(testDir, '.env.example')))
      fs.unlinkSync(path.join(testDir, '.env.example'));
    if (fs.existsSync(path.join(testDir, '.env-twin')))
      fs.rmSync(path.join(testDir, '.env-twin'), { recursive: true, force: true });
  });

  test('should preserve file permissions (chmod 600) after sync', () => {
    // 1. Create .env with restrictive permissions (0600)
    fs.writeFileSync(envPath, 'SECRET_KEY=12345\n');

    // Skip on Windows as chmod behavior is different
    if (process.platform === 'win32') {
      console.warn('Skipping permission test on Windows');
      return;
    }

    fs.chmodSync(envPath, 0o600);

    const initialStats = fs.statSync(envPath);
    // Mask with 0o777 to ignore file type bits
    const initialMode = initialStats.mode & 0o777;
    expect(initialMode).toBe(0o600);

    // 2. Run sync command
    // We add a new key via .env.local to trigger a change in .env
    const localEnvPath = path.join(testDir, '.env.local');
    fs.writeFileSync(localEnvPath, 'NEW_KEY=abc\n');

    // We expect the sync to ask to add NEW_KEY to .env or update .env somehow.
    // To make it fully automated and trigger a write to .env, we can use Union Mode.
    // If we run `env-twin sync --yes`, it should add NEW_KEY to .env (if it decides to sync keys across files).
    // In Union Mode (no source of truth specified), it tries to make all files have all keys.
    // So NEW_KEY from .env.local should be added to .env.

    execSync(`bun ${path.resolve(process.cwd(), 'src/index.ts')} sync --yes`, { cwd: testDir });

    // 3. Verify .env content was updated
    const updatedContent = fs.readFileSync(envPath, 'utf-8');
    expect(updatedContent).toContain('NEW_KEY=');

    // 4. Verify permissions are preserved
    const finalStats = fs.statSync(envPath);
    const finalMode = finalStats.mode & 0o777;

    // This expectation is expected to fail currently
    expect(finalMode).toBe(0o600);
  });

  test('should create .env.example with default permissions (not 0600)', () => {
    // 1. Create .env only
    fs.writeFileSync(envPath, 'KEY=val\n');

    // 2. Run sync --yes (should create .env.example)
    execSync(`bun ${path.resolve(process.cwd(), 'src/index.ts')} sync --yes`, { cwd: testDir });

    const examplePath = path.join(testDir, '.env.example');
    expect(fs.existsSync(examplePath)).toBe(true);

    if (process.platform === 'win32') return;

    const stats = fs.statSync(examplePath);
    const mode = stats.mode & 0o777;

    // Should NOT be 0o600. Default is usually 0o644 or 0o664 depending on umask
    expect(mode).not.toBe(0o600);
    expect(mode & 0o044).not.toBe(0); // Should be readable by group/others
  });
});
