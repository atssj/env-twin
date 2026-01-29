## 2025-02-14 - Path Traversal Prevention in File Operations
**Vulnerability:** Path Traversal (CWE-22) in `FileRestorer` and `RollbackManager`.
**Learning:** Accepting filenames from backup metadata or user input without validation allows writing/reading files outside the working directory using `../` sequences.
**Prevention:** Implement strict path validation using `path.resolve` and `path.relative` to ensure all file operations are contained within the intended root directory.

## 2026-01-20 - Symlink Attack in File Restoration
**Vulnerability:** Arbitrary File Overwrite via Symbolic Links (CWE-59) in `FileRestorer` and `restoreBackup`.
**Learning:** Checking `fs.existsSync` follows symlinks, so it returns true for a symlink pointing to an existing file. Writing to this path overwrites the target file (e.g., `/etc/passwd`) instead of replacing the symlink.
**Prevention:** Use `fs.lstatSync` to check if the target is a symbolic link. If so, unlink it (`fs.unlinkSync`) before writing the restored file to ensure the operation only affects the intended path.

## 2026-01-29 - Insecure Atomic Writes (Permission Reset)
**Vulnerability:** Permission Reset (CWE-276) during Atomic Write in `sync` command.
**Learning:** `fs.rename` replaces the target file along with its metadata (permissions). If the temporary file is created with default permissions (usually 0o644), replacing a secured file (0o600) exposes it to other users.
**Prevention:** Explicitly read the mode of the target file (if it exists) and apply it to the temporary file (`fs.writeFileSync(..., { mode })`) before renaming.
