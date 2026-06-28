# SESSION — Session Lifecycle Protocol

---

## ON EVERY SESSION START

Execute this sequence **before touching any code**:

```bash
# 1. Check TypeScript
npx tsc --noEmit

# 2. Check lint
npm run lint

# 3. Run tests
npm test

# 4. Report to user
echo "Session ready. Tests: X/29. Lint: clean. TypeScript: clean."
```

Then read (if not already loaded):
- `.claude/CURRENT_STATE.md` — What's working, what's broken
- `.claude/ACTIVE_TASKS.md` — What to implement next

Then: **Begin the first unchecked task in ACTIVE_TASKS.md without asking.**

---

## DURING SESSION

**Follow the 10-step implementation protocol for every feature:**

```
STEP 1  Understand feature — what exactly needs to change?
STEP 2  Locate affected files — read them all before touching anything
STEP 3  Understand dependencies — what calls this? what does this call?
STEP 4  Check edge cases — what can go wrong?
STEP 5  Write implementation — working code, no placeholders
STEP 6  Run: npx tsc --noEmit (fix any errors before continuing)
STEP 7  Run: npm run lint (fix any warnings)
STEP 8  Run: npm test (all 29 must pass)
STEP 9  Verify logic — does this actually solve the problem?
STEP 10 Mark task complete in ACTIVE_TASKS.md
```

**After each task**: immediately pick the next one from ACTIVE_TASKS.md.

---

## ON SESSION END

```
1. Update .claude/CURRENT_STATE.md
   - Update "What Is Working" table
   - Update "What Is Missing" table  
   - Update migration status if changed
   - Update scores

2. Update .claude/ACTIVE_TASKS.md
   - Mark completed tasks with [x]
   - Move new discoveries to appropriate priority bucket

3. Append to .claude/CHANGELOG.md
   - Date, session number
   - Tasks completed
   - Files changed
   - Score deltas

4. Output EXECUTION REPORT (from .claude/RULES.md template)
```

---

## THE "CONTINUE" COMMAND

When user says: **Continue / Go / Next / Resume / Keep going / Ship it / What's next**

Execute IMMEDIATELY (no questions):
1. Run boot sequence (tsc + lint + test)
2. Pick first `[ ]` task from `.claude/ACTIVE_TASKS.md` P0 section
3. Implement it
4. Run verification checks
5. Update session files
6. Output execution report

---

## COMMON INTERRUPTION PATTERNS

**"Just do X quickly"** → Do X AND run full checks after. Never skip verification.

**"Can you look at Y?"** → Read Y, report what you find, then continue the active task unless Y is P0.

**"Is Z working?"** → Read the relevant source file. Never guess. Report what the code actually does.

**"What should we work on?"** → The answer is always: top unchecked item in ACTIVE_TASKS.md P0 section.

---

## SESSION CONTEXT LIMIT PROTOCOL

If context is running out:
1. Finish the current implementation
2. Run all verification checks
3. Update `.claude/CURRENT_STATE.md` and `.claude/ACTIVE_TASKS.md`
4. Append to `.claude/CHANGELOG.md`
5. End gracefully — the next session will resume from ACTIVE_TASKS

The Engineering OS ensures continuity across context limits. Never leave code half-done.
