# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-02-17

### Fixed

- **JSON Serialization** - Fixed `--json` output to properly serialize Set objects to arrays
- **POSIX Compliance** - Ensured synced files end with trailing newline for POSIX standard compliance
- **Export Keyword Parsing** - Added support for bash `export KEY=value` syntax in .env files
- **Edge Cases** - Improved handling of empty content and edge cases in sync operations

### Added

- **Security Policy** - Added SECURITY.md with vulnerability reporting guidelines
- **Stress Tests** - Added comprehensive stress test suite with issue reproduction tests

### Improved

- **Code Quality** - Addressed PR review feedback with improved code clarity
- **Test Coverage** - Added tests for export prefix and edge case parsing

## [1.1.0] - 2026-02-16

### Added

- **Interactive Sync Workflow** - Implemented interactive and safe sync workflow with zero dependencies
- **Gitignore Management Module** - Introduced dedicated gitignore management module integrated with backup flow
- **Enhanced Restore Command** - Implemented restore command with auto-selection and rollback support
- **Sync Command** - Added sync command to unify .env\* variable keys across multiple environment files
- **Atomic File Writes** - Implemented atomic file writes for data integrity

### Security

- **Secure Permission Handling** - Added secure permission handling for restored sensitive files
- **Path Traversal Prevention** - Prevented path traversal attacks in file restoration and rollback operations
- **Symlink Attack Prevention** - Prevented symlink attacks in file restoration
- **Permission Preservation** - Preserved file permissions in atomic writes
- **Restricted Permissions** - Restricted permissions for backups and rollback files

### Fixed

- **Rollback Accuracy** - Persisted and check mtime in snapshots for accurate rollback operations

### Improved

- **CLI Improvements** - Changed verbose shorthand from `-v` to `-V` to avoid version collision
- **Argument Validation** - Validated positional arguments based on command in CLI parser
- **Code Quality** - Improved formatting and fixed trailing commas
- **Documentation** - Revamped README for clarity, usage, and features with comprehensive FAQ

## [1.0.3] - 2025-XX-XX

### Changed

- Added version information test and simplified version lookup

## [1.0.2] - 2025-XX-XX

### Changed

- Implemented changeset workflow for automated versioning and releases

## [1.0.1] - 2025-XX-XX

### Added

- Initial release with basic sync functionality
- Backup and restore capabilities
- CLI interface for managing environment variables
