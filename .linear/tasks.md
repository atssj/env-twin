# Tasks: Open PR Resolution

Reference: [plans/open-prs-analysis-and-resolution.md](../plans/open-prs-analysis-and-resolution.md)

---

## Phase 1: Close Duplicate PRs

- [ ] Close PR #26 with comment: "Superseded by #42 which has the most complete fix for CWE-276 permission preservation."
- [ ] Close PR #27 with same comment
- [ ] Close PR #28 with same comment
- [ ] Close PR #29 with same comment
- [ ] Close PR #30 with same comment
- [ ] Close PR #31 with same comment
- [ ] Close PR #32 with same comment
- [ ] Close PR #33 with same comment
- [ ] Close PR #34 with same comment
- [ ] Close PR #35 with same comment
- [ ] Close PR #36 with same comment
- [ ] Close PR #37 with same comment
- [ ] Close PR #38 with same comment
- [ ] Close PR #39 with same comment
- [ ] Close PR #40 with same comment
- [ ] Close PR #41 with same comment

## Phase 2: Verify Path Traversal Fix (PR #23)

- [ ] Compare `src/modules/file-restoration.ts` on main vs PR #23 branch to check if path traversal guards are already present
- [ ] Compare `src/modules/rollback-manager.ts` on main vs PR #23 branch for `isPathSafe()` method
- [ ] Compare `src/utils/backup.ts` on main vs PR #23 branch for symlink and traversal checks
- [ ] Check if `src/modules/file-restoration.security.test.ts` exists on main
- [ ] If all fixes present on main: Close PR #23 as "Already resolved in commit 192fdf0"
- [ ] If partial: Cherry-pick missing security changes from PR #23 into a new branch and open a clean PR

## Phase 3: Merge PR #42 (Permission Preservation)

- [ ] Address CodeRabbit feedback: Move `SENSITIVE_FILE_PATTERN` below the import block in `src/commands/sync.ts`
- [ ] Address CodeRabbit feedback: Mask `stats.mode` with `& 0o777` to strip file-type bits
- [ ] Address CodeRabbit feedback: Add `expect(mode).not.toBe(0o600)` assertion in `tests/permissions.test.ts`
- [ ] Run full test suite (`bun test`) and confirm all tests pass
- [ ] Run build (`bun run build`) and confirm no TypeScript errors
- [ ] Request final review and merge PR #42

## Phase 4: Evaluate Atomic Write Utility (PR #22)

- [ ] Review `src/utils/atomic-fs.ts` from PR #22 for code quality and completeness
- [ ] Determine if extracting `writeAtomic()` as a reusable utility adds value vs inline atomic writes
- [ ] If proceeding: Rebase PR #22 onto main (after PR #42 is merged)
- [ ] Update `writeAtomic()` to incorporate permission preservation logic from PR #42
- [ ] Resolve any merge conflicts in `src/commands/sync.ts` and `src/modules/file-restoration.ts`
- [ ] Run full test suite and verify `tests/atomic-fs.test.ts` passes
- [ ] Merge PR #22 or close if deemed unnecessary

## Phase 5: Post-Merge Verification

- [ ] Run full test suite on main after all merges
- [ ] Run `bun run build` to verify TypeScript compilation
- [ ] Manual smoke test: Create `.env` with `chmod 600`, run `env-twin sync --yes`, verify permissions preserved
- [ ] Manual smoke test: Run `env-twin restore --yes`, verify restored files maintain permissions
- [ ] Verify `.gitignore` includes `.env-twin/` backup directory
- [ ] Consider creating a changeset for the security fixes (for changelog/versioning)
