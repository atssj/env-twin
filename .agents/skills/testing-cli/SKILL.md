# Testing env-twin CLI

## Environment Setup

- **Runtime:** Bun (install via `curl -fsSL https://bun.sh/install | bash`)
- **Install deps:** `bun install`
- **Build:** `bun run build` (runs `tsc`, outputs to `dist/`)
- **Lint/format:** `bun run lint:format` (runs prettier)
- **Run tests:** `bun test` (runs all test files matching `*.test.ts`)
- **Run specific test:** `bun test src/commands/init.test.ts`

## Project Structure

- `src/index.ts` — CLI entrypoint, argument parsing, command dispatch
- `src/commands/` — Individual command implementations (sync, restore, clean-backups, init)
- `src/commands/sync/` — Sync command sub-modules (planner, executor, source-of-truth)
- `src/modules/` — Core logic (sync-logic, backup-discovery, file-restoration, etc.)
- `src/utils/` — Utilities (UI colors/prompts, atomic-fs, backup, gitignore)
- `dist/` — Built output (committed for npm publishing)

## CLI Commands

- `env-twin init` — Create `.env`, `.env.local`, `.env.example` (skips existing files)
- `env-twin sync` — Synchronize keys across all `.env*` files
- `env-twin restore [timestamp]` — Restore from backup
- `env-twin clean-backups` — Remove old backups
- `et` — Alias for `env-twin` (same entrypoint)

## Manual CLI Testing Pattern

To test CLI commands end-to-end without the test framework:

```bash
# Create an isolated temp directory
mkdir -p /tmp/test-env-twin && cd /tmp/test-env-twin

# Run commands directly via bun
bun /path/to/env-twin/src/index.ts init
bun /path/to/env-twin/src/index.ts sync --yes
bun /path/to/env-twin/src/index.ts --help
```

Always use isolated temp directories to avoid polluting the repo. Clean up afterward.

## Test Conventions

- Test files live alongside source: `src/commands/init.test.ts`, `src/index.test.ts`
- Tests use `bun:test` (describe/test/expect)
- Tests create temp directories, run CLI via `execSync`, and verify file contents
- Tests clean up temp dirs in `afterAll`
- The repo uses `@changesets/cli` — new features need a changeset file in `.changeset/`

## CI

- GitHub Actions: `build-and-test`, CodeQL analysis, Devin Review
- All run on push to PR branches

## Devin Secrets Needed

None — this is a local CLI tool with no external service dependencies.
