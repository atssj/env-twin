## 2025-02-14 - Path Traversal Prevention in File Operations
**Vulnerability:** Path Traversal (CWE-22) in `FileRestorer` and `RollbackManager`.
**Learning:** Accepting filenames from backup metadata or user input without validation allows writing/reading files outside the working directory using `../` sequences.
**Prevention:** Implement strict path validation using `path.resolve` and `path.relative` to ensure all file operations are contained within the intended root directory.

## 2026-01-20 - Symlink Attack in File Restoration
**Vulnerability:** Arbitrary File Overwrite via Symbolic Links (CWE-59) in `FileRestorer` and `restoreBackup`.
**Learning:** Checking `fs.existsSync` follows symlinks, so it returns true for a symlink pointing to an existing file. Writing to this path overwrites the target file (e.g., `/etc/passwd`) instead of replacing the symlink.
**Prevention:** Use `fs.lstatSync` to check if the target is a symbolic link. If so, unlink it (`fs.unlinkSync`) before writing the restored file to ensure the operation only affects the intended path.

## 2026-01-30 - Permission Reset in Atomic Writes
**Vulnerability:** Privilege Escalation/Information Disclosure via Permission Reset (CWE-276) in atomic file updates.
**Learning:** Using `fs.writeFileSync` to create a temporary file followed by `fs.renameSync` (atomic write pattern) resets file permissions to default (e.g., `0644`), stripping custom restrictions (e.g., `0600` for `.env`).
**Prevention:** Always read the original file's mode (if it exists) and explicitly apply it to the temporary file using `fs.chmodSync` before renaming. For new sensitive files, explicitly enforce restrictive permissions.
