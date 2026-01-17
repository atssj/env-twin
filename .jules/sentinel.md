## 2024-05-22 - Default Permissions for Restored Sensitive Files
**Vulnerability:** Restored .env files were created with default umask permissions (often 644), making them readable by other users on the system if they were new files.
**Learning:** fs.writeFileSync uses default permissions unless mode is explicitly specified. Restoring sensitive files requires explicit secure defaults when the original file stats are missing.
**Prevention:** Explicitly set mode: 0o600 when creating sensitive files (like .env) if no previous file stats exist.
## 2024-05-22 - Enhanced Sensitive File Detection for Permissions
**Vulnerability:** Narrow sensitive file detection (only checking .env prefix) missed files like .env.local or .env.production, leaving them with default insecure permissions on restore.
**Learning:** Use robust regex patterns for file classification instead of simple string prefix checks to ensure all variants of sensitive files are captured.
**Prevention:** Implemented /^\.env(\.|$)/ regex to catch all env variants while excluding .env.example.
## 2024-05-22 - Optimized Sensitive File Detection
**Vulnerability:** Initial implementation of sensitive file detection compiled regex on every call and used inefficient object creation, potentially impacting performance during batch restorations.
**Learning:** Static properties for regex patterns and optimized object literals improve performance and maintainability.
**Prevention:** Moved regex to static class property and optimized write options logic.
