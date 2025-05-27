#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Parse command line arguments
interface CliOptions {
  source?: string;
  dest?: string;
  help: boolean;
  version: boolean;
}

type FlagKey = 'SOURCE' | 'DEST' | 'HELP' | 'VERSION';

const CLI_FLAGS: Record<FlagKey, readonly string[]> = {
  SOURCE: ['--source', '--src'],
  DEST: ['--dest', '--destination', '--d', '--out', '--target'],
  HELP: ['--help', '-h'],
  VERSION: ['--version', '-v'],
} as const;

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const params: CliOptions = {
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (true) {
      case CLI_FLAGS.SOURCE.includes(arg):
        if (!nextArg || nextArg.startsWith('-')) {
          throw new Error(`Missing value for ${arg} argument`);
        }
        params.source = nextArg;
        i++;
        break;

      case CLI_FLAGS.DEST.includes(arg):
        if (!nextArg || nextArg.startsWith('-')) {
          throw new Error(`Missing value for ${arg} argument`);
        }
        params.dest = nextArg;
        i++;
        break;

      case CLI_FLAGS.HELP.includes(arg):
        params.help = true;
        break;

      case CLI_FLAGS.VERSION.includes(arg):
        params.version = true;
        break;

      default:
        if (arg.startsWith('-')) {
          throw new Error(`Unknown option '${arg}'`);
        }
    }
  }

  return params;
}

// Print usage information
function printUsage() {
  console.log(
    `
Usage: env-sync [options]

Options:
  --source, --src       Source .env file path (default: .env)
  --dest, --destination Destination .env.example file path (default: .env.example)
  --help, -h            Display this help message
  --version, -v         Display version information

Example:
  env-sync --src .env.development --destination .env.dev.example
`
  );
}

// Get package version from package.json
function getVersion(): string {
  try {
    // Use import.meta.url to get the current module's URL
    const currentDir = path.dirname(new URL(import.meta.url).pathname);
    // Navigate to the package.json file
    const packagePath = path.resolve(currentDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    return packageJson.version || 'unknown';
  } catch (error) {
    return '1.0.0'; // Fallback version
  }
}

try {
  const params = parseArgs();

  // Handle --help flag
  if (params.help) {
    printUsage();
    process.exit(0);
  }

  // Handle --version flag
  if (params.version) {
    console.log(`env-sync version ${getVersion()}`);
    process.exit(0);
  }

  // Show usage if no arguments provided and no default files exist
  if (
    Object.keys(params).length === 2 &&
    !params.source &&
    !params.dest &&
    !fs.existsSync('.env')
  ) {
    printUsage();
    process.exit(0);
  }

  const envPath: string = path.resolve(process.cwd(), params.source || '.env');
  const examplePath: string = path.resolve(process.cwd(), params.dest || '.env.example');

  // Check if source file exists
  if (!fs.existsSync(envPath)) {
    console.error(`Error: Source file '${envPath}' not found!`);
    console.error(`Use --src or --source to specify a different source file.`);
    printUsage();
    process.exit(1);
  }

  // Read source file
  let envContent: string;
  try {
    envContent = fs.readFileSync(envPath, 'utf-8');
  } catch (error) {
    console.error(`Error: Failed to read '${envPath}'`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Process content
  const exampleContent: string = envContent
    .split('\n')
    .map((line: string): string => {
      if (line.trim() === '' || line.trim().startsWith('#')) {
        return line;
      }
      const [key] = line.split('=');
      if (!key) return line;

      // Convert key to lowercase and replace underscores
      const inputValue = `input_${key.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
      return `${key}="${inputValue}"`;
    })
    .join('\n');

  // Create directory if it doesn't exist
  const destDir = path.dirname(examplePath);
  try {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Write to destination file
    fs.writeFileSync(examplePath, exampleContent);
    console.log(
      `Success: Generated '${path.basename(examplePath)}' from '${path.basename(envPath)}'`
    );
    console.log('Note: All environment variable values have been removed for security.');
  } catch (error) {
    console.error(`Error: Failed to write to '${examplePath}'`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
} catch (error) {
  console.error('An unexpected error occurred:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
