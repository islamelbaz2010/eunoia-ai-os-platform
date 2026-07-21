# END_SESSION.md

Shutdown procedure for every EPOS-managed AI session.

Run through this checklist before closing the session. Always preserve history and append only verified information.

## 1. Review the session

- What was requested.
- What was done.
- What was proposed but not confirmed.
- What blockers, risks, or open questions remain.
- Any conflicts with canonical memory.

## 2. Update memory

- Update working memory files in `.ai/CURRENT/`.
- Append new facts, decisions, and lessons to the appropriate canonical records.
- Never overwrite `MASTER_PROJECT_MEMORY.md`, `SPRINT_MEMORY.md`, or any append-only history file. If they exist, append verified deltas or create new canonical files with versioned names.

## 3. Update sprint

- Update `.ai/CURRENT/SPRINT_MEMORY.md` (or the local sprint working file) with completed items, new blockers, and changed scope.
- Record what was finished, what was deferred, and why.

## 4. Update project state

- Update `.ai/CURRENT/PROJECT_STATE.md` (or the local project state working file) to reflect the current phase, status, blockers, and next action.

## 5. Update decision log

- Record any confirmed decisions in the decision log under `epos/` or `.ai/CURRENT/`.
- If a decision is not yet confirmed, propose it in `.ai/AUDIT/` or the local `decisions/` area; do not record it as final.

## 6. Update knowledge base

- Capture patterns, lessons, and reusable insights in the knowledge base under `.ai/CURRENT/` or `epos/`.
- Reference the originating session record.

## 7. Update next sprint

- Produce or refresh `.ai/CURRENT/NEXT_SPRINT.md` (or the local next-sprint working file) with the next executable target.
- Include objective, scope, exclusions, acceptance criteria, risks, dependencies, responsible roles, due date, and status.

## 8. Generate AI_READY if required

- If the user requested an export or the next session would benefit from a prepared context bundle, create `.ai/EXPORT/AI_READY/` contents.
- Include a `SOURCE_INDEX.md` listing the canonical sources and a brief session summary.

## 9. Preserve history

- Append session records to `.ai/LOGS/` or the `epos/` session archive.
- Use timestamped or versioned filenames.
- Never delete, overwrite, or rewrite historical records.

## 10. Append only verified information

- Every new entry must be tagged with the source: session action, user instruction, or confirming principal.
- Do not append speculation, unverified assumptions, or draft proposals as canonical fact.

## 11. Produce Session Summary

- Repository path and name.
- Session date and identifier.
- What was accomplished.
- What remains open.
- Updated files and generated exports.
- Any warnings or blockers for the next session.
- A clear handoff message.

Place the summary in `.ai/LOGS/` as `session-YYYY-MM-DD.md` or append it to the existing log file.

---

After completing this checklist, the session may close. The next session begins with [`START_SESSION.md`](START_SESSION.md).
