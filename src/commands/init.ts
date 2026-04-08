import fs from 'fs';
import path from 'path';
import { colors } from '../utils/ui.js';

// ============================================================================
// INIT COMMAND
// ============================================================================

const INIT_FILES = ['.env', '.env.local', '.env.example'] as const;

/**
 * Initialize environment files (.env, .env.local, .env.example) in the current directory.
 * Skips any file that already exists to avoid overriding existing configurations.
 */
export function runInit(): void {
  const cwd = process.cwd();
  let created = 0;
  let skipped = 0;

  console.log(colors.bold('Initializing environment files...'));
  console.log('');

  for (const fileName of INIT_FILES) {
    const filePath = path.resolve(cwd, fileName);

    if (fs.existsSync(filePath)) {
      console.log(`  ${colors.yellow('skip')}  ${fileName} (already exists)`);
      skipped++;
    } else {
      try {
        fs.writeFileSync(filePath, '', { flag: 'wx' });
        console.log(`  ${colors.green('create')}  ${fileName}`);
        created++;
      } catch (error) {
        // Handle race condition where file was created between check and write
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
          console.log(`  ${colors.yellow('skip')}  ${fileName} (already exists)`);
          skipped++;
        } else {
          console.error(`  ${colors.red('error')}  Failed to create ${fileName}`);
          console.error(`         ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }

  console.log('');
  if (created > 0) {
    console.log(colors.green(`Created ${created} file(s).`));
  }
  if (skipped > 0) {
    console.log(colors.yellow(`Skipped ${skipped} file(s) (already exist).`));
  }
  if (created === 0 && skipped === INIT_FILES.length) {
    console.log('All environment files already exist. Nothing to do.');
  }
}
