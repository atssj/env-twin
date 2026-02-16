import fs from 'fs';
import path from 'path';
import { EnvAnalysisReport, EnvFileAnalysis } from '../../modules/sync-logic.js';
import { createBackups } from '../../utils/backup.js';
import { writeAtomic } from '../../utils/atomic-fs.js';
import { colors } from '../../utils/ui.js';
import { PendingAction, PromptApi, SyncCommandOptions } from './types.js';

interface ExecuteParams {
  cwd: string;
  report: EnvAnalysisReport;
  actions: PendingAction[];
  options: SyncCommandOptions;
  prompts: PromptApi;
}

export async function executeSyncActions(params: ExecuteParams): Promise<void> {
  const { cwd, report, actions, options, prompts } = params;

  if (actions.length === 0) {
    console.log(colors.green('All files are in sync! No actions needed.'));
    return;
  }

  printPlan(actions);
  if (!options.yes) {
    const shouldExecute = await prompts.confirm('Execute these changes?', true);
    if (!shouldExecute) {
      console.log('Aborted.');
      return;
    }
  }

  if (!options.noBackup) {
    const filesToBackup = Array.from(new Set(actions.map(a => path.join(cwd, a.file))));
    const backupTimestamp = createBackups(filesToBackup, cwd);
    if (backupTimestamp) {
      console.log(colors.dim(`✓ Backup created (timestamp: ${backupTimestamp})`));
    }
  }

  for (const [fileName, fileActions] of groupActionsByFile(actions)) {
    const filePath = path.join(cwd, fileName);
    const originalFile = report.files.find(file => file.fileName === fileName);
    const entries = Array.from(new Map(fileActions.map(a => [a.key, a.value])));
    const keysToAdd = entries.map(([key]) => key);
    const values = new Map(entries);
    const newContent = EnvFileAnalysis.mergeContent(
      originalFile?.content || '',
      keysToAdd,
      key => values.get(key) || ''
    );

    try {
      writeAtomic(filePath, newContent, { mode: readMode(filePath) });
      console.log(colors.green(`✓ Updated ${fileName}`));
    } catch (error) {
      console.error(
        colors.red(`Failed to update ${fileName}:`),
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  console.log('');
  console.log(colors.green('Sync completed successfully!'));
}

function printPlan(actions: PendingAction[]): void {
  console.log('');
  console.log(colors.bold('Plan:'));
  actions.forEach(action => {
    console.log(`  ${colors.green('+')} ${action.file}: ${action.key}=${colors.dim(action.value)}`);
  });
  console.log('');
}

function groupActionsByFile(actions: PendingAction[]): Map<string, PendingAction[]> {
  const grouped = new Map<string, PendingAction[]>();
  for (const action of actions) {
    grouped.set(action.file, [...(grouped.get(action.file) || []), action]);
  }
  return grouped;
}

function readMode(filePath: string): number | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  try {
    return fs.statSync(filePath).mode;
  } catch {
    return undefined;
  }
}
