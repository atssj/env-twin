## 2025-02-14 - Path Traversal Prevention in File Operations
**Vulnerability:** Path Traversal (CWE-22) in `FileRestorer` and `RollbackManager`.
**Learning:** Accepting filenames from backup metadata or user input without validation allows writing/reading files outside the working directory using `../` sequences.
**Prevention:** Implement strict path validation using `path.resolve` and `path.relative` to ensure all file operations are contained within the intended root directory.

## 2026-01-20 - Symlink Attack in File Restoration
**Vulnerability:** Arbitrary File Overwrite via Symbolic Links (CWE-59) in `FileRestorer` and `restoreBackup`.
**Learning:** Checking `fs.existsSync` follows symlinks, so it returns true for a symlink pointing to an existing file. Writing to this path overwrites the target file (e.g., `/etc/passwd`) instead of replacing the symlink.
**Prevention:** Use `fs.lstatSync` to check if the target is a symbolic link. If so, unlink it (`fs.unlinkSync`) before writing the restored file to ensure the operation only affects the intended path.

## 2026-01-22 - Insecure Temporary File Permissions in Sync
**Vulnerability:** Information Exposure (CWE-276) during atomic write in `sync` command.
**Learning:** `fs.writeFileSync` defaults to world-readable permissions (dependent on umask) if `mode` is not specified. When creating temporary files for `.env` updates, this exposes secrets during the brief window before the file is renamed or permission-restricted.
**Prevention:** Explicitly pass `{ mode: 0o600 }` to `fs.writeFileSync` when creating temporary files containing sensitive data.
