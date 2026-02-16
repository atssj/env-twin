import { describe, expect, it } from 'bun:test';
import { EnvAnalysisReport, EnvFileInfo } from '../../modules/sync-logic.js';
import { planExampleAndOrphanActions } from './example-orphans-planner.js';
import { PromptApi } from './types.js';

function buildFile(fileName: string, keys: string[]): EnvFileInfo {
  const parsedLines = keys.map(key => ({
    key,
    value: key.toLowerCase(),
    originalLine: `${key}=${key.toLowerCase()}`,
    isComment: false,
    isEmpty: false,
  }));

  return {
    filePath: fileName,
    fileName,
    exists: true,
    content: parsedLines.map(line => line.originalLine).join('\n'),
    lines: [],
    keys: new Set(keys),
    parsedLines,
  };
}

function buildReport(params: {
  files: EnvFileInfo[];
  allKeys: string[];
  orphanKeys?: Record<string, string[]>;
  sourceOfTruth?: string;
}): EnvAnalysisReport {
  return {
    sourceOfTruth: params.sourceOfTruth || '',
    files: params.files,
    missingKeys: {},
    orphanKeys: params.orphanKeys || {},
    allKeys: new Set(params.allKeys),
  };
}

const noPromptUse: PromptApi = {
  confirm: async () => {
    throw new Error('unexpected confirm');
  },
  select: async () => {
    throw new Error('unexpected select');
  },
};

describe('example-orphans-planner', () => {
  it('creates .env.example actions with sanitized placeholders', async () => {
    const report = buildReport({
      files: [buildFile('.env', ['MY-KEY'])],
      allKeys: ['MY-KEY', 'OTHER_KEY'],
      sourceOfTruth: '.env',
    });

    const actions = await planExampleAndOrphanActions({
      report,
      sourceOfTruth: '.env',
      yes: true,
      prompts: noPromptUse,
    });

    expect(actions).toEqual([
      { file: '.env.example', key: 'MY-KEY', action: 'add', value: 'input_my_key' },
      { file: '.env.example', key: 'OTHER_KEY', action: 'add', value: 'input_other_key' },
    ]);
  });

  it('promotes orphan keys to source-of-truth on confirmation', async () => {
    const report = buildReport({
      files: [buildFile('.env.example', ['BASE']), buildFile('.env', ['BASE', 'EXTRA'])],
      allKeys: ['BASE', 'EXTRA'],
      orphanKeys: { '.env': ['EXTRA'] },
      sourceOfTruth: '.env.example',
    });

    const actions = await planExampleAndOrphanActions({
      report,
      sourceOfTruth: '.env.example',
      prompts: { ...noPromptUse, confirm: async () => true },
    });

    expect(actions).toEqual([
      { file: '.env.example', key: 'EXTRA', action: 'add', value: 'input_extra' },
    ]);
  });
});
