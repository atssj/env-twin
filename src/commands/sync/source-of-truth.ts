import { EnvAnalysisReport, EnvFileAnalysis } from '../../modules/sync-logic.js';
import { PromptApi, SourceResolutionResult } from './types.js';

interface ResolveSourceParams {
  report: EnvAnalysisReport;
  analyzer: EnvFileAnalysis;
  yes?: boolean;
  prompts: PromptApi;
}

export async function resolveSourceOfTruth(
  params: ResolveSourceParams
): Promise<SourceResolutionResult> {
  const { report, analyzer, yes, prompts } = params;
  let sourceOfTruth = report.sourceOfTruth;

  if (!sourceOfTruth) {
    if (yes) {
      return { report, sourceOfTruth: '' };
    }

    sourceOfTruth = await prompts.select<string>(
      'Select the "Source of Truth" file (keys will be synced FROM this file):',
      [
        ...report.files.map(file => ({ title: file.fileName, value: file.fileName })),
        { title: 'None (Union of all keys)', value: '' },
      ]
    );
  }

  if (!sourceOfTruth || sourceOfTruth === report.sourceOfTruth) {
    return { report, sourceOfTruth: sourceOfTruth || '' };
  }

  return {
    report: analyzer.analyze({ sourceOfTruth }),
    sourceOfTruth,
  };
}
