# env-twin - Gaps, Limitations & Enhancement Opportunities

## High Priority Issues

### 1. No File Locking / Concurrency Control

**Related Questions:** Q12 (Concurrency & Safety)
**Issue:** Multiple simultaneous sync/restore operations can corrupt files due to race conditions
**Impact:** Production environments with concurrent CI/CD pipelines at risk
**Suggested Implementation:**

- Implement file-based locking using `fs.mkdir()` atomic operation
- Add lock timeout and stale lock cleanup
- Provide clear error messages when lock is held
  **Files to Modify:** `src/commands/sync.ts`, `src/commands/restore.ts`, `src/utils/backup.ts`

### 2. No Exclusion/Filtering Mechanism

**Related Questions:** Q4 (Filtering & Exclusion)
**Issue:** Cannot exclude specific files or keys from sync; all `.env*` files are always synced
**Impact:** Users cannot customize which files/keys are processed
**Suggested Implementation:**

- Add `.env-twinignore` file support (similar to `.gitignore`)
- Support glob patterns for file and key exclusion
- Add `--exclude-files` and `--exclude-keys` CLI flags
  **Files to Modify:** `src/commands/sync.ts`, `src/index.ts`

### 3. Placeholder Format Not Customizable

**Related Questions:** Q3 (Security & Sensitive Data)
**Issue:** Hardcoded `input_<key>` format cannot be changed
**Impact:** Users cannot adapt to their project's naming conventions
**Suggested Implementation:**

- Add `--placeholder-format` CLI flag
- Support template variables: `{key}`, `{key_lower}`, `{key_upper}`
- Add configuration file support (`.env-twinrc.json`)
  **Files to Modify:** `src/index.ts`, `src/commands/sync.ts`

### 4. No Age-Based Backup Retention

**Related Questions:** Q17 (Backup Management)
**Issue:** `clean-backups` only supports quantity-based retention, not age-based
**Impact:** Cannot automatically clean backups older than N days
**Suggested Implementation:**

- Add `--older-than <days>` flag to `clean-backups`
- Add `--max-age <days>` flag for automatic cleanup
- Support both quantity and age-based retention together
  **Files to Modify:** `src/commands/clean-backups.ts`, `src/utils/backup.ts`

### 5. No Programmatic API / Library Export

**Related Questions:** Q13 (CI/CD Integration), Q19 (Contribution)
**Issue:** env-twin is CLI-only; cannot be used as a library in other Node.js projects
**Impact:** Cannot integrate env-twin into custom build tools or applications
**Suggested Implementation:**

- Export core functions from `src/index.ts`
- Create public API: `sync()`, `restore()`, `cleanBackups()`
- Add TypeScript type definitions
- Document programmatic usage
  **Files to Modify:** `src/index.ts`, `src/commands/*.ts`, `package.json`

## Medium Priority Issues

### 6. Incomplete Error Handling for Corrupted Backups

**Related Questions:** Q5 (Backup & Restore)
**Issue:** Limited validation for corrupted or incomplete backup files
**Impact:** Restore may fail silently or with unclear error messages
**Suggested Implementation:**

- Add checksum validation for backup files
- Detect incomplete backups (missing expected files)
- Provide detailed error messages for each validation failure
- Add `--validate-backups` command
  **Files to Modify:** `src/modules/backup-discovery.ts`, `src/commands/restore.ts`

### 7. No Configuration File Support

**Related Questions:** Q3, Q4, Q13
**Issue:** All options must be passed via CLI flags; no `.env-twinrc` or similar
**Impact:** Difficult to maintain consistent settings across team
**Suggested Implementation:**

- Support `.env-twinrc.json` or `.env-twinrc.yaml`
- Support `env-twin` field in `package.json`
- CLI flags override config file settings
- Document configuration schema
  **Files to Modify:** `src/index.ts`, new file: `src/utils/config.ts`

### 8. No Multiline Value Support

**Related Questions:** Q10 (File Format & Compatibility)
**Issue:** Multiline environment variable values are not supported
**Impact:** Cannot sync projects using multiline values (e.g., certificates, JSON)
**Suggested Implementation:**

- Add support for quoted multiline values
- Handle escaped newlines (`\n`)
- Add validation for multiline format
- Document supported formats
  **Files to Modify:** `src/commands/sync.ts`, `src/index.ts`

### 9. No Inline Comment Preservation

**Related Questions:** Q11 (File Format & Compatibility)
**Issue:** Inline comments (after values) are lost during sync
**Impact:** Documentation in `.env` files is partially lost
**Suggested Implementation:**

- Parse and preserve inline comments
- Add `--preserve-inline-comments` flag
- Store inline comments in metadata
  **Files to Modify:** `src/commands/sync.ts`

### 10. No Manual Rollback Command

