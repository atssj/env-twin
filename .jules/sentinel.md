## 2024-05-22 - Default Permissions for Restored Sensitive Files
**Vulnerability:** Restored .env files were created with default umask permissions (often 644), making them readable by other users on the system if they were new files.
**Learning:** fs.writeFileSync uses default permissions unless mode is explicitly specified. Restoring sensitive files requires explicit secure defaults when the original file stats are missing.
**Prevention:** Explicitly set mode: 0o600 when creating sensitive files (like .env) if no previous file stats exist.
