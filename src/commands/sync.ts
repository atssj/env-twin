import fs from 'fs';
import path from 'path';
import { createBackups } from '../utils/backup.js';
import { EnvFileAnalysis, EnvAnalysisReport } from '../modules/sync-logic.js';
import { confirm, select, colors } from '../utils/ui.js';

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

export async function runSync(options: {
  noBackup?: boolean;
  yes?: boolean;
  json?: boolean;
  source?: string;
} = {}): Promise<void> {
  const cwd = process.cwd();
  const analyzer = new EnvFileAnalysis(cwd);

  // 1. Analyze
  const report: EnvAnalysisReport = analyzer.analyze({ sourceOfTruth: options.source });

  // Handle JSON output mode (AI Agent Mode)
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Check if any files exist
  const existingFiles = report.files.filter(f => f.exists);
  if (existingFiles.length === 0) {
    console.log(colors.yellow('No .env* files found in the current directory.'));
    return;
  }

  console.log(colors.bold(`Found ${existingFiles.length} .env* file(s):`));
  existingFiles.forEach(f => console.log(`  - ${f.fileName}`));
  console.log('');

  // 2. Identify Source of Truth
  let sourceOfTruth = report.sourceOfTruth;

  if (!sourceOfTruth) {
    if (!options.yes) {
       sourceOfTruth = await select<string>(
        'Select the "Source of Truth" file (keys will be synced FROM this file):',
        [
            ...existingFiles.map(f => ({ title: f.fileName, value: f.fileName })),
            { title: 'None (Union of all keys)', value: '' }
        ]
      );
    } else {
        sourceOfTruth = '';
    }
  }

  if (sourceOfTruth) {
      console.log(`${colors.blue('Source of Truth:')} ${colors.bold(sourceOfTruth)}`);
      if (sourceOfTruth !== report.sourceOfTruth) {
          Object.assign(report, analyzer.analyze({ sourceOfTruth }));
      }
  } else {
      console.log(`${colors.blue('Source of Truth:')} ${colors.bold('Union of all files')}`);
  }

  console.log('');

  // 3. Interactive Resolution
  interface PendingAction {
    file: string;
    key: string;
    action: 'add';
    value: string;
  }
  const actions: PendingAction[] = [];

  // 3a. Handle Missing Keys
  const missingFiles = Object.keys(report.missingKeys);

  for (const fileName of missingFiles) {
      const missing = report.missingKeys[fileName];
      if (missing.length === 0) continue;

      console.log(colors.bold(`${fileName} is missing ${missing.length} keys:`));

      let bulkDecision = 'ask';
      if (missing.length > 5 && !options.yes) {
          bulkDecision = await select<string>(
              `How do you want to handle ${missing.length} missing keys in ${fileName}?`,
              [
                  { title: 'Add all (empty values)', value: 'all_empty' },
                  { title: 'Add all (copy from source if possible)', value: 'all_copy' },
                  { title: 'Review one by one', value: 'ask' },
                  { title: 'Skip all', value: 'skip' }
              ]
          );
      } else if (options.yes) {
          bulkDecision = 'all_empty';
      }

      if (bulkDecision === 'skip') continue;

      for (const key of missing) {
          let valueToAdd = '';

          if (bulkDecision === 'all_copy') {
               if (sourceOfTruth) {
                   const sourceFile = report.files.find(f => f.fileName === sourceOfTruth);
                   const parsedLine = sourceFile?.parsedLines.find(p => p.key === key);
                   if (parsedLine) valueToAdd = parsedLine.value;
               } else {
                   // Union mode: find first file that has the key
                   for (const file of report.files) {
                       const parsedLine = file.parsedLines.find(p => p.key === key);
                       if (parsedLine) {
                           valueToAdd = parsedLine.value;
                           break;
                       }
                   }
               }
          } else if (bulkDecision === 'all_empty') {
               valueToAdd = '';
          } else {
              // Interactive
              let sourceValue = '';
              let sourceDescription = '';

              if (sourceOfTruth) {
                  const sourceFile = report.files.find(f => f.fileName === sourceOfTruth);
                  sourceValue = sourceFile?.parsedLines.find(p => p.key === key)?.value || '';
                  sourceDescription = sourceOfTruth;
              } else {
                   // Union mode: find first file that has the key
                   for (const file of report.files) {
                       const parsedLine = file.parsedLines.find(p => p.key === key);
                       if (parsedLine) {
                           sourceValue = parsedLine.value;
                           sourceDescription = file.fileName;
                           break;
                       }
                   }
              }

              const action = await select<string>(
                  `Add ${colors.green(key)} to ${fileName}?`,
                  [
                      { title: `Add empty (${key}=)`, value: 'empty' },
                      sourceValue ? { title: `Copy from ${sourceDescription} (${key}=${sourceValue})`, value: 'copy' } : null,
                      { title: 'Skip', value: 'skip' }
                  ].filter(Boolean) as any
              );

              if (action === 'skip') continue;
              if (action === 'copy') valueToAdd = sourceValue;
          }

          actions.push({ file: fileName, key, action: 'add', value: valueToAdd });
      }
  }

  // 3b. Handle Orphan Keys & .env.example Creation
  // Check if .env.example exists; if not, suggest creating it from All Keys
  const exampleFile = report.files.find(f => f.fileName === '.env.example');

  if (!exampleFile?.exists) {
      // Logic: If .env.example is missing, we should offer to create it.
      // We use 'report.allKeys' as the content source.
      const allKeys = Array.from(report.allKeys).sort();
      if (allKeys.length > 0) {
          let shouldCreate = false;
          if (options.yes) {
              shouldCreate = true;
          } else {
              console.log(colors.yellow('No .env.example file found.'));
              shouldCreate = await confirm('Do you want to create .env.example with all found keys?', true);
          }

          if (shouldCreate) {
              // We add actions to create the file.
              // Since the file doesn't exist, 'mergeContent' will treat original content as empty.
              for (const key of allKeys) {
                  actions.push({
                      file: '.env.example',
                      key,
                      action: 'add',
                      value: `input_${EnvFileAnalysis.sanitizeKey(key)}`
                  });
              }
          }
      }
  }
  // If it DOES exist, we handle orphans (promotion)
  else if (sourceOfTruth) {
      const orphanFiles = Object.keys(report.orphanKeys);
      for (const fileName of orphanFiles) {
          const orphans = report.orphanKeys[fileName];

          if (orphans.length > 0) {
              const potentialPromotions = orphans.filter(k => !report.allKeys.has(k) || !report.files.find(f => f.fileName === sourceOfTruth)?.keys.has(k));

              if (potentialPromotions.length > 0 && !options.yes) {
                  console.log(colors.yellow(`Found ${potentialPromotions.length} keys in ${fileName} that are missing in ${sourceOfTruth}:`));

                  const shouldPromote = await confirm(`Do you want to add these keys to ${sourceOfTruth}?`, false);

                  if (shouldPromote) {
                      for (const key of potentialPromotions) {
                          actions.push({
                              file: sourceOfTruth,
                              key,
                              action: 'add',
                              value: `input_${EnvFileAnalysis.sanitizeKey(key)}`
                          });
                      }
                  }
              }
          }
      }
  }

  // 4. Execution
  if (actions.length === 0) {
      console.log(colors.green('All files are in sync! No actions needed.'));
      return;
  }

  console.log('');
  console.log(colors.bold('Plan:'));
  actions.forEach(a => {
      console.log(`  ${colors.green('+')} ${a.file}: ${a.key}=${colors.dim(a.value)}`);
  });
  console.log('');

  if (!options.yes) {
      const shouldExecute = await confirm('Execute these changes?', true);
      if (!shouldExecute) {
          console.log('Aborted.');
          return;
      }
  }

  // Backup
  if (!options.noBackup) {
      const filesToBackup = Array.from(new Set(actions.map(a => path.join(cwd, a.file))));
      const backupTimestamp = createBackups(filesToBackup, cwd);
      if (backupTimestamp) {
        console.log(colors.dim(`✓ Backup created (timestamp: ${backupTimestamp})`));
      }
  }

  // Apply Changes (Atomic)
  const filesToUpdate = new Set(actions.map(a => a.file));

  for (const fileName of filesToUpdate) {
      const fileActions = actions.filter(a => a.file === fileName);
      const filePath = path.join(cwd, fileName);
      const originalFile = report.files.find(f => f.fileName === fileName);

      const newContent = EnvFileAnalysis.mergeContent(
          originalFile?.content || '',
          fileActions.map(a => a.key),
          (key) => fileActions.find(a => a.key === key)?.value || ''
      );

      // Atomic Write
      const tempPath = `${filePath}.tmp`;
      try {
          // Determine file mode:
          // 1. If file exists, preserve its mode
          // 2. If it's a new sensitive file (.env* but not .env.example), use 0o600
          // 3. Otherwise default permissions
          let mode: number | undefined;

          if (fs.existsSync(filePath)) {
              const stats = fs.statSync(filePath);
              mode = stats.mode;
          } else if (/^\.env(\.|$)/.test(fileName) && fileName !== '.env.example') {
              mode = 0o600;
          }

          const writeOptions: fs.WriteFileOptions = { encoding: 'utf-8' };
          if (mode !== undefined && process.platform !== 'win32') {
              writeOptions.mode = mode;
          }

          fs.writeFileSync(tempPath, newContent, writeOptions);
          fs.renameSync(tempPath, filePath);
          console.log(colors.green(`✓ Updated ${fileName}`));
      } catch (err) {
          console.error(colors.red(`Failed to update ${fileName}:`), err);
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
  }

  console.log('');
  console.log(colors.green('Sync completed successfully!'));
}
