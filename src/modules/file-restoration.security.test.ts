import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { FileRestorer } from './file-restoration';

describe('FileRestorer Security', () => {
  const tmpDir = path.join(process.cwd(), 'tmp-security-test');
  const pwnedFile = path.join(process.cwd(), 'pwned.txt');

  beforeEach(() => {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
    if (fs.existsSync(pwnedFile)) fs.rmSync(pwnedFile);

    fs.mkdirSync(tmpDir, { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.env-twin'), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
    if (fs.existsSync(pwnedFile)) fs.rmSync(pwnedFile);
  });

  it('should prevent path traversal in restore', async () => {
    const restorer = new FileRestorer(tmpDir);
    const timestamp = '20230101-120000';
    const maliciousFile = '../pwned.txt';

    // Place the backup file where the restorer will look for it
    // backupDir is tmpDir/.env-twin
    // Looking for: tmpDir/.env-twin/../pwned.txt.TIMESTAMP
    // Which resolves to: tmpDir/pwned.txt.TIMESTAMP
    const exploitBackupPath = path.join(tmpDir, `pwned.txt.${timestamp}`);
    fs.writeFileSync(exploitBackupPath, 'MALICIOUS_CONTENT');

    const backupInfo = {
      timestamp,
      files: [maliciousFile],
      createdAt: new Date(),
    };

    await restorer.restoreFiles(backupInfo);

    // If vulnerable, it writes to tmpDir/../pwned.txt which is process.cwd()/pwned.txt
    const exists = fs.existsSync(pwnedFile);

    expect(exists).toBe(false);
  });
});
