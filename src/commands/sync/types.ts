import type { EnvAnalysisReport } from '../../modules/sync-logic.js';

export interface SyncCommandOptions {
  noBackup?: boolean;
  yes?: boolean;
  json?: boolean;
  source?: string;
}

export interface PendingAction {
  file: string;
  key: string;
  action: 'add';
  value: string;
}

export type BulkDecision = 'all_empty' | 'all_copy' | 'ask' | 'skip';

export interface PromptChoice<T = string> {
  title: string;
  value: T;
}

export interface PromptApi {
  confirm(message: string, initial?: boolean): Promise<boolean>;
  select<T>(message: string, choices: PromptChoice<T>[]): Promise<T>;
}

export interface SourceResolutionResult {
  report: EnvAnalysisReport;
  sourceOfTruth: string;
}
