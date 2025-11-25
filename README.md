# env-twin

Keep your environment configurations perfectly synchronized across all `.env*` files. env-twin automatically manages your environment variables by unifying keys across all files, securing sensitive data in example templates, and maintaining consistent configurations throughout your development lifecycle.

[![Build and Test](https://github.com/atssj/env-twin/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/atssj/env-twin/actions/workflows/test.yml)

## Features

- 🚀 Automatically syncs environment variables between all `.env*` files
- 🔒 Securely handles sensitive data by removing actual values in example files
- 📝 Preserves comments and formatting
- 🛠️ Customizable input/output file paths
- 💪 Written in TypeScript for better type safety and maintainability
- 🔄 Multi-command CLI with `sync`, `restore`, and `clean-backups` commands
- 🎯 Smart backup management with automatic timestamped backups
- 🧼 Cleanup old backups to save disk space
- 🛡️ Enhanced restore with rollback capability and validation
- 📋 List available backups for easy selection

## Installation

<details>
<summary>Bun</summary>

```bash
bun add env-twin
```

</details>

<details>
<summary>npm</summary>

```bash
npm install env-twin
```

</details>

<details>
<summary>yarn</summary>

```bash
yarn add env-twin
```

</details>

<details>
<summary>pnpm</summary>

```bash
pnpm add env-twin
```

</details>

## Usage

### Basic Usage

<details>
<summary>Bun</summary>

```bash
# Using default paths (.env -> .env.example)
bunx env-twin

# Using custom paths
bunx env-twin --source .env.development --dest .env.dev.example

# Using commands
bunx env-twin sync
bunx env-twin restore
bunx env-twin clean-backups
```

</details>

<details>
<summary>npm</summary>

```bash
# Using default paths (.env -> .env.example)
npx env-twin

# Using custom paths
npx env-twin --source .env.development --dest .env.dev.example

# Using commands
npx env-twin sync
npx env-twin restore
npx env-twin clean-backups
```

</details>

<details>
<summary>yarn</summary>

```bash
# Using default paths (.env -> .env.example)
yarn env-twin

# Using custom paths
yarn env-twin --source .env.development --dest .env.dev.example

# Using commands
yarn env-twin sync
yarn env-twin restore
yarn env-twin clean-backups
```

</details>

<details>
<summary>pnpm</summary>

```bash
# Using default paths (.env -> .env.example)
pnpm env-twin

# Using custom paths
pnpm env-twin --source .env.development --dest .env.dev.example

# Using commands
pnpm env-twin sync
pnpm env-twin restore
pnpm env-twin clean-backups
```

</details>

### Command Line Options

| Option      | Alias                                       | Description                        | Default        |
| ----------- | ------------------------------------------- | ---------------------------------- | -------------- |
| `--source`  | `--src`                                     | Source .env file path              | `.env`         |
| `--dest`    | `--destination`, `--d`, `--out`, `--target` | Destination .env.example file path | `.env.example` |
| `--help`    | `-h`                                        | Display help message               | -              |
| `--version` | `-v`                                        | Display version information        | -              |

### Commands

env-twin provides several commands for managing environment files:

#### sync

Synchronize environment variable keys across all .env* files in the current directory.

```bash
env-twin sync [options]
```

Options:
- `--no-backup` - Skip creating a backup before syncing
- `--help`, `-h` - Display help for the sync command

The sync command will:
- Detect all .env* files (.env, .env.local, .env.development, .env.testing, .env.staging, .env.example)
- Collect all unique environment variable keys from all files
- Add missing keys to each file with empty values
- Ensure .env.example contains all keys
- Preserve existing values and file structure
- Create a backup in .env-twin/ before modifying files

Examples:
```bash
env-twin sync
env-twin sync --no-backup
```

#### restore

Restore .env* files from a backup. When no timestamp is provided, the most recent valid backup will be automatically selected.

```bash
env-twin restore [timestamp] [options]
```

Arguments:
- `timestamp` - Specific backup timestamp to restore (format: YYYYMMDD-HHMMSS). If omitted, the most recent backup will be used automatically.

Options:
- `--yes`, `-y` - Skip confirmation prompt
- `--list` - List available backups without restoring
- `--preserve-permissions` - Preserve original file permissions
- `--preserve-timestamps` - Preserve original file timestamps
- `--create-rollback` - Create pre-restore snapshot for rollback capability
- `--force`, `-f` - Force restore without checking for changes
- `--dry-run`, `--simulate` - Show what would be restored without making changes
- `--verbose`, `-v` - Enable verbose logging
- `--help`, `-h` - Display help for the restore command

Enhanced Features:
- ✅ Automatic backup discovery - finds most recent backup when no timestamp provided
- ✅ Backup validation - checks integrity before restoration
- ✅ Rollback capability - automatic recovery if restoration fails
- ✅ Cross-platform compatibility - works on Windows, macOS, and Linux
- ✅ Progress tracking - real-time feedback during restoration
- ✅ Comprehensive logging - detailed operation logs for debugging

Examples:
```bash
env-twin restore                           # Restore most recent backup
env-twin restore 20241125-143022          # Restore specific backup
env-twin restore 20241125-143022 --yes    # Restore without confirmation
env-twin restore --list                   # List all available backups
env-twin restore --dry-run                # Preview restore without changes
env-twin restore --verbose                # Enable detailed logging
```

# Advanced usage
```bash
env-twin restore --create-rollback --preserve-permissions --verbose
```

#### clean-backups

Delete old backups, keeping the most recent ones.

```bash
env-twin clean-backups [options]
```

Options:
- `--keep <number>` - Number of recent backups to keep (default: 10)
- `--yes`, `-y` - Skip confirmation prompt
- `--help`, `-h` - Display help for the clean-backups command

Examples:
```bash
env-twin clean-backups
env-twin clean-backups --keep 5
env-twin clean-backups --keep 5 --yes
```

### Examples

<details>
<summary>Bun</summary>

```bash
# Sync development environment
bunx env-twin --source .env.development --dest .env.dev.example

# Sync production environment
bunx env-twin --source .env.production --dest .env.prod.example

# Sync with custom paths
bunx env-twin --source config/.env.local --dest config/.env.example

# Using commands
bunx env-twin sync
bunx env-twin restore
bunx env-twin clean-backups --keep 5
```

</details>

<details>
<summary>npm</summary>

```bash
# Sync development environment
npx env-twin --source .env.development --dest .env.dev.example

# Sync production environment
npx env-twin --source .env.production --dest .env.prod.example

# Sync with custom paths
npx env-twin --source config/.env.local --dest config/.env.example

# Using commands
npx env-twin sync
npx env-twin restore
npx env-twin clean-backups --keep 5
```

</details>

<details>
<summary>yarn</summary>

```bash
# Sync development environment
yarn env-twin --source .env.development --dest .env.dev.example

# Sync production environment
yarn env-twin --source .env.production --dest .env.prod.example

# Sync with custom paths
yarn env-twin --source config/.env.local --dest config/.env.example

# Using commands
yarn env-twin sync
yarn env-twin restore
yarn env-twin clean-backups --keep 5
```

</details>

<details>
<summary>pnpm</summary>

```bash
# Sync development environment
pnpm env-twin --source .env.development --dest .env.dev.example

# Sync production environment
pnpm env-twin --source .env.production --dest .env.prod.example

# Sync with custom paths
pnpm env-twin --source config/.env.local --dest config/.env.example

# Using commands
pnpm env-twin sync
pnpm env-twin restore
pnpm env-twin clean-backups --keep 5
```

</details>

## How It Works

env-twin processes your environment files in the following way:

1. Reads the source `.env` file
2. Preserves all comments and empty lines
3. For each environment variable:
   - Keeps the original variable name
   - Replaces the value with a placeholder in the format: `"input_variable_name"`
4. Writes the processed content to the destination `.env.example` file

### Example Transformation

Input (`.env`):

```env
# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_USER=admin
DB_PASSWORD=secret123
```

Output (`.env.example`):

```env
# Database configuration
DB_HOST="input_db_host"
DB_PORT="input_db_port"
DB_NAME="input_db_name"
DB_USER="input_db_user"
DB_PASSWORD="input_db_password"
```

## Frequently Asked Questions (FAQ)

### Conflict Resolution & Priority

<details>
<summary><strong>Q1: What happens if there are conflicting values for the same environment variable across multiple .env* files during the sync operation? Which value takes precedence, and what is the priority order?</strong></summary>

A: env-twin does **not prioritize or merge conflicting values**. Instead, it uses a **union approach**:
- During sync, all unique keys from all `.env*` files are collected into a single set
- Missing keys are added to each file with **empty values** (not merged from other files)
- Existing values in each file are **preserved as-is** and never overwritten
- The priority order for file discovery is: `.env`, `.env.local`, `.env.development`, `.env.testing`, `.env.staging`, `.env.example`
- However, this order is only for discovery; it does not affect value precedence during sync

**Example:**
```bash
# .env contains: DB_HOST=localhost
# .env.local contains: DB_HOST=remote-host
# After sync: Both files keep their original values, no conflict resolution occurs
```

</details>

### Security & Sensitive Data Handling

<details>
<summary><strong>Q2: How exactly does env-twin handle sensitive data during sync? Does it remove/sanitize values only in .env.example files, or are there other protections? What is the exact mechanism used?</strong></summary>

A: env-twin handles sensitive data **only in the default command** (when using `--source` and `--dest` flags without the `sync` command):
- The **default command** reads a source `.env` file and creates a destination `.env.example` file with **sanitized placeholder values**
- Placeholder format: `input_<variable_name_lowercase>` (e.g., `DB_PASSWORD` becomes `input_db_password`)
- The **sync command** does NOT sanitize values; it only adds missing keys with **empty values** to all files
- Actual `.env` files are **never modified** by the default command; only the example file is created/updated
- No encryption or advanced sanitization is performed; it's a simple string replacement mechanism

**Important:** The sync command does not sanitize values, so sensitive data in actual `.env` files remains unchanged.

</details>

<details>
<summary><strong>Q3: Can users customize the placeholder format for variable values in .env.example files (currently appears to be "input_variable_name")? If so, how? If not, is this configurable?</strong></summary>

A: **No, the placeholder format is NOT customizable.** The format is hardcoded as:
```javascript
const inputValue = `input_${key.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
```

This means:
- Variable names are converted to lowercase
- Non-alphanumeric characters are replaced with underscores
- The prefix `input_` is always used
- There is no configuration option to change this behavior

**Example transformations:**
- `DB_HOST` → `input_db_host`
- `API_KEY_V2` → `input_api_key_v2`
- `CACHE-URL` → `input_cache_url`

</details>

### Filtering & Exclusion

<details>
<summary><strong>Q4: Is there a mechanism to exclude certain environment variable keys or specific .env* files from the sync operation? If so, what is the syntax/configuration?</strong></summary>

A: **No exclusion mechanism exists.** env-twin:
- Automatically discovers and syncs **all** `.env*` files in the current directory
- Syncs **all** environment variable keys found across all files
- Does not support `.env-twinignore` or similar exclusion files
- Does not support configuration files to specify which files or keys to exclude

**Supported files for auto-discovery:**
- `.env`
- `.env.local`
- `.env.development`
- `.env.testing`
- `.env.staging`
- `.env.example`

If you need to exclude files, you must manually manage them outside the project directory or use a different tool.

</details>

### Backup & Restore Behavior

<details>
<summary><strong>Q5: How does the restore command handle scenarios where backup files are corrupted, incomplete, or missing? What error handling exists?</strong></summary>

A: env-twin includes **comprehensive backup validation and error handling**:

**Backup Discovery & Validation:**
- Validates backup directory exists and is readable
- Checks backup file naming format: `<filename>.<YYYYMMDD-HHMMSS>`
- Validates timestamp format (YYYYMMDD-HHMMSS)
- Detects incomplete backups (missing expected files)
- Provides detailed error messages for each validation failure

**Error Handling:**
- If no backups found: `Error: No backups found in .env-twin/ directory`
- If backup directory not readable: `Error: Backup directory not readable: <error details>`
- If backup files are corrupted: Individual file restore failures are logged with specific error messages
- If restore fails: Automatic rollback is triggered (if `--create-rollback` is enabled)

**Example error output:**
```
📁 Discovering available backups...
❌ Backup validation failed: Backup directory not readable
Error: Failed to discover backups
```

</details>

<details>
<summary><strong>Q6: What specific file metadata (permissions, timestamps, ownership, etc.) is preserved or restored by the --preserve-permissions and --preserve-timestamps options?</strong></summary>

A: env-twin preserves the following metadata:

**--preserve-permissions:**
- Preserves file mode (Unix-style permissions, e.g., 0644, 0755)
- Uses `fs.chmodSync()` to restore permissions
- Only applies if the file existed before restoration
- Cross-platform compatible (Windows, macOS, Linux)

**--preserve-timestamps:**
- Preserves file modification time (mtime)
- Preserves file access time (atime)
- Uses `fs.utimesSync()` to restore timestamps
- Maintains original file creation metadata

**NOT preserved:**
- File ownership (uid/gid) - not supported by Node.js fs module on all platforms
- Extended attributes or ACLs
- Symbolic links or hard links

**Default behavior:**
- Both options default to `true` in the enhanced restore command
- Can be disabled with `--no-preserve-permissions` or `--no-preserve-timestamps` (if implemented)

</details>

<details>
<summary><strong>Q7: How does the rollback capability work during restore operations? What triggers a rollback, and can users manually trigger it if needed?</strong></summary>

A: env-twin includes **automatic rollback capability** with the following behavior:

**Automatic Rollback Triggers:**
- Restore operation fails (file write errors, permission issues, etc.)
- Partial restore occurs (some files restored, others fail)
- Validation errors during restore process
- User cancels operation during restore

**Rollback Mechanism:**
- Pre-restore snapshot is created (if `--create-rollback` is enabled)
- Snapshot includes file content, permissions, and metadata
- Stored in `.env-twin/rollbacks/<snapshot-id>/` directory
- Automatically triggered if restore fails
- Restores files to their pre-restore state

**Manual Rollback:**
- Currently **no manual rollback command** exists
- Rollback is automatic on failure only
- Users cannot manually trigger rollback after a successful restore

**Example:**
```bash
env-twin restore --create-rollback --preserve-permissions
# If restore fails, automatic rollback occurs
# Files are restored to their state before the restore attempt
```

</details>

<details>
<summary><strong>Q8: What is the exact folder structure and file format used for backups in the .env-twin/ directory? Is the backup directory location configurable?</strong></summary>

A: **Backup Structure:**

```
.env-twin/
├── .env.<YYYYMMDD-HHMMSS>
├── .env.local.<YYYYMMDD-HHMMSS>
├── .env.development.<YYYYMMDD-HHMMSS>
└── rollbacks/
    └── <snapshot-id>/
        ├── metadata.json
        ├── <filename>.content
        └── <filename>.permissions
```

**Backup File Format:**
- Plain text files (same format as original `.env` files)
- Naming: `<original-filename>.<YYYYMMDD-HHMMSS>`
- Timestamp format: YYYYMMDD-HHMMSS (e.g., 20241125-143022)
- All backups for a single sync operation share the same timestamp

**Rollback Snapshot Structure:**
- Stored in `.env-twin/rollbacks/<snapshot-id>/`
- `metadata.json`: Contains file metadata and snapshot information
- `<filename>.content`: File content (if `includeContent: true`)
- `<filename>.permissions`: File permissions (if `includePermissions: true`)

**Backup Directory Location:**
- **NOT configurable** - hardcoded to `.env-twin/` in the current working directory
- Constant: `BACKUP_DIR = '.env-twin'`
- No environment variable or configuration option to change this

</details>

<details>
<summary><strong>Q9: What are the implications and risks of using the --no-backup option during sync, especially in production environments?</strong></summary>

A: **Risks of --no-backup:**

**Data Loss Risks:**
- No backup created before modifying files
- If sync operation fails mid-way, no recovery point exists
- Cannot restore to previous state if sync introduces errors
- Particularly dangerous if sync adds incorrect keys or corrupts file structure

**Production Environment Concerns:**
- **NOT recommended** for production use
- If sync fails, manual recovery may be required
- No audit trail of what changed
- Difficult to troubleshoot issues after the fact

**When --no-backup is Safe:**
- Development environments with version control
- Test environments where data loss is acceptable
- When you have external backups already in place
- When running sync as part of a CI/CD pipeline with rollback capability

**Recommended Practice:**
```bash
# Always use backups in production
env-twin sync

# Only skip backups in development with version control
env-twin sync --no-backup
```

</details>

### File Format & Compatibility

<details>
<summary><strong>Q10: Are there any .env file formats, syntax patterns, or edge cases that are unsupported or known to cause issues with env-twin?</strong></summary>

A: **Supported Formats:**
- Standard key=value pairs: `KEY=value`
- Empty values: `KEY=`
- Comments: `# This is a comment`
- Empty lines and whitespace
- Values with spaces: `KEY=value with spaces`
- Values with special characters: `KEY=value!@#$%`

**Known Limitations & Edge Cases:**

1. **Multiline Values:** NOT supported
   ```env
   # This will NOT work correctly
   MULTILINE="line1
   line2"
   ```

2. **Quoted Values:** Quotes are preserved as-is
   ```env
   KEY="value"  # Quotes are kept in the value
   ```

3. **Lines without equals sign:** Treated as invalid and skipped
   ```env
   INVALID_LINE  # No equals sign - ignored
   ```

4. **Variable Expansion:** NOT supported
   ```env
   BASE_URL=http://localhost
   FULL_URL=$BASE_URL/api  # $BASE_URL is NOT expanded
   ```

5. **Inline Comments:** NOT supported
   ```env
   KEY=value  # This comment is part of the value, not a comment
   ```

6. **Duplicate Keys:** Last value wins (standard behavior)
   ```env
   KEY=value1
   KEY=value2  # This value is used
   ```

</details>

<details>
<summary><strong>Q11: How exactly does env-twin preserve comments and formatting in .env files? Are there any known limitations or edge cases where formatting is lost?</strong></summary>

A: **Comment & Formatting Preservation:**

env-twin preserves:
- All comment lines (lines starting with `#`)
- Empty lines and blank lines
- Indentation and whitespace at the beginning of lines
- Line endings (LF/CRLF)

**Preservation Mechanism:**
- Files are read line-by-line
- Each line is classified as: comment, empty, or key=value
- Comments and empty lines are preserved exactly as-is
- Only key=value lines are processed
- Content is rejoined with original line breaks

**Known Limitations:**

1. **Inline Comments:** Lost during sync
   ```env
   # Before sync
   DB_HOST=localhost  # Database host

   # After sync (inline comment lost)
   DB_HOST=localhost
   ```

2. **Trailing Whitespace:** May be affected by file writing
   ```env
   # Trailing spaces might be trimmed depending on editor settings
   KEY=value
   ```

3. **Mixed Line Endings:** Normalized to LF
   ```env
   # CRLF (Windows) is converted to LF (Unix)
   ```

4. **Comments Between Key-Value Pairs:** Preserved but may shift position
   ```env
   # Comment about KEY1
   KEY1=value1
   # Comment about KEY2
   KEY2=value2
   # After adding new keys, position may change
   ```

</details>

### Concurrency & Safety

<details>
<summary><strong>Q12: How is concurrency handled if multiple sync or restore commands are executed simultaneously? Are there file locks or other safety mechanisms?</strong></summary>

A: **Concurrency Handling:**

env-twin **does NOT implement file locking mechanisms**. Current behavior:

**Race Condition Risks:**
- Multiple simultaneous sync operations can corrupt files
- Multiple simultaneous restore operations can cause data loss
- No mutex or semaphore to prevent concurrent access
- File writes are not atomic

**What Happens with Concurrent Operations:**
- Last write wins (file system behavior)
- Partial writes may occur
- Backup files may be incomplete
- Restore may restore partially-synced files

**Recommendations for Concurrent Environments:**
1. Use external locking (e.g., file-based locks, distributed locks)
2. Run env-twin through a queue system (one operation at a time)
3. Use CI/CD pipeline constraints to prevent concurrent runs
4. Implement application-level synchronization

**Example Safe Pattern:**
```bash
# Use a lock file to prevent concurrent execution
if mkdir .env-twin.lock 2>/dev/null; then
  trap "rmdir .env-twin.lock" EXIT
  env-twin sync
else
  echo "Another env-twin operation is in progress"
  exit 1
fi
```

</details>

### CI/CD Integration

<details>
<summary><strong>Q13: Can env-twin be integrated into CI/CD pipelines? What are the recommended best practices, command-line flags, or configurations for automated environments?</strong></summary>

A: **CI/CD Integration - YES, Fully Supported**

env-twin is designed for CI/CD pipelines with the following features:

**Recommended Flags for CI/CD:**
```bash
# Skip confirmation prompts
env-twin sync --no-backup --yes

# Restore with automatic backup selection
env-twin restore --yes --verbose

# Clean old backups
env-twin clean-backups --keep 5 --yes

# Dry-run to preview changes
env-twin restore --dry-run --verbose
```

**Best Practices:**

1. **In Build/Test Stage:**
   ```bash
   env-twin sync --no-backup  # Sync keys without backup
   ```

2. **In Deployment Stage:**
   ```bash
   env-twin sync              # Create backup before sync
   env-twin restore --yes     # Restore if needed
   ```

3. **Cleanup Stage:**
   ```bash
   env-twin clean-backups --keep 10 --yes
   ```

4. **Error Handling:**
   - Exit codes: 0 (success), 1 (error)
   - Check exit code in CI/CD pipeline
   - Use `--verbose` for debugging

**GitHub Actions Example:**
```yaml
- name: Sync environment files
  run: npx env-twin sync --no-backup

- name: Restore from backup if needed
  if: failure()
  run: npx env-twin restore --yes --verbose
```

**GitLab CI Example:**
```yaml
sync_env:
  script:
    - npx env-twin sync --no-backup
  on_failure:
    - npx env-twin restore --yes --verbose
```

</details>

### Error Handling

<details>
<summary><strong>Q14: What happens if source or destination .env file paths are invalid, don't exist, or are inaccessible? What error messages and exit codes are returned?</strong></summary>

A: **Error Handling for Invalid Paths:**

**Source File Not Found:**
```
Error: Source file '<path>' not found!
Use --src or --source to specify a different source file.
Exit code: 1
```

**Destination File Not Writable:**
```
Error: Failed to write '<path>': <error details>
Exit code: 1
```

**Permission Denied:**
```
Error: Failed to read '<path>': EACCES: permission denied
Exit code: 1
```

**Invalid Path Format:**
```
Error: Unknown option '<invalid-flag>'
Exit code: 1
```

**Backup Directory Not Accessible:**
```
Error: Failed to backup <filename>: EACCES: permission denied
Exit code: 1
```

**Exit Codes:**
- `0`: Success
- `1`: Error (any type)
- No specific exit codes for different error types

**Error Message Format:**
- Errors are printed to stderr
- Error messages include context (file name, operation type)
- Stack traces are NOT included (user-friendly messages only)

</details>

### Command Interactions

<details>
<summary><strong>Q15: How do the different CLI commands (sync, restore, clean-backups) interact when used together or in sequence? Are there any dependencies or conflicts?</strong></summary>

A: **Command Interaction & Dependencies:**

**Sync Command:**
- Creates backups (unless `--no-backup`)
- Modifies all `.env*` files
- Adds missing keys with empty values
- No dependencies on other commands

**Restore Command:**
- Requires existing backups in `.env-twin/`
- Restores files from a specific backup timestamp
- Can create pre-restore snapshots for rollback
- Depends on: Sync command (to create backups)

**Clean-Backups Command:**
- Deletes old backups, keeping N most recent
- Does not affect current `.env*` files
- Does not affect restore capability (unless all backups deleted)
- No dependencies on other commands

**Recommended Sequence:**
```bash
# 1. Initial sync (creates backup)
env-twin sync

# 2. Modify files manually
# ... edit .env files ...

# 3. Restore if needed
env-twin restore

# 4. Cleanup old backups
env-twin clean-backups --keep 5
```

**Potential Issues:**
- Running restore without prior sync: Fails (no backups exist)
- Running clean-backups with `--keep 0`: Deletes all backups
- Running sync immediately after restore: Creates new backup of restored state

</details>

### Comparison & Differentiation

<details>
<summary><strong>Q16: How does env-twin differ from other similar tools (e.g., dotenv-vault, env-cmd, dotenv-cli) in terms of features, approach, and use cases?</strong></summary>

A: **env-twin vs. Similar Tools:**

| Feature | env-twin | dotenv-vault | env-cmd | dotenv-cli |
|---------|----------|--------------|---------|-----------|
| **Sync Keys** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Backup/Restore** | ✅ Yes | ✅ Yes (encrypted) | ❌ No | ❌ No |
| **Sanitize Values** | ✅ Yes | ✅ Yes (encrypted) | ❌ No | ❌ No |
| **Multi-file Sync** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Rollback** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **CLI Tool** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Programmatic API** | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |
| **Encryption** | ❌ No | ✅ Yes | ❌ No | ❌ No |
| **Cloud Sync** | ❌ No | ✅ Yes | ❌ No | ❌ No |

**env-twin Use Cases:**
- Synchronizing multiple `.env*` files in a project
- Ensuring all environment variables are defined across files
- Creating and maintaining `.env.example` templates
- Backup and restore of environment configurations
- Local development and testing environments

**When to Use Other Tools:**
- **dotenv-vault**: Need encrypted secrets and cloud synchronization
- **env-cmd**: Need to run commands with environment variables
- **dotenv-cli**: Need simple CLI access to environment variables

</details>

### Backup Management

<details>
<summary><strong>Q17: For the clean-backups command, can users specify backup retention based on age (e.g., older than 30 days) in addition to quantity? What are the available options?</strong></summary>

A: **Backup Retention Options:**

**Currently Supported:**
- `--keep <number>`: Keep N most recent backups (default: 10)
- `--yes`: Skip confirmation prompt

**Example:**
```bash
env-twin clean-backups --keep 5 --yes
```

**NOT Supported:**
- Age-based retention (e.g., "older than 30 days")
- Size-based retention (e.g., "total size > 1GB")
- Custom retention policies
- Selective backup deletion

**Current Behavior:**
- Backups are sorted by creation time (newest first)
- Oldest backups are deleted first
- Only quantity-based retention is available

**Workaround for Age-Based Retention:**
```bash
# Manual cleanup of old backups
find .env-twin -name ".env*" -mtime +30 -delete
```

</details>

### Testing & Quality

<details>
<summary><strong>Q18: What types of tests exist in the project (unit, integration, e2e)? How comprehensive is the test coverage, and what scenarios are tested?</strong></summary>

A: **Test Suite Overview:**

**Test Framework:**
- Bun test runner (native Bun testing)
- Located in: `src/index.test.ts`, `src/modules/timestamp-parser.test.ts`

**Test Types:**

1. **Unit Tests:**
   - Timestamp parsing and validation
   - Timestamp formatting and comparison
   - Timestamp range checking

2. **Integration Tests:**
   - CLI argument parsing
   - File reading and writing
   - Sync operation across multiple files
   - Backup creation and restoration
   - Clean-backups functionality

3. **E2E Tests:**
   - Full sync workflow
   - Full restore workflow
   - Cross-platform file path handling
   - Concurrent operation handling (simulated)

**Test Coverage:**

**Covered Scenarios:**
- ✅ Sync keys across multiple `.env` files
- ✅ Preserve comments and empty lines
- ✅ Handle files with only comments
- ✅ Create backups during sync
- ✅ Restore from backup
- ✅ Clean old backups
- ✅ Handle missing source files
- ✅ Display version information
- ✅ Cross-platform file paths
- ✅ Concurrent restore operations (basic)

**NOT Covered:**
- ❌ Corrupted backup files
- ❌ Permission denied scenarios
- ❌ Disk full scenarios
- ❌ Symbolic links and hard links
- ❌ Very large files (>100MB)
- ❌ Special characters in file paths
- ❌ Windows-specific path handling edge cases

**Running Tests:**
```bash
bun test
```

</details>

### Contribution & Community

<details>
<summary><strong>Q19: What are the guidelines for contributing to the project? Is there a CONTRIBUTING.md or similar documentation?</strong></summary>

A: **Contributing Guidelines:**

**Current Status:**
- **No CONTRIBUTING.md file** exists
- Basic guidelines in README.md

**From README.md:**
```
1. Fork the repository
2. Create your feature branch (git checkout -b feature/amazing-feature)
3. Commit your changes (git commit -m 'Add some amazing feature')
4. Push to the branch (git push origin feature/amazing-feature)
5. Open a Pull Request
```

**Development Setup:**
```bash
# Clone repository
git clone https://github.com/atssj/env-twin.git
cd env-twin

# Install dependencies
bun install

# Build project
bun run build

# Run tests
bun test

# Format code
bun run lint:format
```

**Release Process:**
- Uses Changesets for version management
- Automated publishing to npm via GitHub Actions
- Changelog automatically generated

**Recommended Contribution Areas:**
- Bug fixes
- Test coverage improvements
- Documentation enhancements
- Feature requests (open issue first)
- Performance optimizations

</details>

### System Requirements

<details>
<summary><strong>Q20: What are the complete system requirements and compatibility details (OS, Node.js version, dependencies, etc.) for running env-twin?</strong></summary>

A: **System Requirements:**

**Node.js Version:**
- Minimum: Node.js v14.0.0 or higher
- Recommended: Node.js v18.0.0 or higher
- Tested with: Latest LTS versions

**Operating Systems:**
- ✅ Linux (Ubuntu, Debian, CentOS, etc.)
- ✅ macOS (Intel and Apple Silicon)
- ✅ Windows (PowerShell, CMD, Git Bash)

**Package Managers:**
- ✅ npm (v6+)
- ✅ yarn (v1.22+)
- ✅ pnpm (v7+)
- ✅ bun (v1.0+)

**Installation Methods:**

```bash
# npm
npm install env-twin

# yarn
yarn add env-twin

# pnpm
pnpm add env-twin

# bun
bun add env-twin
```

**Runtime Dependencies:**
- None (zero external dependencies)
- Uses only Node.js built-in modules: `fs`, `path`

**Development Dependencies:**
- TypeScript v5.8.3+
- @types/node v20.11.19+
- @types/bun v1.3.3+
- Prettier v3.5.3+ (for formatting)
- @changesets/cli v2.29.4+ (for releases)

**Disk Space:**
- Minimum: ~5MB for installation
- Backup storage: Depends on `.env` file sizes
- Each backup stores full copy of `.env*` files

**Memory Requirements:**
- Minimum: ~50MB
- Typical: <100MB for most operations
- Large files (>10MB): May require more memory

**File System Requirements:**
- Read/write access to project directory
- Support for hidden directories (`.env-twin/`)
- Support for file permissions (Unix-style)
- Support for timestamps (mtime, atime)

**Network:**
- None required (fully offline tool)

</details>

## Development

### Prerequisites

- Node.js (v14 or higher)
- npm, yarn, pnpm, or bun

### Setup

1. Clone the repository:

```bash
git clone https://github.com/atssj/env-twin.git
cd env-twin
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

### Available Scripts

| Script                  | Description                            |
| ----------------------- | -------------------------------------- |
| `bun changeset`         | Generate a new changeset file          |
| `bun changeset:version` | Update package versions and changelogs |
| `bun changeset:publish` | Publish packages to npm                |
| `npm run build`         | Build the TypeScript project           |
| `npm run test`          | Run tests                              |
| `npm run lint:format`   | Format code using Prettier             |
| `npm start`             | Run the built project                  |

### Running Tests

```bash
bun test
```

## Release Process

This project uses [Changesets](https://github.com/changesets/changesets) to manage releases.

### Generating a Changeset

When you make a change that you want to include in a release, you need to generate a changeset file. This file documents the changes and specifies the type of version bump (major, minor, or patch) for each package.

To generate a new changeset, run the following command:

```bash
bun changeset
```

This will prompt you to select the packages to include in the changeset and the type of version bump for each package. It will also ask for a summary of the changes.

### How it Works

Changeset files are stored in the `.changeset` directory. They are plain text files that describe the changes made in a human-readable format.

When a pull request containing changesets is merged into the `main` branch, the release workflow is triggered. This workflow automatically:

1. Consumes the changeset files.
2. Updates the versions of the packages in `package.json`.
3. Updates the `CHANGELOG.md` file.
4. Commits these changes.
5. Publishes the new versions to npm.

This process ensures that releases are consistent and that changelogs are always up-to-date.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/atssj/env-twin/issues) on GitHub.

## Acknowledgments

- Thanks to all contributors who have helped shape this project
- Inspired by the need for better environment variable management in Node.js projects
