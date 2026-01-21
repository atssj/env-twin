## 2025-02-14 - Path Traversal Prevention in File Operations
**Vulnerability:** Path Traversal (CWE-22) in `FileRestorer` and `RollbackManager`.
**Learning:** Accepting filenames from backup metadata or user input without validation allows writing/reading files outside the working directory using `../` sequences.
**Prevention:** Implement strict path validation using `path.resolve` and `path.relative` to ensure all file operations are contained within the intended root directory.

## 2026-01-20 - Symlink Attack in File Restoration
**Vulnerability:** Arbitrary File Overwrite via Symbolic Links (CWE-59) in `FileRestorer` and `restoreBackup`.
**Learning:** Checking `fs.existsSync` follows symlinks, so it returns true for a symlink pointing to an existing file. Writing to this path overwrites the target file (e.g., `/etc/passwd`) instead of replacing the symlink.
**Prevention:** Use `fs.lstatSync` to check if the target is a symbolic link. If so, unlink it (`fs.unlinkSync`) before writing the restored file to ensure the operation only affects the intended path.

## 2026-01-21 - Insecure File Permissions in Atomic Writes
**Vulnerability:** Information Disclosure (CWE-276).
**Learning:** Atomic file writes (write temp + rename) can inadvertently relax file permissions. When `fs.renameSync` replaces an existing file, the new file (temp) retains its own permissions (often default `0o644`), overwriting the stricter permissions (e.g., `0o600`) of the original file.
**Prevention:** Use a wrapper like `writeFileSyncAtomic` that checks the existing file's mode and explicitly sets the temp file's mode to match it *before* renaming. For new sensitive files (like `.env`), default to restricted permissions (`0o600`).
