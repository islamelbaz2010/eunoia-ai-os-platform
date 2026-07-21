# START_SESSION.md

Complete startup operating procedure for this EPOS-managed repository.

This file is the entry point for every future AI session. Read it first, then execute the steps in order. At the end of the session, close with [`END_SESSION.md`](END_SESSION.md).

## 1. Verify repository standard

Before loading context, confirm the repository follows the EPOS Repository Standard. The following paths must exist:

- `.ai/`
- `.ai/CURRENT/`
- `.ai/BOOTSTRAP/`
- `.ai/EXPORT/`
- `.ai/AUDIT/`
- `.ai/LOGS/`
- `epos/`

If any path is missing, create it immediately and note the gap in the Startup Summary. Do not proceed with work until the standard structure is in place.

## 2. Load every markdown document inside `.ai/CURRENT`

Read every `.md` file in `.ai/CURRENT/` (recursively if needed).

## 3. Treat `MASTER_PROJECT_MEMORY.md` and `SPRINT_MEMORY.md` as canonical history

If `.ai/CURRENT/MASTER_PROJECT_MEMORY.md` exists, load it first. It is the canonical project history.

If `.ai/CURRENT/SPRINT_MEMORY.md` exists, load it second. It is the canonical sprint history.

These files take precedence over other CURRENT documents if any conflict appears. Surface conflicts in the Startup Summary; do not silently merge.

## 4. Load every remaining CURRENT document

After the canonical history files, load all other `.md` files in `.ai/CURRENT/`.

## 5. Load `.ai/EXPORT/AI_READY` if available

If `.ai/EXPORT/AI_READY/` exists, load its contents (for example a `SOURCE_INDEX.md` or context bundle). If `AI_READY` is absent, note it and continue.

## 6. Activate EPOS Runtime

Enter EPOS Runtime mode:

- Respect the EPOS Repository Standard and project lifecycle.
- Maintain single source of truth.
- Treat canonical records as read-only and append-only; never edit or overwrite history.
- Update only working files until the user instructs you to execute.
- Do not modify application source code or business logic without explicit user instruction.

## 7. Understand repository

Build a concise mental model:

- What this repository is and what it builds.
- Its current phase, active sprint, and next action.
- Open blockers, risks, and decisions that bound the work.
- Recent session records and audit reports.
- Any `epos/` runtime notes or registry pointers.

## 8. Produce Startup Summary

Write a short Startup Summary that includes:

- Repository path and name.
- Confirmation that the EPOS Repository Standard is verified (or gaps found).
- Which canonical memory files were loaded.
- Which AI_READY export, if any, was loaded.
- Current project phase, active sprint, and open blockers.
- Any conflicts or warnings.
- Clear statement that you are ready for user instructions.

Place the summary in `.ai/LOGS/` as `startup-YYYY-MM-DD.md` or append it to the existing log file.

## 9. Stop and wait for user instructions

Do not execute any task, create files, or modify code until the user gives explicit instructions. Present the Startup Summary and wait.
