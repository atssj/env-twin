# Release Notes - env-twin v1.1.0

**Release Date:** February 16, 2026

## Overview

Version 1.1.0 of env-twin brings significant enhancements focused on security, data integrity, and user experience. This release introduces an interactive sync workflow, robust security measures, and improved backup management—all while maintaining zero external runtime dependencies.

---

## What's New

### Interactive & Safe Sync Workflow

- **Zero Dependencies**: The sync workflow is built entirely with Node.js built-in modules
- **Interactive Mode**: Users can now review changes before they're applied
- **Safety First**: Automatic backups are created before any modifications

### Gitignore Management Module

- Dedicated module for managing `.gitignore` entries
- Seamlessly integrated with backup flow
- Prevents accidental commits of sensitive files

### Enhanced Restore Capabilities

- **Auto-selection**: Smart backup selection when multiple backups exist
- **Rollback Support**: Automatic rollback on failed restore operations
- **Timestamp Validation**: Uses file modification times (mtime) for accurate restore points

### Atomic File Operations

- **Data Integrity**: File writes are now atomic, preventing corruption during write operations
- **Permission Preservation**: Original file permissions are maintained during atomic writes

---

## Security Enhancements

This release includes multiple security improvements:

- **Path Traversal Protection**: Prevents attackers from accessing files outside the intended directory
- **Symlink Attack Prevention**: Validates file types to prevent symlink-based attacks
- **Secure Permissions**:
  - Backup files use restricted permissions (0o600)
  - Restored sensitive files maintain secure permissions
  - Rollback files are protected with appropriate access controls

---

## Improvements

- **CLI Enhancements**:

  - Changed verbose flag from `-v` to `-V` to avoid conflict with version flag
  - Improved positional argument validation
  - Better error messages and user feedback

- **Documentation**:

  - Completely revamped README with comprehensive FAQ
  - Clear usage examples and command references
  - Better explanations of security features

- **Code Quality**:
  - Improved formatting and code style consistency
  - Better TypeScript type safety
  - Comprehensive test coverage

---

## Breaking Changes

None. This release is fully backward compatible with v1.0.x.

---

## Migration Guide

No migration steps required. Upgrade directly:

```bash
npm install --save-dev env-twin@latest
# or
yarn add --dev env-twin@latest
# or
pnpm add -D env-twin@latest
# or
bun add -D env-twin@latest
```

---

## Full Changelog

For a complete list of changes, see [CHANGELOG.md](./CHANGELOG.md).

---

## Contributors

Thank you to everyone who contributed to this release!

---

## Support

- **Issues**: [github.com/atssj/env-twin/issues](https://github.com/atssj/env-twin/issues)
- **Documentation**: [github.com/atssj/env-twin#readme](https://github.com/atssj/env-twin#readme)
- **License**: MIT
