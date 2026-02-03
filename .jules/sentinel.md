## 2025-02-14 - Path Traversal Prevention in File Operations
**Vulnerability:** Path Traversal (CWE-22) in `FileRestorer` and `RollbackManager`.
**Learning:** Accepting filenames from backup metadata or user input without validation allows writing/reading files outside the working directory using `../` sequences.
**Prevention:** Implement strict path validation using `path.resolve` and `path.relative` to ensure all file operations are contained within the intended root directory.

## 2026-01-20 - Symlink Attack in File Restoration
**Vulnerability:** Arbitrary File Overwrite via Symbolic Links (CWE-59) in `FileRestorer` and `restoreBackup`.
**Learning:** Checking `fs.existsSync` follows symlinks, so it returns true for a symlink pointing to an existing file. Writing to this path overwrites the target file (e.g., `/etc/passwd`) instead of replacing the symlink.
**Prevention:** Use `fs.lstatSync` to check if the target is a symbolic link. If so, unlink it (`fs.unlinkSync`) before writing the restored file to ensure the operation only affects the intended path.

## 2026-02-14 - Permission Reset in Atomic Writes
**Vulnerability:** Insecure File Permissions (CWE-276) in `sync` command.
**Learning:** The atomic write pattern (`write temp` -> `rename`) replaces the original file with a new file (the temp file), which has default permissions (usually 0644/0666). This implicitly strips restricted permissions (0600) from sensitive files like `.env` during updates.
**Prevention:** Explicitly capture the original file's mode using `fs.statSync` before writing the temp file, and apply that mode to the temp file using `fs.writeFileSync(..., { mode })` or `fs.chmodSync`. For new sensitive files, default to `0o600`.
