import { describe, expect, it } from 'bun:test';
import { EnvAnalysisReport, EnvFileInfo } from '../../modules/sync-logic.js';
import { planMissingKeyActions } from './missing-keys-planner.js';
import { PromptApi } from './types.js';

function buildFile(fileName: string, values: Record<string, string>): EnvFileInfo {
  const parsedLines = Object.entries(values).map(([key, value]) => ({
    key,
    value,
    originalLine: `${key}=${value}`,
    isComment: false,
    isEmpty: false,
  }));

  return {
    filePath: fileName,
    fileName,
    exists: true,
    content: parsedLines.map(line => line.originalLine).join('\n'),
    lines: [],
    keys: new Set(Object.keys(values)),
    parsedLines,
  };
}

function buildReport(
  files: EnvFileInfo[],
  missingKeys: Record<string, string[]>,
  sourceOfTruth = '.env.example'
): EnvAnalysisReport {
  return {
    sourceOfTruth,
    files,
    missingKeys,
    orphanKeys: {},
    allKeys: new Set(files.flatMap(file => Array.from(file.keys))),
  };
}

function promptMock(selectAnswers: string[]): PromptApi {
  return {
    confirm: async () => true,
    select: async () => selectAnswers.shift() as never,
  };
}

describe('missing-keys-planner', () => {
  it('adds empty values for --yes mode', async () => {
    const report = buildReport(
      [buildFile('.env.example', { API_KEY: 'secret' }), buildFile('.env', {})],
      { '.env': ['API_KEY'] }
    );

    const actions = await planMissingKeyActions({
      report,
      sourceOfTruth: '.env.example',
      yes: true,
      prompts: promptMock([]),
    });

    expect(actions).toEqual([{ file: '.env', key: 'API_KEY', action: 'add', value: '' }]);
  });

  it('copies values when bulk mode is all_copy', async () => {
    const keys = ['A', 'B', 'C', 'D', 'E', 'F'];
    const sourceValues = Object.fromEntries(keys.map(key => [key, `value_${key}`]));
    const report = buildReport([buildFile('.env.example', sourceValues), buildFile('.env', {})], {
      '.env': keys,
    });

    const actions = await planMissingKeyActions({
      report,
      sourceOfTruth: '.env.example',
      prompts: promptMock(['all_copy']),
    });

    expect(actions.length).toBe(keys.length);
    expect(actions.find(action => action.key === 'C')?.value).toBe('value_C');
  });

  it('supports interactive copy and skip decisions', async () => {
    const report = buildReport(
      [buildFile('.env.example', { API_KEY: 'secret', EMPTY_KEY: '' }), buildFile('.env', {})],
      { '.env': ['API_KEY', 'EMPTY_KEY'] }
    );

    const actions = await planMissingKeyActions({
      report,
      sourceOfTruth: '.env.example',
      prompts: promptMock(['copy', 'skip']),
    });

    expect(actions).toEqual([{ file: '.env', key: 'API_KEY', action: 'add', value: 'secret' }]);
  });
});