**Related Questions:** Q7 (Backup & Restore)
**Issue:** Rollback only happens automatically on failure; no manual trigger
**Impact:** Users cannot manually revert to previous state after successful restore
**Suggested Implementation:**

- Add `env-twin rollback [snapshot-id]` command
- List available snapshots with `env-twin rollback --list`
- Add `--to-snapshot <id>` flag to restore command
  **Files to Modify:** `src/commands/restore.ts`, `src/index.ts`

### 11. No Configurable Backup Directory

**Related Questions:** Q8 (Backup & Restore)
**Issue:** Backup directory hardcoded to `.env-twin/`
**Impact:** Cannot store backups in custom locations (e.g., cloud storage, external drive)
**Suggested Implementation:**

- Add `--backup-dir` CLI flag
- Support environment variable `ENV_TWIN_BACKUP_DIR`
- Add to configuration file
  **Files to Modify:** `src/utils/backup.ts`, `src/index.ts`

### 12. Limited Test Coverage

**Related Questions:** Q18 (Testing & Quality)
**Issue:** Missing tests for error scenarios, edge cases, and large files
**Impact:** Bugs may not be caught before release
**Suggested Implementation:**

- Add tests for corrupted backups
- Add tests for permission denied scenarios
- Add tests for very large files (>100MB)
- Add tests for special characters in paths
- Increase coverage to >80%
  **Files to Modify:** `src/index.test.ts`, new files: `src/**/*.test.ts`

## Low Priority Issues

### 13. No CONTRIBUTING.md File

**Related Questions:** Q19 (Contribution & Community)
**Issue:** No formal contribution guidelines
**Impact:** Unclear how to contribute or what standards to follow
**Suggested Implementation:**

- Create `CONTRIBUTING.md` with detailed guidelines
- Document code style and conventions
- Add PR template
- Document testing requirements
  **Files to Create:** `CONTRIBUTING.md`, `.github/pull_request_template.md`

### 14. No Comparison with Conflicting Values

**Related Questions:** Q1 (Conflict Resolution)
**Issue:** No way to see which files have different values for same key
**Impact:** Users cannot identify configuration inconsistencies
**Suggested Implementation:**

- Add `env-twin compare` command
- Show diff of values across files
- Highlight conflicts
  **Files to Modify:** `src/index.ts`, new file: `src/commands/compare.ts`

### 15. No Dry-Run for Sync Command

**Related Questions:** Q13 (CI/CD Integration)
**Issue:** `--dry-run` only works for restore, not sync
**Impact:** Cannot preview sync changes before applying
**Suggested Implementation:**

- Add `--dry-run` flag to sync command
- Show what keys would be added
- Show which files would be modified
  **Files to Modify:** `src/commands/sync.ts`, `src/index.ts`

### 16. No Watch Mode

**Related Questions:** Q13 (CI/CD Integration)
**Issue:** Cannot automatically sync when files change
**Impact:** Manual sync required after each file change
**Suggested Implementation:**

- Add `--watch` flag to sync command
- Use `fs.watch()` or `chokidar` library
- Auto-sync on `.env*` file changes
  **Files to Modify:** `src/commands/sync.ts`, `src/index.ts`, `package.json`

### 17. No Diff/Comparison Output

**Related Questions:** Q1, Q15
**Issue:** No way to see what changed after sync
**Impact:** Difficult to verify sync results
**Suggested Implementation:**

- Add `--show-diff` flag
- Display added/removed/modified keys
- Show before/after values
  **Files to Modify:** `src/commands/sync.ts`

### 18. No Environment Variable Expansion

**Related Questions:** Q10 (File Format & Compatibility)
**Issue:** Variables like `$BASE_URL` are not expanded
**Impact:** Cannot use variable references in `.env` files
**Suggested Implementation:**

- Add `--expand-vars` flag
- Support `$VAR` and `${VAR}` syntax
- Handle circular references
  **Files to Modify:** `src/commands/sync.ts`

### 19. No Programmatic Error Codes

**Related Questions:** Q14 (Error Handling)
**Issue:** All errors return exit code 1; no specific error codes
**Impact:** Difficult to handle specific errors in scripts
**Suggested Implementation:**

- Define error code constants (e.g., 2=file not found, 3=permission denied)
- Document error codes
- Return appropriate exit code for each error type
  **Files to Modify:** `src/index.ts`, all command files

### 20. No Verbose Logging for Sync

**Related Questions:** Q13 (CI/CD Integration)
**Issue:** `--verbose` flag only works for restore, not sync
**Impact:** Cannot debug sync issues in CI/CD
**Suggested Implementation:**

- Add `--verbose` flag to sync command
- Log each file processed
- Log keys added/removed
  **Files to Modify:** `src/commands/sync.ts`, `src/index.ts`
