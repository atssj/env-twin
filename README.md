# env-twin: Seamlessly Synchronize Your Node.js Environment Configurations

**env-twin** is the ultimate CLI tool to keep your environment variable configurations perfectly synchronized across all `.env*` files in your Node.js projects. Designed to unify environment variable keys, securely sanitize sensitive data in example files, and maintain consistency throughout your development lifecycle, env-twin enhances your workflow with robust features and easy integration.

[![Build and Test](https://github.com/atssj/env-twin/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/atssj/env-twin/actions/workflows/test.yml)

## Why Use env-twin?

- ✅ Automatically sync environment variable keys across multiple `.env*` files (.env, .env.local, .env.development, etc.)
- 🔐 Secure sensitive data by sanitizing values in `.env.example` files
- 🔄 Preserve comments, formatting, and file structure for clean, readable config files
- ⚙️ Customizable input and output paths for flexible configurations
- 💻 Written in TypeScript for strong type safety and maintainability
- 📦 CLI commands for syncing, restoring backups, and cleaning old backups
- 🔄 Smart backup and rollback management to protect your environment files
- 🧹 Cleanup old backups automatically to save disk space
- 🌏 Cross-platform support: works reliably on Windows, macOS, and Linux

## Installation

Install `env-twin` as a development dependency with your favorite package manager:

<details>
<summary>Bun</summary>

```bash
bun add -D env-twin
```

</details>

<details>
<summary>npm</summary>

```bash
npm install --save-dev env-twin
```

</details>

<details>
<summary>yarn</summary>

```bash
yarn add --dev env-twin
```

</details>

<details>
<summary>pnpm</summary>

```bash
pnpm add -D env-twin
```

</details>

## Quick Start & Usage Examples

### Basic Usage

Run env-twin with the default `.env` to `.env.example` sync:

```bash
npx env-twin
```

Or customize source and destination paths:

```bash
npx env-twin --source .env.development --dest .env.dev.example
```

### Available Commands

- **sync** – Synchronize environment variable keys across all `.env*` files with backup
- **restore** – Restore `.env*` files from backups with rollback support
- **clean-backups** – Remove old backups to save disk space

### Example Commands

```bash
npx env-twin sync
npx env-twin restore 20241125-143022 --yes
npx env-twin clean-backups --keep 5
```

_For full command options and detailed usage, see the "Command Line Options" and "Commands" sections below._

## Features & Benefits

- **Automated Key Syncing:** Ensures every `.env*` file has the complete set of environment variables.
- **Sensitive Data Protection:** `.env.example` files contain sanitized placeholder values (`input_<variable_name>`) to avoid leaking secrets.
- **Comment & Formatting Preservation:** Keeps your environment files tidy by preserving comments and formatting.
- **Robust Backup System:** Automatic timestamped backups before modifications make recovery easy and safe.
- **Rollback Support:** Automatic rollbacks in case of failed restore operations prevent data loss.
- **Cross-Platform Compatibility:** Runs smoothly on all major OS including Windows, macOS, and Linux.
- **CI/CD Friendly:** Designed to integrate seamlessly into automated workflows and pipelines.
- **Lightweight & Dependency-Free:** Uses only built-in Node.js modules with zero external dependencies for blazing performance.

## How It Works

1. Reads your source `.env` file with all variable keys and comments.
2. Preserves the original file formatting and comments.
3. Replaces environment variable values with sanitized placeholders in `.env.example`.
4. Synchronizes missing keys across all `.env*` environment files.
5. Creates timestamped backups to safeguard against accidental changes.
6. Offers restore and clean-up commands to manage backups efficiently.

## Frequently Asked Questions

### What happens when conflicting values exist across `.env*` files?

`env-twin` adopts a union approach — it preserves existing values and only adds missing keys with empty values. Conflicting values are maintained as-is with no overwriting or prioritization.

### How does env-twin handle sensitive data?

Only `.env.example` files have values replaced with sanitized placeholders (e.g., `input_db_password`). Actual `.env` files remain untouched during sync operations.

### Can I customize placeholders in `.env.example` files?

No, the placeholder format is fixed and not configurable for consistency.

### Are backups created automatically?

Yes, unless using the `--no-backup` option, backups are automatically created before syncing changes.

### Is env-twin safe for production use?

Absolutely, with backups and rollback features it helps minimize risks. The `--no-backup` flag should be avoided in production environments.

_For more FAQs and detailed command options, see the full README below._

## Development & Contribution

- Written in TypeScript, built with Bun.
- Thorough test coverage (unit, integration, e2e).
- Contribution welcome — fork, branch, commit, push, and open a PR.
- Uses Changesets for automated versioning and releases.

## License & Support

- Licensed under the MIT License.
- For issues or questions, [open an issue on GitHub](https://github.com/atssj/env-twin/issues).

---

## Full Detailed Documentation

Please refer to the original README content provided above for comprehensive command references, examples, and advanced usage.

---

Optimize your Node.js environment configuration management with **env-twin** — the smart, reliable, and secure way to handle `.env` files.
