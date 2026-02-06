## 2024-05-22 - Default Permissions for Restored Sensitive Files
**Vulnerability:** Restored .env files were created with default umask permissions (often 644), making them readable by other users on the system if they were new files.
**Learning:** fs.writeFileSync uses default permissions unless mode is explicitly specified. Restoring sensitive files requires explicit secure defaults when the original file stats are missing.
**Prevention:** Explicitly set mode: 0o600 when creating sensitive files (like .env) if no previous file stats exist.
## 2024-05-22 - Enhanced Sensitive File Detection for Permissions
**Vulnerability:** Narrow sensitive file detection (only checking .env prefix) missed files like .env.local or .env.production, leaving them with default insecure permissions on restore.
**Learning:** Use robust regex patterns for file classification instead of simple string prefix checks to ensure all variants of sensitive files are captured.
**Prevention:** Implemented /^\.env(\.|$)/ regex to catch all env variants while excluding .env.example.
## 2024-05-22 - Optimized Sensitive File Detection
**Vulnerability:** Initial implementation of sensitive file detection compiled regex on every call and used inefficient object creation, potentially impacting performance during batch restorations.
**Learning:** Static properties for regex patterns and optimized object literals improve performance and maintainability.
**Prevention:** Moved regex to static class property and optimized write options logic.
## 2024-05-22 - Optimized Sensitive File Detection and Allocation
**Vulnerability:** Initial implementation of sensitive file detection compiled regex on every call and used inefficient object creation, potentially impacting performance during batch restorations.
**Learning:** Static properties for regex patterns and optimized object literals improve performance and maintainability.
**Prevention:** Moved regex to static class property and utilized static constants for write options to avoid redundant object allocation.
## 2024-05-23 - Symlink Attack Prevention in File Restoration
**Vulnerability:** Restore operation followed symlinks in the target directory, allowing an attacker to overwrite arbitrary files by creating a symlink in the working directory pointing to a sensitive file (e.g. /etc/passwd).
**Learning:** Always use `lstat` instead of `stat` when inspecting files that might be replaced, and explicitly check for/remove symlinks before writing to a path.
**Prevention:** Added `lstat` check in `restoreSingleFile` to detect symlinks and `unlink` them before writing restored content.
## 2025-01-18 - Path Traversal Prevention in File Restoration
**Vulnerability:** `FileRestorer.restoreFiles` allowed restoring files to paths outside the working directory if the backup metadata contained malicious filenames (e.g. `../file`).
**Learning:** Relying on the filesystem to sanitize filenames (via `readdir`) is insufficient if the source of filenames (backup metadata) can be tampered with or comes from an untrusted source.
**Prevention:** Added explicit validation in `restoreSingleFile` to reject filenames containing path separators (`/` or `\`) or traversal sequences (`..`).
## 2025-02-14 - Path Traversal Prevention in File Operations
**Vulnerability:** Path Traversal (CWE-22) in `FileRestorer` and `RollbackManager`.
**Learning:** Accepting filenames from backup metadata or user input without validation allows writing/reading files outside the working directory using `../` sequences.
**Prevention:** Implement strict path validation using `path.resolve` and `path.relative` to ensure all file operations are contained within the intended root directory.

## 2026-01-20 - Symlink Attack in File Restoration
**Vulnerability:** Arbitrary File Overwrite via Symbolic Links (CWE-59) in `FileRestorer` and `restoreBackup`.
**Learning:** Checking `fs.existsSync` follows symlinks, so it returns true for a symlink pointing to an existing file. Writing to this path overwrites the target file (e.g., `/etc/passwd`) instead of replacing the symlink.
**Prevention:** Use `fs.lstatSync` to check if the target is a symbolic link. If so, unlink it (`fs.unlinkSync`) before writing the restored file to ensure the operation only affects the intended path.

## 2026-02-06 - Insecure Permissions in Atomic Writes
**Vulnerability:** Incorrect Default Permissions (CWE-276) during atomic file updates.
**Learning:** `fs.rename(temp, target)` preserves the permissions of the *temp* file. When implementing atomic writes (write-temp-and-rename), failing to copy the original file's permissions to the temp file causes the target file to revert to default permissions (e.g., 644), potentially exposing secrets in `.env` files.
**Prevention:** Before creating the temp file, read the existing target file's mode (`fs.statSync().mode`). Apply this mode (or a secure default like `0o600` for new sensitive files) to the temp file using `fs.chmodSync` before renaming.
