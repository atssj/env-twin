# Release Notes - env-twin v1.1.1

**Release Date:** February 17, 2026

## Overview

Version 1.1.1 is a patch release that addresses several bugs discovered during stress testing and code review. This release also adds a security policy and improves overall code quality.

---

## Bug Fixes

### JSON Serialization

Fixed an issue where the `--json` flag would produce invalid JSON when the sync report contained Set objects.

```bash
# Now produces valid JSON with arrays instead of Sets
env-twin sync --json
```

### POSIX Compliance

Synced `.env*` files now always end with a trailing newline, following the POSIX standard.

```bash
# Before: Files might not end with newline
# After: Files always end with newline (if not empty)
```

### Export Keyword Support

Added support for bash-style `export` prefix in `.env` files:

```bash
# Now correctly parsed:
export DATABASE_URL=postgres://localhost:5432/db
export MY_VAR=my_value
```

---

## New Additions

### Security Policy

Added `SECURITY.md` with:

- Vulnerability reporting guidelines via GitHub Security Advisories
- Supported versions table
- Response SLA (3 days acknowledgment, 14 days fix for critical issues)
- Built-in security features documentation
- Best practices for users

### Stress Test Suite

Added comprehensive stress testing:

- JSON serialization edge cases
- Export keyword parsing
- Trailing newline handling
- File permission edge cases

---

## Improvements

- Addressed PR review feedback for cleaner code
- Improved handling of empty content edge cases
- Added tests for export prefix and edge case parsing
- Better code comments and documentation

---

## Migration Guide

No migration required. Simply upgrade:

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

## Support

- **Issues**: [github.com/atssj/env-twin/issues](https://github.com/atssj/env-twin/issues)
- **Security**: [Report a vulnerability](https://github.com/atssj/env-twin/security/advisories/new)
- **Documentation**: [github.com/atssj/env-twin#readme](https://github.com/atssj/env-twin#readme)
- **License**: MIT
