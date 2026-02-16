import { EnvAnalysisReport } from '../../modules/sync-logic.js';

export interface ResolvedValue {
  sourceFile: string;
  value: string;
}

export function resolveValueForKey(
  report: EnvAnalysisReport,
  sourceOfTruth: string,
  key: string
): ResolvedValue | null {
  if (sourceOfTruth) {
    const sourceFile = report.files.find(file => file.fileName === sourceOfTruth);
    const match = sourceFile?.parsedLines.find(parsed => parsed.key === key);
    return match ? { sourceFile: sourceOfTruth, value: match.value } : null;
  }

  for (const file of report.files) {
    const match = file.parsedLines.find(parsed => parsed.key === key);
    if (match) {
      return { sourceFile: file.fileName, value: match.value };
    }
  }

  return null;
}
