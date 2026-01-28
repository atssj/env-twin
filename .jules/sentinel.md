## 2025-02-14 - Path Traversal Prevention in File Operations
**Vulnerability:** Path Traversal (CWE-22) in `FileRestorer` and `RollbackManager`.
**Learning:** Accepting filenames from backup metadata or user input without validation allows writing/reading files outside the working directory using `../` sequences.
**Prevention:** Implement strict path validation using `path.resolve` and `path.relative` to ensure all file operations are contained within the intended root directory.

## 2026-01-20 - Symlink Attack in File Restoration
**Vulnerability:** Arbitrary File Overwrite via Symbolic Links (CWE-59) in `FileRestorer` and `restoreBackup`.
**Learning:** Checking `fs.existsSync` follows symlinks, so it returns true for a symlink pointing to an existing file. Writing to this path overwrites the target file (e.g., `/etc/passwd`) instead of replacing the symlink.
**Prevention:** Use `fs.lstatSync` to check if the target is a symbolic link. If so, unlink it (`fs.unlinkSync`) before writing the restored file to ensure the operation only affects the intended path.

## 2026-01-28 - Insecure File Permissions via Atomic Writes
**Vulnerability:** File Permission Reset (CWE-276) in `src/commands/sync.ts`.
**Learning:** Atomic writes (write temp + rename) replace the target file's metadata with the temp file's. If the temp file is created with default permissions (umask), a previously secure file (0600) becomes insecure (e.g., 0644) after the operation.
**Prevention:** Before creating a temp file, read the target file's mode (if it exists) and explicitly set the temp file's mode to match. For new sensitive files, default to strict permissions (0600).
