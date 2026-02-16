# env-twin

## 1.1.0

### Minor Changes

- ### Minor Changes

  - **feat:** Implement interactive and safe sync workflow (zero dependencies)
  - **feat:** Introduce dedicated gitignore management module integrated with backup flow
  - **feat:** Add secure permission handling for restored sensitive files

  ### Patch Changes

  - **fix(security):** Prevent path traversal in file restoration and rollback
  - **fix(security):** Prevent symlink attacks in file restoration
  - **fix(security):** Preserve file permissions in atomic writes
  - **fix(rollback):** Persist and check mtime in snapshots for accurate rollback

## 1.0.3

### Patch Changes

- 915ddf9: add version information test and simplify version lookup

## 1.0.2

### Patch Changes

- 9525538: Implement changeset
