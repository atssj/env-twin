import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('env-twin CLI', () => {
  const testDir = path.join(__dirname, 'test-temp');
  const sourceEnvPath = path.join(testDir, '.env');
  const exampleEnvPath = path.join(testDir, '.env.example');

  beforeAll(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Clean up test files before each test
    const envFiles = ['.env', '.env.local', '.env.development', '.env.testing', '.env.staging', '.env.example'];
    envFiles.forEach((file) => {
      const filePath = path.join(testDir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  test('should transform environment variables correctly', () => {
    // Create test .env file
    const envContent = `
# Test environment variables
NODE_ENV=development
DATABASE_URL=postgres://localhost:5432/mydb
API_KEY=123456
CUSTOM_VAR=value
MULTI_WORD_VARIABLE=test
`;

    fs.writeFileSync(sourceEnvPath, envContent);

    // Run the script
    execSync(
      `bun ${path.join(__dirname, 'index.ts')} --source ${sourceEnvPath} --dest ${exampleEnvPath}`
    );

    // Read the generated .env.example file
    const exampleContent = fs.readFileSync(exampleEnvPath, 'utf-8');

    // Expected content
    const expectedContent = `
# Test environment variables
NODE_ENV="input_node_env"
DATABASE_URL="input_database_url"
API_KEY="input_api_key"
CUSTOM_VAR="input_custom_var"
MULTI_WORD_VARIABLE="input_multi_word_variable"
`;

    expect(exampleContent).toBe(expectedContent);
  });

  test('should handle empty lines and comments', () => {
    const envContent = `
# Header comment

# Section 1
VAR1=value1

# Section 2
VAR2=value2
`;

    fs.writeFileSync(sourceEnvPath, envContent);

    execSync(
      `bun ${path.join(__dirname, 'index.ts')} --source ${sourceEnvPath} --dest ${exampleEnvPath}`
    );

    const exampleContent = fs.readFileSync(exampleEnvPath, 'utf-8');

    const expectedContent = `
# Header comment

# Section 1
VAR1="input_var1"

# Section 2
VAR2="input_var2"
`;

    expect(exampleContent).toBe(expectedContent);
  });

  test('should handle special characters in variable names', () => {
    const envContent = `
TEST-VAR=value1
TEST.VAR=value2
TEST_VAR=value3
`;

    fs.writeFileSync(sourceEnvPath, envContent);

    execSync(
      `bun ${path.join(__dirname, 'index.ts')} --source ${sourceEnvPath} --dest ${exampleEnvPath}`
    );

    const exampleContent = fs.readFileSync(exampleEnvPath, 'utf-8');

    const expectedContent = `
TEST-VAR="input_test_var"
TEST.VAR="input_test_var"
TEST_VAR="input_test_var"
`;

    expect(exampleContent).toBe(expectedContent);
  });

  test('should handle missing source file', () => {
    expect(() => {
      execSync(
        `bun ${path.join(__dirname, 'index.ts')} --source nonexistent.env --dest ${exampleEnvPath}`
      );
    }).toThrow();
  });

  test('should display version information', () => {
    const output = execSync(`bun ${path.join(__dirname, 'index.ts')} --version`).toString();
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const expectedVersion = packageJson.version || 'unknown';
    expect(output).toContain(`env-twin version ${expectedVersion}`);
  });
});

describe('env-twin sync command', () => {
  const testDir = path.join(__dirname, 'test-sync-temp');

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
    const envFiles = ['.env', '.env.local', '.env.development', '.env.testing', '.env.staging', '.env.example'];
    envFiles.forEach((file) => {
      const filePath = path.join(testDir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    // Also clean up backup directory
    const backupDir = path.join(testDir, '.env-twin');
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
  });

  test('should sync keys across multiple .env files', () => {
    // Create test files with different keys
    fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\nVAR2=value2\n');
    fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR2=local_value\nVAR3=value3\n');
    fs.writeFileSync(path.join(testDir, '.env.development'), 'VAR1=dev_value\n');

    // Run sync command
    execSync(`bun ${path.join(__dirname, 'index.ts')} sync`, { cwd: testDir });

    // Verify all files have all keys
    const env = fs.readFileSync(path.join(testDir, '.env'), 'utf-8');
    const envLocal = fs.readFileSync(path.join(testDir, '.env.local'), 'utf-8');
    const envDev = fs.readFileSync(path.join(testDir, '.env.development'), 'utf-8');

    expect(env).toContain('VAR1=');
    expect(env).toContain('VAR2=');
    expect(env).toContain('VAR3=');

    expect(envLocal).toContain('VAR1=');
    expect(envLocal).toContain('VAR2=');
    expect(envLocal).toContain('VAR3=');

    expect(envDev).toContain('VAR1=');
    expect(envDev).toContain('VAR2=');
    expect(envDev).toContain('VAR3=');
  });

  test('should preserve existing values during sync', () => {
    // Create test files
    fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=original_value\nVAR2=value2\n');
    fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR3=value3\n');

    // Run sync command
    execSync(`bun ${path.join(__dirname, 'index.ts')} sync`, { cwd: testDir });

    // Verify original values are preserved
    const env = fs.readFileSync(path.join(testDir, '.env'), 'utf-8');
    expect(env).toContain('VAR1=original_value');
    expect(env).toContain('VAR2=value2');
  });

  test('should not delete existing variables', () => {
    // Create test files
    fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\nVAR2=value2\nVAR3=value3\n');
    fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR1=value1\n');

    // Run sync command
    execSync(`bun ${path.join(__dirname, 'index.ts')} sync`, { cwd: testDir });

    // Verify all variables still exist in .env
    const env = fs.readFileSync(path.join(testDir, '.env'), 'utf-8');
    expect(env).toContain('VAR1=');
    expect(env).toContain('VAR2=');
    expect(env).toContain('VAR3=');
  });

  test('should handle comments and empty lines', () => {
    // Create test file with comments
    const envContent = `# Database config
VAR1=value1

# API config
VAR2=value2
`;
    fs.writeFileSync(path.join(testDir, '.env'), envContent);
    fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR3=value3\n');

    // Run sync command
    execSync(`bun ${path.join(__dirname, 'index.ts')} sync`, { cwd: testDir });

    // Verify comments are preserved
    const env = fs.readFileSync(path.join(testDir, '.env'), 'utf-8');
    expect(env).toContain('# Database config');
    expect(env).toContain('# API config');
    expect(env).toContain('VAR1=');
    expect(env).toContain('VAR2=');
    expect(env).toContain('VAR3=');
  });

  test('should create .env.example with all keys if it does not exist', () => {
    // Create test files without .env.example
    fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\n');
    fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR2=value2\n');

    // Run sync command
    execSync(`bun ${path.join(__dirname, 'index.ts')} sync`, { cwd: testDir });

    // Verify .env.example was created with all keys
    const examplePath = path.join(testDir, '.env.example');
    expect(fs.existsSync(examplePath)).toBe(true);

    const example = fs.readFileSync(examplePath, 'utf-8');
    expect(example).toContain('VAR1=');
    expect(example).toContain('VAR2=');
  });

  test('should handle empty .env files', () => {
    // Create empty test files
    fs.writeFileSync(path.join(testDir, '.env'), '');
    fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR1=value1\n');

    // Run sync command
    execSync(`bun ${path.join(__dirname, 'index.ts')} sync`, { cwd: testDir });

    // Verify .env now has VAR1
    const env = fs.readFileSync(path.join(testDir, '.env'), 'utf-8');
    expect(env).toContain('VAR1=');
  });

  test('should handle files with only comments', () => {
    // Create test files
    fs.writeFileSync(path.join(testDir, '.env'), '# Just a comment\n');
    fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR1=value1\n');

    // Run sync command
    execSync(`bun ${path.join(__dirname, 'index.ts')} sync`, { cwd: testDir });

    // Verify VAR1 was added to .env
    const env = fs.readFileSync(path.join(testDir, '.env'), 'utf-8');
    expect(env).toContain('# Just a comment');
    expect(env).toContain('VAR1=');
  });

  test('should handle no .env files gracefully', () => {
    // Don't create any .env files
    const output = execSync(`bun ${path.join(__dirname, 'index.ts')} sync`, { cwd: testDir }).toString();
    expect(output).toContain('No .env* files found');
  });

  test('should handle .env files with special characters in keys', () => {
    // Create test files with special characters
    fs.writeFileSync(path.join(testDir, '.env'), 'VAR_1=value1\nVAR-2=value2\n');
    fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR.3=value3\n');

    // Run sync command
    execSync(`bun ${path.join(__dirname, 'index.ts')} sync`, { cwd: testDir });

    // Verify all keys are synced
    const env = fs.readFileSync(path.join(testDir, '.env'), 'utf-8');
    expect(env).toContain('VAR_1=');
    expect(env).toContain('VAR-2=');
    expect(env).toContain('VAR.3=');
  });

  test('should create backups during sync', () => {
    // Create test files
    fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\n');
    fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR2=value2\n');

    // Run sync command
    execSync(`bun ${path.join(__dirname, 'index.ts')} sync`, { cwd: testDir });

    // Verify backup directory was created
    const backupDir = path.join(testDir, '.env-twin');
    expect(fs.existsSync(backupDir)).toBe(true);

    // Verify backup files exist
    const backupFiles = fs.readdirSync(backupDir);
    expect(backupFiles.length).toBeGreaterThan(0);

    // Verify backup files have correct naming pattern
    const hasEnvBackup = backupFiles.some((f) => f.startsWith('.env.'));
    expect(hasEnvBackup).toBe(true);
  });

  test('should not create backups when --no-backup flag is used', () => {
    // Create test files
    fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\n');
    fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR2=value2\n');

    // Ensure backup directory doesn't exist before test
    const backupDir = path.join(testDir, '.env-twin');
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }

    // Run sync command with --no-backup flag
    execSync(`bun ${path.join(__dirname, 'index.ts')} sync --no-backup`, { cwd: testDir });

    // Verify backup directory was not created
    expect(fs.existsSync(backupDir)).toBe(false);
  });

  test('should restore from backup', () => {
    // Create test files with original values
    fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=original_value\nVAR2=value2\n');
    fs.writeFileSync(path.join(testDir, '.env.local'), 'VAR3=value3\n');

    // Run sync command to create backup
    execSync(`bun ${path.join(__dirname, 'index.ts')} sync`, { cwd: testDir });

    // Get the backup timestamp
    const backupDir = path.join(testDir, '.env-twin');
    const backupFiles = fs.readdirSync(backupDir);
    const timestampMatch = backupFiles[0].match(/\.(\d{8}-\d{6})$/);
    expect(timestampMatch).not.toBeNull();
    const timestamp = timestampMatch![1];

    // Modify the .env file to something different
    fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=modified_value\n');

    // Restore from backup
    execSync(`bun ${path.join(__dirname, 'index.ts')} restore ${timestamp} --yes`, { cwd: testDir });

    // Verify original values were restored
    const env = fs.readFileSync(path.join(testDir, '.env'), 'utf-8');
    expect(env).toContain('VAR1=original_value');
    expect(env).toContain('VAR2=value2');
  });

  test('should list available backups', () => {
    // Create test files
    fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\n');

    // Run sync command to create backup
    execSync(`bun ${path.join(__dirname, 'index.ts')} sync`, { cwd: testDir });

    // List backups
    const output = execSync(`bun ${path.join(__dirname, 'index.ts')} restore --list`, { cwd: testDir }).toString();
    expect(output).toContain('Available backups');
    expect(output).toContain('.env');
  });

  test('should handle restore with no backups available', () => {
    // Ensure backup directory doesn't exist
    const backupDir = path.join(testDir, '.env-twin');
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }

    // Try to restore without any backups
    const output = execSync(`bun ${path.join(__dirname, 'index.ts')} restore`, { cwd: testDir }).toString();
    expect(output).toContain('No backups found');
  });

  test('should clean old backups', () => {
    // Create test files
    fs.writeFileSync(path.join(testDir, '.env'), 'VAR1=value1\n');

    // Create multiple backups by running sync multiple times
    // We'll create backups by modifying files and syncing
    for (let i = 0; i < 3; i++) {
      fs.writeFileSync(path.join(testDir, '.env'), `VAR1=value${i}\nVAR${i}=test\n`);
      execSync(`bun ${path.join(__dirname, 'index.ts')} sync`, { cwd: testDir });
    }

    // Verify backups exist
    const backupDir = path.join(testDir, '.env-twin');
    const backupFiles = fs.readdirSync(backupDir);
    // We should have at least 2 backup files
    expect(backupFiles.length).toBeGreaterThanOrEqual(2);
    const initialBackupCount = backupFiles.length;

    // Clean backups keeping only 1
    const output = execSync(`bun ${path.join(__dirname, 'index.ts')} clean-backups --keep 1 --yes`, { cwd: testDir }).toString();
    expect(output).toContain('Cleanup completed successfully');

    // Verify backups were cleaned (should have fewer files now)
    const remainingBackups = fs.readdirSync(backupDir);
    expect(remainingBackups.length).toBeLessThan(initialBackupCount);
  });
});
