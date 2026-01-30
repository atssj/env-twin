
import { describe, test, expect, afterAll } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

describe('Security: Permission Preservation', () => {
  const TEST_DIR_PREFIX = 'env-twin-perm-test-';
  let tmpDir: string;

  test('should preserve file permissions during atomic write', () => {
    // Create a temporary directory for the test
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), TEST_DIR_PREFIX));
    console.log(`Created temp dir: ${tmpDir}`);

    try {
      // Path to the env-twin executable (using bun)
      const repoRoot = process.cwd();
      const cliPath = path.join(repoRoot, 'src', 'index.ts');

      // 1. Setup: Create a .env file with restricted permissions (0600)
      const envFile = path.join(tmpDir, '.env');
      fs.writeFileSync(envFile, 'SECRET=123\n', { mode: 0o600 });

      // Verify initial permissions
      const initialStats = fs.statSync(envFile);
      const initialMode = initialStats.mode & 0o777;
      console.log(`Initial .env mode: 0${initialMode.toString(8)}`);

      if (process.platform !== 'win32' && initialMode !== 0o600) {
        console.warn('Warning: Could not set 0600 permissions initially. Test might be inconclusive.');
      }

      // 2. Create another file to trigger sync
      const envLocal = path.join(tmpDir, '.env.local');
      fs.writeFileSync(envLocal, 'SECRET=123\nNEW=456\n');

      console.log('Running env-twin sync...');
      // 3. Run sync command
      execSync(`bun "${cliPath}" sync --yes --no-backup`, {
        cwd: tmpDir,
        stdio: 'ignore', // We don't need output for this test
        env: { ...process.env, FORCE_COLOR: '1' }
      });

      // 4. Verify final permissions
      const finalStats = fs.statSync(envFile);
      const finalMode = finalStats.mode & 0o777;
      console.log(`Final .env mode:   0${finalMode.toString(8)}`);

      if (process.platform === 'win32') {
        console.log('Skipping permission check on Windows.');
        return;
      }

      expect(finalMode).toBe(initialMode);

    } catch (err) {
      console.error('Test execution failed:', err);
      throw err;
    }
  });

  afterAll(() => {
    // Cleanup
    if (tmpDir && fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        console.log(`Cleaned up temp dir: ${tmpDir}`);
      } catch (e) {
        console.error(`Failed to cleanup temp dir: ${e}`);
      }
    }
  });
});
