# `.ai/BOOTSTRAP/` README

This directory contains the self-bootstrap instructions for an EPOS-managed repository.

## Contents

- [`START_SESSION.md`](START_SESSION.md) — complete startup operating procedure.
- [`END_SESSION.md`](END_SESSION.md) — complete shutdown operating procedure.

## What is the EPOS Repository Standard?

The EPOS Repository Standard defines the minimum operating environment every project must maintain so that future humans and AI sessions can understand, continue, and govern the project without extra context:

- `.ai/CURRENT/` — working memory and canonical project records.
- `.ai/BOOTSTRAP/` — startup and shutdown procedures (this directory).
- `.ai/EXPORT/` — exported context bundles, including `AI_READY/`.
- `.ai/AUDIT/` — reviews, reports, and compliance evidence.
- `.ai/LOGS/` — session records, runtime traces, and startup/session summaries.
- `epos/` — EPOS runtime workspace: registry pointers, decision log, knowledge base, and session archive.

A repository is self-bootstrapping when these directories exist, contain the required bootstrap documents, and every AI session begins with `START_SESSION.md` and closes with `END_SESSION.md`.

## What is the EPOS Runtime?

The EPOS Runtime is the operating mode an AI enters after bootstrapping:

- Load canonical history first (`MASTER_PROJECT_MEMORY.md`, `SPRINT_MEMORY.md`), then remaining CURRENT documents.
- Load `AI_READY` exports when available.
- Maintain single source of truth and append-only history.
- Update working memory, sprint, project state, decision log, knowledge base, and next sprint at shutdown.
- Preserve all historical records; never overwrite history.
- Modify only the AI operating environment and working files unless explicitly instructed to touch source code or business logic.

## How to use this directory

1. At the start of every AI session, read `START_SESSION.md` and execute its steps.
2. After the Startup Summary is produced, wait for user instructions.
3. At the end of the session, read `END_SESSION.md` and complete its checklist.
4. The next session begins again with `START_SESSION.md`.
