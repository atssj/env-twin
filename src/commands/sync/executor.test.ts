import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { EnvAnalysisReport, EnvFileInfo, parseEnvLine } from '../../modules/sync-logic.js';
import { executeSyncActions } from './executor.js';
import { PromptApi } from './types.js';

let tempDir = '';

function readFileInfo(filePath: string): EnvFileInfo {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const parsedLines = lines.map(parseEnvLine);
  return {
    filePath,
    fileName: path.basename(filePath),
    exists: true,
    content,
    lines,
    keys: new Set(parsedLines.filter(line => line.key).map(line => line.key)),
    parsedLines,
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

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-twin-sync-'));
});

afterEach(() => {
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('executor', () => {
  it('preserves existing content and appends planned keys', async () => {
    const envPath = path.join(tempDir, '.env');
    fs.writeFileSync(envPath, 'EXISTING=1\n', 'utf-8');

    const report: EnvAnalysisReport = {
      sourceOfTruth: '.env.example',
      files: [readFileInfo(envPath)],
      missingKeys: {},
      orphanKeys: {},
      allKeys: new Set(['EXISTING']),
    };

    await executeSyncActions({
      cwd: tempDir,
      report,
      options: { yes: true, noBackup: true },
      prompts: noPromptUse,
      actions: [
        { file: '.env', key: 'NEW_A', action: 'add', value: '' },
        { file: '.env', key: 'NEW_B', action: 'add', value: 'copied' },
        { file: '.env.local', key: 'LOCAL_KEY', action: 'add', value: '1' },
      ],
    });

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envLocalContent = fs.readFileSync(path.join(tempDir, '.env.local'), 'utf-8');

    expect(envContent).toContain('EXISTING=1');
    expect(envContent).toContain('NEW_A=');
    expect(envContent).toContain('NEW_B=copied');
    expect(envLocalContent.trim()).toBe('LOCAL_KEY=1');
  });
});
