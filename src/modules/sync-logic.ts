import fs from 'fs';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface EnvFileInfo {
  filePath: string;
  fileName: string;
  exists: boolean;
  content: string;
  lines: string[];
  keys: Set<string>;
  parsedLines: ParsedEnvLine[];
}

export interface ParsedEnvLine {
  key: string;
  value: string;
  originalLine: string;
  isComment: boolean;
  isEmpty: boolean;
}

export interface EnvAnalysisReport {
  sourceOfTruth: string; // e.g., '.env.example'
  files: EnvFileInfo[];
  missingKeys: Record<string, string[]>; // fileName -> list of missing keys
  orphanKeys: Record<string, string[]>; // fileName -> list of keys present locally but missing in source
  allKeys: Set<string>;
}

export interface SyncOptions {
  sourceOfTruth?: string;
}

// ============================================================================
// PARSING LOGIC
// ============================================================================

export function parseEnvLine(line: string): ParsedEnvLine {
  const trimmed = line.trim();
  const isComment = trimmed.startsWith('#');
  const isEmpty = trimmed === '';

  if (isComment || isEmpty) {
    return {
      key: '',
      value: '',
      originalLine: line,
      isComment,
      isEmpty,
    };
  }

  const eqIndex = line.indexOf('=');
  if (eqIndex === -1) {
    return {
      key: '',
      value: '',
      originalLine: line,
      isComment: false,
      isEmpty: false,
    };
  }

  let key = line.substring(0, eqIndex).trim();
  const value = line.substring(eqIndex + 1);

  // Handle 'export' prefix (bash syntax: export KEY=value)
  if (key.startsWith('export ')) {
    key = key.substring(7).trim();
  }

  return {
    key,
    value,
    originalLine: line,
    isComment: false,
    isEmpty: false,
  };
}

export function loadEnvFile(filePath: string): EnvFileInfo {
  const fileName = path.basename(filePath);
  if (!fs.existsSync(filePath)) {
    return {
      filePath,
      fileName,
      exists: false,
      content: '',
      lines: [],
      keys: new Set(),
      parsedLines: [],
    };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const keys = new Set<string>();
    const parsedLines: ParsedEnvLine[] = [];

    for (const line of lines) {
      const parsed = parseEnvLine(line);
      parsedLines.push(parsed);
      if (parsed.key) {
        keys.add(parsed.key);
      }
    }

    return {
      filePath,
      fileName,
      exists: true,
      content,
      lines,
      keys,
      parsedLines,
    };
  } catch (error) {
    // In a real scenario, we might want to propagate this, but for analysis we can treat it as empty/error
    console.error(`Failed to read ${fileName}:`, error);
    return {
      filePath,
      fileName,
      exists: false, // Treat read error as non-existent for safety
      content: '',
      lines: [],
      keys: new Set(),
      parsedLines: [],
    };
  }
}

// ============================================================================
// ANALYSIS LOGIC
// ============================================================================

export class EnvFileAnalysis {
  private cwd: string;
  private envFiles: string[];

  constructor(cwd: string) {
    this.cwd = cwd;
    this.envFiles = [
      '.env',
      '.env.local',
      '.env.development',
      '.env.test',
      '.env.testing',
      '.env.staging',
      '.env.production',
      '.env.example',
    ];
  }

  public analyze(options: SyncOptions = {}): EnvAnalysisReport {
    // 1. Discover and Load Files
    const files: EnvFileInfo[] = this.envFiles
      .map(name => loadEnvFile(path.join(this.cwd, name)))
      .filter(f => f.exists);

    // 2. Collect All Unique Keys
    const allKeys = new Set<string>();
    files.forEach(f => {
      f.keys.forEach(k => allKeys.add(k));
    });

    // 3. Determine Source of Truth
    let sourceOfTruthName = options.sourceOfTruth;

    // If not specified, default to .env.example if it exists
    if (!sourceOfTruthName) {
      const exampleFile = files.find(f => f.fileName === '.env.example');
      if (exampleFile) {
        sourceOfTruthName = '.env.example';
      } else if (files.length > 0) {
        // Fallback: This will need to be handled by the caller (interactive prompt)
        // For the report, we can mark it as undefined or pick the first one?
        // Let's explicitly leave it empty to signal "No Master Found".
        sourceOfTruthName = '';
      }
    }

    const missingKeys: Record<string, string[]> = {};
    const orphanKeys: Record<string, string[]> = {};

    // 4. Compare against Source of Truth (if determined)
    if (sourceOfTruthName) {
      const sourceFile = files.find(f => f.fileName === sourceOfTruthName);

      // If the source file was specified but doesn't exist (e.g., user error or deleted), we can't fully analyze discrepancies against it.
      // However, if it DOES exist, we proceed.
      if (sourceFile) {
         const sourceKeys = sourceFile.keys;

         files.forEach(target => {
             if (target.fileName === sourceOfTruthName) return;

             // Missing: In Source but not in Target
             const missing = Array.from(sourceKeys).filter(k => !target.keys.has(k));
             if (missing.length > 0) {
                 missingKeys[target.fileName] = missing;
             }

             // Orphan: In Target but not in Source
             const orphans = Array.from(target.keys).filter(k => !sourceKeys.has(k));
             if (orphans.length > 0) {
                 orphanKeys[target.fileName] = orphans;
             }
         });
      }
    } else {
        // No Source of Truth mode (Peer-to-Peer logic simulation or just raw report)
        // If we want to simulate the "Old Behavior" (Union), every key not in a file is "missing".
        // But for this "Action Oriented" approach, we just report what we found.
        // We can treat 'allKeys' as the virtual source of truth for "missing" calculation if we want a "Union" report.

        files.forEach(target => {
            const missing = Array.from(allKeys).filter(k => !target.keys.has(k));
            if (missing.length > 0) {
                missingKeys[target.fileName] = missing;
            }
        });
    }

    return {
      sourceOfTruth: sourceOfTruthName || '',
      files,
      missingKeys,
      orphanKeys,
      allKeys
    };
  }

  /**
   * Helper to merge new keys into a file content.
   * This is "Pure" logic - it doesn't write to disk.
   */
  public static mergeContent(
    originalContent: string,
    keysToAdd: string[],
    valueProvider: (key: string) => string
  ): string {
    const lines = originalContent.split('\n');
    const newLines = [...lines];

    // Ensure we start on a new line if the file isn't empty and doesn't end with one
    if (newLines.length > 0 && newLines[newLines.length - 1].trim() !== '') {
      newLines.push('');
    }

    keysToAdd.forEach(key => {
        const value = valueProvider(key);
        newLines.push(`${key}=${value}`);
    });

    return newLines.join('\n');
  }

  public static sanitizeKey(key: string): string {
    return key
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }
}
