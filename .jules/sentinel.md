## 2025-02-14 - Path Traversal Prevention in File Operations
**Vulnerability:** Path Traversal (CWE-22) in `FileRestorer` and `RollbackManager`.
**Learning:** Accepting filenames from backup metadata or user input without validation allows writing/reading files outside the working directory using `../` sequences.
**Prevention:** Implement strict path validation using `path.resolve` and `path.relative` to ensure all file operations are contained within the intended root directory.

## 2026-01-20 - Symlink Attack in File Restoration
**Vulnerability:** Arbitrary File Overwrite via Symbolic Links (CWE-59) in `FileRestorer` and `restoreBackup`.
**Learning:** Checking `fs.existsSync` follows symlinks, so it returns true for a symlink pointing to an existing file. Writing to this path overwrites the target file (e.g., `/etc/passwd`) instead of replacing the symlink.
**Prevention:** Use `fs.lstatSync` to check if the target is a symbolic link. If so, unlink it (`fs.unlinkSync`) before writing the restored file to ensure the operation only affects the intended path.

## 2026-01-26 - Insecure File Permission Reset in Sync Command
**Vulnerability:** Insecure File Permissions (CWE-276) in `runSync` command. The `sync` command reset file permissions of sensitive environment files (like `.env`) to default (e.g., 0644) during atomic updates, potentially exposing secrets to other users.
**Learning:** Atomic file updates (write temp + rename) implicitly replace the target file and destroy its original metadata, including permissions. `fs.writeFileSync` relies on the process umask, which is often insufficient for sensitive files.
**Prevention:** Always read the original file's mode (`fs.statSync`) before updating. Explicitly apply the correct permissions (`fs.chmodSync`) to the temporary file before renaming it to the target path. Enforce restricted permissions (0600) for new sensitive files.
