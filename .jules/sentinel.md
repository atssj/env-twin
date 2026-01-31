## 2025-02-14 - Path Traversal Prevention in File Operations

**Vulnerability:** Path Traversal (CWE-22) in `FileRestorer` and `RollbackManager`.
**Learning:** Accepting filenames from backup metadata or user input without validation allows writing/reading files outside the working directory using `../` sequences.
**Prevention:** Implement strict path validation using `path.resolve` and `path.relative` to ensure all file operations are contained within the intended root directory.

## 2026-01-20 - Symlink Attack in File Restoration

**Vulnerability:** Arbitrary File Overwrite via Symbolic Links (CWE-59) in `FileRestorer` and `restoreBackup`.
**Learning:** Checking `fs.existsSync` follows symlinks, so it returns true for a symlink pointing to an existing file. Writing to this path overwrites the target file (e.g., `/etc/passwd`) instead of replacing the symlink.
**Prevention:** Use `fs.lstatSync` to check if the target is a symbolic link. If so, unlink it (`fs.unlinkSync`) before writing the restored file to ensure the operation only affects the intended path.

## 2026-01-31 - Insecure Atomic Writes
**Vulnerability:** Permission Reset in Atomic Write (CWE-276) in `sync` command.
**Learning:** Using `fs.writeFileSync` followed by `fs.renameSync` (atomic write pattern) resets file permissions to the system default (umask), overriding any restrictive permissions (e.g., 0600) explicitly set by the user on the original file.
**Prevention:** Always capture the `fs.stat` mode of the original file before writing the temporary file, and re-apply it using `fs.chmodSync` on the temporary file before renaming. For new sensitive files, default to secure permissions (0600).
