import { EnvAnalysisReport, EnvFileAnalysis } from '../../modules/sync-logic.js';
import { colors } from '../../utils/ui.js';
import { PendingAction, PromptApi } from './types.js';

interface ExamplePlannerParams {
  report: EnvAnalysisReport;
  sourceOfTruth: string;
  yes?: boolean;
  prompts: PromptApi;
}

export async function planExampleAndOrphanActions(
  params: ExamplePlannerParams
): Promise<PendingAction[]> {
  const { report } = params;
  const exampleFile = report.files.find(file => file.fileName === '.env.example');

  if (!exampleFile) {
    return maybeCreateExampleActions(params);
  }

  if (!params.sourceOfTruth || params.yes) {
    return [];
  }

  return maybeCreatePromotionActions(params);
}

async function maybeCreateExampleActions({
  report,
  yes,
  prompts,
}: ExamplePlannerParams): Promise<PendingAction[]> {
  const allKeys = Array.from(report.allKeys).sort();
  if (allKeys.length === 0) return [];

  let shouldCreate = Boolean(yes);
  if (!yes) {
    console.log(colors.yellow('No .env.example file found.'));
    shouldCreate = await prompts.confirm(
      'Do you want to create .env.example with all found keys?',
      true
    );
  }

  if (!shouldCreate) return [];
  return allKeys.map(key => ({
    file: '.env.example',
    key,
    action: 'add' as const,
    value: `input_${EnvFileAnalysis.sanitizeKey(key)}`,
  }));
}

async function maybeCreatePromotionActions({
  report,
  sourceOfTruth,
  prompts,
}: ExamplePlannerParams): Promise<PendingAction[]> {
  const sourceFile = report.files.find(file => file.fileName === sourceOfTruth);
  if (!sourceFile) return [];

  const actions: PendingAction[] = [];
  for (const [fileName, orphans] of Object.entries(report.orphanKeys)) {
    const promotions = orphans.filter(key => !sourceFile.keys.has(key));
    if (!promotions.length) continue;

    console.log(
      colors.yellow(
        `Found ${promotions.length} keys in ${fileName} that are missing in ${sourceOfTruth}:`
      )
    );

    const shouldPromote = await prompts.confirm(
      `Do you want to add these keys to ${sourceOfTruth}?`,
      false
    );
    if (!shouldPromote) continue;

    for (const key of promotions) {
      actions.push({
        file: sourceOfTruth,
        key,
        action: 'add',
        value: `input_${EnvFileAnalysis.sanitizeKey(key)}`,
      });
    }
  }

  return actions;
}
