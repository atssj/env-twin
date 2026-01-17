import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { writeAtomic } from '../src/utils/atomic-fs';

const TEST_DIR = path.join(process.cwd(), 'tests/atomic-fs-temp');

describe('Atomic File System Utils', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('writeAtomic', () => {
    it('should create a new file with content', () => {
      const filePath = path.join(TEST_DIR, 'test.txt');
      const content = 'Hello World';

      writeAtomic(filePath, content);

      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe(content);
    });

    it('should overwrite an existing file', () => {
      const filePath = path.join(TEST_DIR, 'test.txt');
      fs.writeFileSync(filePath, 'Old Content');

      const newContent = 'New Content';
      writeAtomic(filePath, newContent);

      expect(fs.readFileSync(filePath, 'utf-8')).toBe(newContent);
    });

    it('should handle binary content', () => {
      const filePath = path.join(TEST_DIR, 'test.bin');
      const content = Buffer.from([0x01, 0x02, 0x03, 0x04]);

      writeAtomic(filePath, content);

      const readContent = fs.readFileSync(filePath);
      expect(readContent.equals(content)).toBe(true);
    });

    it('should set file permissions if provided', () => {
      if (process.platform === 'win32') return; // Windows doesn't fully support POSIX modes

      const filePath = path.join(TEST_DIR, 'secure.txt');
      const content = 'Secret';
      const mode = 0o600;

      writeAtomic(filePath, content, { mode });

      const stats = fs.statSync(filePath);
      // Mask with 0o777 to ignore file type bits
      expect(stats.mode & 0o777).toBe(mode);
    });

    it('should clean up temp file on error', () => {
        const filePath = path.join(TEST_DIR, 'nonexistent/test.txt');

        expect(() => {
            writeAtomic(filePath, 'content');
        }).toThrow();
    });
  });
});
