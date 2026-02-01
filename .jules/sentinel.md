## 2025-02-14 - Path Traversal Prevention in File Operations
**Vulnerability:** Path Traversal (CWE-22) in `FileRestorer` and `RollbackManager`.
**Learning:** Accepting filenames from backup metadata or user input without validation allows writing/reading files outside the working directory using `../` sequences.
**Prevention:** Implement strict path validation using `path.resolve` and `path.relative` to ensure all file operations are contained within the intended root directory.

## 2026-01-20 - Symlink Attack in File Restoration
**Vulnerability:** Arbitrary File Overwrite via Symbolic Links (CWE-59) in `FileRestorer` and `restoreBackup`.
**Learning:** Checking `fs.existsSync` follows symlinks, so it returns true for a symlink pointing to an existing file. Writing to this path overwrites the target file (e.g., `/etc/passwd`) instead of replacing the symlink.
**Prevention:** Use `fs.lstatSync` to check if the target is a symbolic link. If so, unlink it (`fs.unlinkSync`) before writing the restored file to ensure the operation only affects the intended path.

## 2026-02-01 - Permission Reset on Atomic Writes
**Vulnerability:** Insecure File Permissions (CWE-276) during Atomic Write.
**Learning:** The "Atomic Write" pattern (`write temp` + `rename`) replaces the original file with a new one created with default umask permissions (often 0644). This unintentionally makes sensitive files (previously 0600) readable by others.
**Prevention:** Always `stat` the target file (if it exists) to capture its `mode` before creating the temporary file. Pass this `mode` to `fs.writeFileSync`. For new sensitive files, explicitly enforce restricted permissions (0600).
