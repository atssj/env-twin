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
    if (fs.existsSync(sourceEnvPath)) {
      fs.unlinkSync(sourceEnvPath);
    }
    if (fs.existsSync(exampleEnvPath)) {
      fs.unlinkSync(exampleEnvPath);
    }
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
