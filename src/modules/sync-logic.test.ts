import { describe, it, expect } from 'bun:test';
import { EnvFileAnalysis, loadEnvFile, parseEnvLine } from './sync-logic.js';
import path from 'path';

describe('sync-logic', () => {
  describe('parseEnvLine', () => {
    it('parses valid key-value pairs', () => {
      const line = 'KEY=value';
      const result = parseEnvLine(line);
      expect(result.key).toBe('KEY');
      expect(result.value).toBe('value');
      expect(result.isComment).toBe(false);
    });

    it('parses comments', () => {
      const line = '# This is a comment';
      const result = parseEnvLine(line);
      expect(result.isComment).toBe(true);
      expect(result.key).toBe('');
    });

    it('parses empty lines', () => {
      const line = '   ';
      const result = parseEnvLine(line);
      expect(result.isEmpty).toBe(true);
    });

    it('handles export prefix', () => {
      const line = 'export KEY=value';
      const result = parseEnvLine(line);
      expect(result.key).toBe('KEY');
      expect(result.value).toBe('value');
      expect(result.isComment).toBe(false);
    });

    it('handles export with multiple spaces', () => {
      const line = 'export   KEY=value';
      const result = parseEnvLine(line);
      expect(result.key).toBe('KEY');
      expect(result.value).toBe('value');
    });

    it('handles keys with spaces around equals', () => {
      const line = 'SPACED_KEY = value with spaces';
      const result = parseEnvLine(line);
      expect(result.key).toBe('SPACED_KEY');
      expect(result.value).toBe(' value with spaces');
    });

    it('handles empty key (line starting with =)', () => {
      const line = '=NO_KEY';
      const result = parseEnvLine(line);
      expect(result.key).toBe('');
      expect(result.value).toBe('NO_KEY');
    });
  });

  describe('EnvFileAnalysis', () => {
    // We mock the environment by pointing to a test directory or mocking fs
    // For this level of unit test, we can trust the analysis logic given mocked file inputs
    // But since `EnvFileAnalysis` reads from disk in `analyze`, we might need to integration test it
    // or refactor it to accept data.

    // However, we can test the static helper `mergeContent` easily.

    it('merges content correctly', () => {
      const original = 'EXISTING=1\n';
      const keysToAdd = ['NEW_KEY'];
      const valueProvider = (k: string) => 'val';

      const result = EnvFileAnalysis.mergeContent(original, keysToAdd, valueProvider);

      expect(result).toContain('EXISTING=1');
      expect(result).toContain('NEW_KEY=val');
    });

    it('handles empty original content', () => {
      const original = '';
      const keysToAdd = ['NEW_KEY'];
      const valueProvider = (k: string) => 'val';

      const result = EnvFileAnalysis.mergeContent(original, keysToAdd, valueProvider);

      expect(result.trim()).toBe('NEW_KEY=val');
    });

    it('sanitizes keys for example files', () => {
      expect(EnvFileAnalysis.sanitizeKey('API_KEY')).toBe('api_key');
      expect(EnvFileAnalysis.sanitizeKey('weird-key!@#')).toBe('weird_key');
    });
  });
});
