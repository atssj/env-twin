## 2025-02-14 - Path Traversal Prevention in File Operations

**Vulnerability:** Path Traversal (CWE-22) in `FileRestorer` and `RollbackManager`.
**Learning:** Accepting filenames from backup metadata or user input without validation allows writing/reading files outside the working directory using `../` sequences.
**Prevention:** Implement strict path validation using `path.resolve` and `path.relative` to ensure all file operations are contained within the intended root directory.

## 2026-01-20 - Symlink Attack in File Restoration

**Vulnerability:** Arbitrary File Overwrite via Symbolic Links (CWE-59) in `FileRestorer` and `restoreBackup`.
**Learning:** Checking `fs.existsSync` follows symlinks, so it returns true for a symlink pointing to an existing file. Writing to this path overwrites the target file (e.g., `/etc/passwd`) instead of replacing the symlink.
**Prevention:** Use `fs.lstatSync` to check if the target is a symbolic link. If so, unlink it (`fs.unlinkSync`) before writing the restored file to ensure the operation only affects the intended path.

## 2026-02-02 - Permission Preservation in Atomic Writes

**Vulnerability:** Insecure File Permissions (CWE-276) during "Atomic Write" (write-temp-and-rename).
**Learning:** `fs.writeFileSync` creates files with default permissions (usually `0o666` masked by umask), effectively resetting restrictive permissions (e.g., `0o600`) of the original file when it is replaced by `fs.renameSync`.
**Prevention:** Explicitly retrieve the mode of the existing file using `fs.statSync(path).mode` and pass it to `fs.writeFileSync(tempPath, content, { mode })`. For new sensitive files, default to restrictive permissions (`0o600`).
