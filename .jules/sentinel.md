## 2025-02-14 - Path Traversal Prevention in File Operations
**Vulnerability:** Path Traversal (CWE-22) in `FileRestorer` and `RollbackManager`.
**Learning:** Accepting filenames from backup metadata or user input without validation allows writing/reading files outside the working directory using `../` sequences.
**Prevention:** Implement strict path validation using `path.resolve` and `path.relative` to ensure all file operations are contained within the intended root directory.

## 2026-01-20 - Symlink Attack in File Restoration
**Vulnerability:** Arbitrary File Overwrite via Symbolic Links (CWE-59) in `FileRestorer` and `restoreBackup`.
**Learning:** Checking `fs.existsSync` follows symlinks, so it returns true for a symlink pointing to an existing file. Writing to this path overwrites the target file (e.g., `/etc/passwd`) instead of replacing the symlink.
**Prevention:** Use `fs.lstatSync` to check if the target is a symbolic link. If so, unlink it (`fs.unlinkSync`) before writing the restored file to ensure the operation only affects the intended path.

## 2026-02-04 - Insecure Atomic Write (Permission Reset) in Sync
**Vulnerability:** Permission Preservation Failure (CWE-276) in `sync` command.
**Learning:** Atomic writes (write temp + rename) reset file permissions to default (umask) if the temporary file is created without explicitly copying the original file's mode. This exposes sensitive files (e.g., `.env` 0600) to wider access (e.g., 0644).
**Prevention:** When performing atomic writes, always retrieve `fs.statSync(original).mode` and pass it to `fs.writeFileSync(temp, ..., { mode })`. For new sensitive files, default to restricted permissions (0o600).
