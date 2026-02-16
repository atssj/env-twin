import { EnvAnalysisReport } from '../../modules/sync-logic.js';
import { colors } from '../../utils/ui.js';
import { BulkDecision, PendingAction, PromptApi, PromptChoice } from './types.js';
import { resolveValueForKey } from './value-resolution.js';

interface MissingPlannerParams {
  report: EnvAnalysisReport;
  sourceOfTruth: string;
  yes?: boolean;
  prompts: PromptApi;
}

export async function planMissingKeyActions(
  params: MissingPlannerParams
): Promise<PendingAction[]> {
  const { report, sourceOfTruth, yes, prompts } = params;
  const actions: PendingAction[] = [];

  for (const [fileName, missing] of Object.entries(report.missingKeys)) {
    if (!missing.length) continue;
    console.log(colors.bold(`${fileName} is missing ${missing.length} keys:`));

    const bulk = await chooseBulkDecision(fileName, missing.length, yes, prompts);
    if (bulk === 'skip') continue;

    for (const key of missing) {
      const value = await resolveValueToAdd({
        report,
        sourceOfTruth,
        fileName,
        key,
        bulk,
        prompts,
      });

      if (value === null) continue;
      actions.push({ file: fileName, key, action: 'add', value });
    }
  }

  return actions;
}

async function chooseBulkDecision(
  fileName: string,
  missingCount: number,
  yes: boolean | undefined,
  prompts: PromptApi
): Promise<BulkDecision> {
  if (yes) return 'all_empty';
  if (missingCount <= 5) return 'ask';

  return prompts.select<BulkDecision>(
    `How do you want to handle ${missingCount} missing keys in ${fileName}?`,
    [
      { title: 'Add all (empty values)', value: 'all_empty' },
      { title: 'Add all (copy from source if possible)', value: 'all_copy' },
      { title: 'Review one by one', value: 'ask' },
      { title: 'Skip all', value: 'skip' },
    ]
  );
}

async function resolveValueToAdd(params: {
  report: EnvAnalysisReport;
  sourceOfTruth: string;
  fileName: string;
  key: string;
  bulk: BulkDecision;
  prompts: PromptApi;
}): Promise<string | null> {
  const { report, sourceOfTruth, fileName, key, bulk, prompts } = params;
  const resolved = resolveValueForKey(report, sourceOfTruth, key);

  if (bulk === 'all_empty') return '';
  if (bulk === 'all_copy') return resolved?.value || '';

  const action = await prompts.select<'empty' | 'copy' | 'skip'>(
    `Add ${colors.green(key)} to ${fileName}?`,
    compactChoices([
      { title: `Add empty (${key}=)`, value: 'empty' },
      resolved?.value
        ? {
            title: `Copy from ${resolved.sourceFile} (${key}=${resolved.value})`,
            value: 'copy',
          }
        : null,
      { title: 'Skip', value: 'skip' },
    ])
  );

  if (action === 'skip') return null;
  if (action === 'copy') return resolved?.value || '';
  return '';
}

function compactChoices<T>(choices: Array<PromptChoice<T> | null>): PromptChoice<T>[] {
  return choices.filter((choice): choice is PromptChoice<T> => choice !== null);
}
