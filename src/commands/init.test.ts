import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('env-twin init command', () => {
  const testDir = path.join(__dirname, '..', 'test-init-temp');
  const indexPath = path.join(__dirname, '..', 'index.ts');

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
    // Clean up all env files before each test
    const envFiles = ['.env', '.env.local', '.env.example'];
    envFiles.forEach(file => {
      const filePath = path.join(testDir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  test('should create .env, .env.local, and .env.example when none exist', () => {
    const output = execSync(`bun ${indexPath} init`, { cwd: testDir }).toString();

    expect(fs.existsSync(path.join(testDir, '.env'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, '.env.local'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, '.env.example'))).toBe(true);

    expect(output).toContain('create');
    expect(output).toContain('.env');
    expect(output).toContain('.env.local');
    expect(output).toContain('.env.example');
    expect(output).toContain('Created 3 file(s)');
  });

  test('should not override existing .env file', () => {
    const existingContent = 'EXISTING_VAR=value\n';
    fs.writeFileSync(path.join(testDir, '.env'), existingContent);

    const output = execSync(`bun ${indexPath} init`, { cwd: testDir }).toString();

    // Existing file should not be overridden
    const envContent = fs.readFileSync(path.join(testDir, '.env'), 'utf-8');
    expect(envContent).toBe(existingContent);

    // Other files should be created
    expect(fs.existsSync(path.join(testDir, '.env.local'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, '.env.example'))).toBe(true);

    expect(output).toContain('skip');
    expect(output).toContain('Created 2 file(s)');
    expect(output).toContain('Skipped 1 file(s)');
  });

  test('should not override existing .env.local file', () => {
    const existingContent = 'LOCAL_VAR=local_value\n';
    fs.writeFileSync(path.join(testDir, '.env.local'), existingContent);

    const output = execSync(`bun ${indexPath} init`, { cwd: testDir }).toString();

    // Existing file should not be overridden
    const envLocalContent = fs.readFileSync(path.join(testDir, '.env.local'), 'utf-8');
    expect(envLocalContent).toBe(existingContent);

    expect(output).toContain('Created 2 file(s)');
    expect(output).toContain('Skipped 1 file(s)');
  });

  test('should not override existing .env.example file', () => {
    const existingContent = 'EXAMPLE_VAR=example_value\n';
    fs.writeFileSync(path.join(testDir, '.env.example'), existingContent);

    const output = execSync(`bun ${indexPath} init`, { cwd: testDir }).toString();

    // Existing file should not be overridden
    const envExampleContent = fs.readFileSync(path.join(testDir, '.env.example'), 'utf-8');
    expect(envExampleContent).toBe(existingContent);

    expect(output).toContain('Created 2 file(s)');
    expect(output).toContain('Skipped 1 file(s)');
  });

  test('should skip all files when all already exist', () => {
    fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=val1\n');
    fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR2=val2\n');
    fs.writeFileSync(path.join(testDir, '.env.example'), 'VAR3=val3\n');

    const output = execSync(`bun ${indexPath} init`, { cwd: testDir }).toString();

    expect(output).toContain('Skipped 3 file(s)');
    expect(output).toContain('All environment files already exist');

    // Verify contents are unchanged
    expect(fs.readFileSync(path.join(testDir, '.env'), 'utf-8')).toBe('VAR1=val1\n');
    expect(fs.readFileSync(path.join(testDir, '.env.local'), 'utf-8')).toBe('VAR2=val2\n');
    expect(fs.readFileSync(path.join(testDir, '.env.example'), 'utf-8')).toBe('VAR3=val3\n');
  });

  test('should create empty files', () => {
    execSync(`bun ${indexPath} init`, { cwd: testDir });

    // All created files should be empty
    expect(fs.readFileSync(path.join(testDir, '.env'), 'utf-8')).toBe('');
    expect(fs.readFileSync(path.join(testDir, '.env.local'), 'utf-8')).toBe('');
    expect(fs.readFileSync(path.join(testDir, '.env.example'), 'utf-8')).toBe('');
  });

  test('should show init command in help output', () => {
    const output = execSync(`bun ${indexPath} --help`).toString();
    expect(output).toContain('init');
  });
});
