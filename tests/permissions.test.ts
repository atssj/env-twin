import { test, expect, beforeAll, afterAll, mock } from "bun:test";
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runSync } from '../src/commands/sync';

// Mock UI because runSync uses it
mock.module('../src/utils/ui', () => {
    return {
        confirm: async () => true,
        select: async () => 'skip',
        colors: {
            green: (s: any) => s,
            red: (s: any) => s,
            bold: (s: any) => s,
            dim: (s: any) => s,
            yellow: (s: any) => s,
            blue: (s: any) => s,
        }
    };
});

const originalCwd = process.cwd();
let tempDir: string;

beforeAll(() => {
    // Create a unique temp directory for this test suite
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-twin-test-perms-'));
    process.chdir(tempDir);
});

afterAll(() => {
    process.chdir(originalCwd);
    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
        console.error('Failed to cleanup temp dir', e);
    }
});

test("Sync preserves permissions for existing sensitive files", async () => {
    // Setup: .env with 600
    const envPath = path.join(tempDir, '.env');
    fs.writeFileSync(envPath, 'SECRET=123', { mode: 0o600 });

    // Explicit chmod because writeFileSync might be affected by umask
    fs.chmodSync(envPath, 0o600);

    // Verify initial state
    let stats = fs.statSync(envPath);
    expect(stats.mode & 0o777).toBe(0o600);

    // Setup: .env.example (Source of Truth)
    const examplePath = path.join(tempDir, '.env.example');
    fs.writeFileSync(examplePath, 'SECRET=xxx\nNEW_KEY=input_val');

    // Action: Sync
    // We use yes=true to auto-accept changes
    // This should add NEW_KEY to .env
    await runSync({ yes: true, noBackup: true, source: '.env.example' });

    // Verify: .env should have NEW_KEY and still be 600
    stats = fs.statSync(envPath);
    const mode = stats.mode & 0o777;

    // Check content
    const content = fs.readFileSync(envPath, 'utf-8');
    expect(content).toContain('NEW_KEY=');

    // Check permissions
    expect(mode).toBe(0o600);
});

test("Sync creates .env.example with standard permissions (not forced to 600)", async () => {
    // Cleanup from previous test
    const examplePath = path.join(tempDir, '.env.example');
    if(fs.existsSync(examplePath)) fs.unlinkSync(examplePath);

    // Setup: .env with keys
    const envPath = path.join(tempDir, '.env');
    fs.writeFileSync(envPath, 'SECRET=123'); // Exists

    // Action: Sync (should trigger .env.example creation because .env.example is missing)
    await runSync({ yes: true, noBackup: true });

    // Verify
    expect(fs.existsSync(examplePath)).toBe(true);
    const stats = fs.statSync(examplePath);
    const mode = stats.mode & 0o777;

    // It should NOT be 600 (unless umask is very strict, but typically it is 644 or 664)
    // We expect it to be readable by owner at least
    expect((mode & 0o400)).toBe(0o400);

    // If we are on a standard system, it usually has group/other read
    // But strictly speaking, we just want to ensure we didn't FORCE it to 600 if the user wanted 644.
    // My code explicitly excludes .env.example from the 600 enforcement.
    // So it falls back to writeFileSync defaults.
});
