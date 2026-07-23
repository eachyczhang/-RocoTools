---
name: rocotools-context-handoff
description: Start, continue, verify, finish, or transfer RocoTools engineering tasks with durable repository context. Use for every RocoTools coding, review, diagnosis, documentation, risk, release-readiness, machine-switch, session-resume, or handoff task that must rebuild verified context, distinguish deployed/committed/working-tree/planned status, and leave an explicit next-step record.
---

# RocoTools Context Handoff

Use the repository context package to avoid reconstructing the whole project from historical AI memory. Keep conclusions evidence-backed and leave a portable continuation point.

## Start

1. Work from the Git repository root.
2. Read `AGENTS.md` completely.
3. Emit the exact start pointer from `AGENTS.md` as the first user-visible progress update.
4. Read `docs/ai/START_HERE.md` and follow its order.
5. Run `powershell -ExecutionPolicy Bypass -File scripts/verify-context.ps1`, or perform equivalent read-only checks if unavailable.
6. Read only the formal documents and code relevant to the current request.
7. Verify historical claims against current code and Git.
8. Before editing, summarize architecture, terms, status, rules, risks, TODOs, and uncertainties.

## Work

1. Preserve user changes and keep edits scoped.
2. Apply the narrower RocoTools skill for data, admin, deployment, evolution, or text highlighting when applicable.
3. Treat authentication, announcements rendered as HTML, uploads, feedback attachments, backups, deployment, and database publication as high risk.
4. Never perform production deployment, data migration, restore, deletion, credential rotation, or destructive Git operations without explicit authorization.
5. Validate in proportion to risk and record what remains unverified.

## Finish

1. Run relevant checks and inspect `git status --short`.
2. Update `docs/ai/HANDOFF.md` whenever work, decisions, evidence, or next steps changed.
3. Update `docs/ai/STATUS.md` when feature state changed.
4. Update `docs/ai/RISK_REGISTER.md` when risk evidence, state, mitigation, or residual risk changed.
5. Record branch, base commit, changed files, validation, unverified items, blockers, and exact next step.
6. Emit the exact end pointer from `AGENTS.md` in the final response and state which handoff files were updated.

## Transfer Between Machines

1. Do not rely on stash, local `.codex`, untracked files, local databases, or secrets.
2. Commit unfinished work to a feature branch and push it.
3. Record the branch and commit in `docs/ai/HANDOFF.md`.
4. On the target machine, clone or fetch, check out that branch, start Codex from the repository root, and invoke this skill.
5. Sync ignored runtime data through an approved data-sync process, never through Git.

## Status Language

Use only:

- `deployed`: verified in production.
- `committed`: present in Git but deployment is unverified.
- `working-tree`: local and uncommitted.
- `planned`: design or backlog only.
- `deprecated`: intentionally replaced.

Do not infer `deployed` from source code, a changelog, or a build alone.
