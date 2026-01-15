import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import pc from 'picocolors';
import { createBackups } from '../utils/backup.js';
import { EnvFileAnalysis, EnvAnalysisReport } from '../modules/sync-logic.js';

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
    console.log(pc.yellow('No .env* files found in the current directory.'));
    return;
  }

  console.log(pc.bold(`Found ${existingFiles.length} .env* file(s):`));
  existingFiles.forEach(f => console.log(`  - ${f.fileName}`));
  console.log('');

  // 2. Identify Source of Truth
  let sourceOfTruth = report.sourceOfTruth;

  if (!sourceOfTruth) {
    // If we have an existing source (e.g. .env.example) but it wasn't picked (shouldn't happen with current logic unless manually skipped),
    // or if no clear source exists.

    // If not in non-interactive mode, ask the user
    if (!options.yes) {
       const response = await prompts({
        type: 'select',
        name: 'source',
        message: 'Select the "Source of Truth" file (keys will be synced FROM this file):',
        choices: [
            ...existingFiles.map(f => ({ title: f.fileName, value: f.fileName })),
            { title: 'None (Union of all keys)', value: '' }
        ]
      });
      sourceOfTruth = response.source;
    } else {
        // Auto-mode without explicit source: fallback to union behavior?
        // Or just fail safely. Let's fallback to Union behavior for backward compat in --yes mode
        sourceOfTruth = '';
    }
  }

  if (sourceOfTruth) {
      console.log(pc.blue(`Source of Truth: ${pc.bold(sourceOfTruth)}`));

      // Re-analyze with confirmed source of truth if it changed from initial guess
      if (sourceOfTruth !== report.sourceOfTruth) {
          // We can just re-run analyze or manually re-calc. Re-running is safer/easier.
          Object.assign(report, analyzer.analyze({ sourceOfTruth }));
      }
  } else {
      console.log(pc.blue(`Source of Truth: ${pc.bold('Union of all files')}`));
  }

  console.log('');

  // 3. Interactive Resolution
  // We collect all pending actions here
  interface PendingAction {
    file: string;
    key: string;
    action: 'add';
    value: string;
  }
  const actions: PendingAction[] = [];

  // 3a. Handle Missing Keys (Present in Source, Missing in Target)
  const missingFiles = Object.keys(report.missingKeys);

  for (const fileName of missingFiles) {
      const missing = report.missingKeys[fileName];
      if (missing.length === 0) continue;

      console.log(pc.bold(`${fileName} is missing ${missing.length} keys:`));

      // Bulk Action Threshold
      let bulkDecision = 'ask';
      if (missing.length > 5 && !options.yes) {
          const response = await prompts({
              type: 'select',
              name: 'decision',
              message: `How do you want to handle ${missing.length} missing keys in ${fileName}?`,
              choices: [
                  { title: 'Add all (empty values)', value: 'all_empty' },
                  { title: 'Add all (copy from source if possible)', value: 'all_copy' },
                  { title: 'Review one by one', value: 'ask' },
                  { title: 'Skip all', value: 'skip' }
              ]
          });
          bulkDecision = response.decision;
      } else if (options.yes) {
          bulkDecision = 'all_empty'; // Default safe action in non-interactive mode
      }

      if (bulkDecision === 'skip') continue;

      for (const key of missing) {
          let valueToAdd = '';

          if (bulkDecision === 'all_copy') {
              // Try to find value in source of truth
               const sourceFile = report.files.find(f => f.fileName === sourceOfTruth);
               const parsedLine = sourceFile?.parsedLines.find(p => p.key === key);
               if (parsedLine) valueToAdd = parsedLine.value;
          } else if (bulkDecision === 'all_empty') {
               valueToAdd = ''; // Explicitly empty
          } else {
              // Interactive
              const sourceFile = report.files.find(f => f.fileName === sourceOfTruth);
              const sourceValue = sourceFile?.parsedLines.find(p => p.key === key)?.value || '';

              const response = await prompts({
                  type: 'select',
                  name: 'action',
                  message: `Add ${pc.green(key)} to ${fileName}?`,
                  choices: [
                      { title: `Add empty (${key}=)`, value: 'empty' },
                      sourceValue ? { title: `Copy from ${sourceOfTruth} (${key}=${sourceValue})`, value: 'copy' } : null,
                      { title: 'Skip', value: 'skip' }
                  ].filter(Boolean) as any
              });

              if (response.action === 'skip') continue;
              if (response.action === 'copy') valueToAdd = sourceValue;
          }

          actions.push({ file: fileName, key, action: 'add', value: valueToAdd });
      }
  }

  // 3b. Handle Orphan Keys (Present in Target, Missing in Source)
  // Only relevant if we have a specific Source of Truth (like .env.example) and we want to "promote" keys
  if (sourceOfTruth) {
      const orphanFiles = Object.keys(report.orphanKeys);
      for (const fileName of orphanFiles) {
          // We only care about orphans in "local" files being promoted to the "example" file
          // If the source of truth IS the file, it has no orphans by definition.
          // Typically we want to know: "I added API_KEY to .env, should I add it to .env.example?"

          // Logic: If I am syncing FROM .env.example TO .env, I don't care about extra keys in .env usually.
          // BUT, if I developed a feature and added a key to .env, I might want to back-port it to .env.example.

          const orphans = report.orphanKeys[fileName];
          // We only prompt to add TO the source of truth
          if (orphans.length > 0) {
              // Check if we already handled this key (e.g. it was missing in another file, but we are adding it there?)
              // No, this is about adding TO sourceOfTruth.

              const potentialPromotions = orphans.filter(k => !report.allKeys.has(k) || !report.files.find(f => f.fileName === sourceOfTruth)?.keys.has(k));

              if (potentialPromotions.length > 0 && !options.yes) {
                  // Prompt user
                  console.log(pc.yellow(`Found ${potentialPromotions.length} keys in ${fileName} that are missing in ${sourceOfTruth}:`));
                  // Simplified bulk ask
                  const response = await prompts({
                      type: 'confirm',
                      name: 'promote',
                      message: `Do you want to add these keys to ${sourceOfTruth}?`,
                      initial: false
                  });

                  if (response.promote) {
                      for (const key of potentialPromotions) {
                          actions.push({
                              file: sourceOfTruth,
                              key,
                              action: 'add',
                              value: `input_${EnvFileAnalysis.sanitizeKey(key)}` // Sanitize for example file
                          });
                      }
                  }
              }
          }
      }
  } else {
      // Union Mode: If no single source of truth, "Missing" covered everything.
  }

  // 4. Execution
  if (actions.length === 0) {
      console.log(pc.green('All files are in sync! No actions needed.'));
      return;
  }

  console.log('');
  console.log(pc.bold('Plan:'));
  actions.forEach(a => {
      console.log(`  ${pc.green('+')} ${a.file}: ${a.key}=${pc.dim(a.value)}`);
  });
  console.log('');

  if (!options.yes) {
      const confirm = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'Execute these changes?',
          initial: true
      });
      if (!confirm.value) {
          console.log('Aborted.');
          return;
      }
  }

  // Backup
  if (!options.noBackup) {
      const filesToBackup = Array.from(new Set(actions.map(a => path.join(cwd, a.file))));
      const backupTimestamp = createBackups(filesToBackup, cwd);
      if (backupTimestamp) {
        console.log(pc.dim(`✓ Backup created (timestamp: ${backupTimestamp})`));
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
          fs.writeFileSync(tempPath, newContent, 'utf-8');
          fs.renameSync(tempPath, filePath);
          console.log(pc.green(`✓ Updated ${fileName}`));
      } catch (err) {
          console.error(pc.red(`Failed to update ${fileName}:`), err);
          // Try to clean up temp
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
  }

  console.log('');
  console.log(pc.green('Sync completed successfully!'));
}
