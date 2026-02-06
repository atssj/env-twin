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
