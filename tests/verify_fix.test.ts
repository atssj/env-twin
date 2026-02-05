
import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { spawnSync } from 'child_process';

describe('Sync Command Permission Verification', () => {
    const tempDir = path.join(process.cwd(), 'temp_verification');
    const envFile = path.join(tempDir, '.env');
    const exampleFile = path.join(tempDir, '.env.example');

    // Path to the CLI entry point
    const cliPath = path.resolve(process.cwd(), 'src/index.ts');

    beforeAll(() => {
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    });

    afterAll(() => {
        if (fs.existsSync(tempDir)) {
             fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('should preserve file permissions during sync', () => {
        if (process.platform === 'win32') return; // Skip on Windows

        // 1. Create .env with restricted permissions (0600)
        fs.writeFileSync(envFile, 'SECRET=original', { mode: 0o600 });

        // 2. Create .env.example (so sync has something to do)
        fs.writeFileSync(exampleFile, 'input_SECRET=', { mode: 0o644 });

        // Verify initial state
        const initialMode = fs.statSync(envFile).mode & 0o777;
        expect(initialMode).toBe(0o600);

        // 3. Run the sync command
        // We run it in the tempDir
        const result = spawnSync('bun', [cliPath, 'sync', '--yes', '--no-backup'], {
            cwd: tempDir,
            encoding: 'utf-8',
            env: process.env // pass env
        });

        if (result.status !== 0) {
            console.error('Sync command failed:', result.stderr);
            console.log('Stdout:', result.stdout);
        }
        expect(result.status).toBe(0);

        // 4. Verify final permissions
        const finalStats = fs.statSync(envFile);
        const finalMode = finalStats.mode & 0o777;

        console.log(`Initial Mode: ${initialMode.toString(8)}`);
        console.log(`Final Mode: ${finalMode.toString(8)}`);

        expect(finalMode).toBe(0o600);
    });
});
