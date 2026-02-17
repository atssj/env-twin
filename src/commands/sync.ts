import { EnvFileAnalysis } from '../modules/sync-logic.js';
import { colors, confirm, select } from '../utils/ui.js';
import { planExampleAndOrphanActions } from './sync/example-orphans-planner.js';
import { executeSyncActions } from './sync/executor.js';
import { planMissingKeyActions } from './sync/missing-keys-planner.js';
import { resolveSourceOfTruth } from './sync/source-of-truth.js';
import { PromptApi, SyncCommandOptions } from './sync/types.js';

const prompts: PromptApi = {
  confirm,
  select: (message, choices) => select(message, choices),
};

export async function runSync(options: SyncCommandOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const analyzer = new EnvFileAnalysis(cwd);
  let report = analyzer.analyze({ sourceOfTruth: options.source });

  if (options.json) {
    // Convert Sets to Arrays for JSON serialization
    const replacer = (_key: string, value: unknown) => {
      if (value instanceof Set) {
        return Array.from(value);
      }
      return value;
    };
    console.log(JSON.stringify(report, replacer, 2));
    return;
  }

  const existingFiles = report.files;
  if (existingFiles.length === 0) {
    console.log(colors.yellow('No .env* files found in the current directory.'));
    return;
  }

  console.log(colors.bold(`Found ${existingFiles.length} .env* file(s):`));
  existingFiles.forEach(file => console.log(`  - ${file.fileName}`));
  console.log('');

  const resolution = await resolveSourceOfTruth({
    report,
    analyzer,
    yes: options.yes,
    prompts,
  });
  report = resolution.report;

  if (resolution.sourceOfTruth) {
    console.log(`${colors.blue('Source of Truth:')} ${colors.bold(resolution.sourceOfTruth)}`);
  } else {
    console.log(`${colors.blue('Source of Truth:')} ${colors.bold('Union of all files')}`);
  }
  console.log('');

  const actions = [
    ...(await planMissingKeyActions({
      report,
      sourceOfTruth: resolution.sourceOfTruth,
      yes: options.yes,
      prompts,
    })),
    ...(await planExampleAndOrphanActions({
      report,
      sourceOfTruth: resolution.sourceOfTruth,
      yes: options.yes,
      prompts,
    })),
  ];

  await executeSyncActions({
    cwd,
    report,
    actions,
    options,
    prompts,
  });
}
