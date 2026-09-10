---
step: 7
title: Audit & Present Plan for Confirmation
phase: Planning
---

# Step 7: Audit & Present Plan for Confirmation

**HARD STOP — DO NOT PROCEED WITHOUT USER APPROVAL.**

**Before presenting, audit the implementation plan against these principles:**

| Principle       | Audit Question                                                |
| --------------- | ------------------------------------------------------------- |
| **DRY**         | Is there duplicated logic that should be extracted?           |
| **KISS**        | Is the solution unnecessarily complex? Can it be simplified?  |
| **YAGNI**       | Are we building anything not required by this task?           |
| **SoC**         | Are concerns properly separated (data, logic, presentation)?  |
| **SRP**         | Does each function/component have exactly one responsibility? |
| **Open/Closed** | Is the design open for extension, closed for modification?    |
| **Composition** | Are we preferring composition over inheritance?               |
| **TDD**         | Are test expectations defined before implementation?          |
| **SOLID**       | Are all 5 SOLID principles respected? No god classes, no tight coupling? |
| **Abstraction** | Are abstractions at the right level? Not too shallow (leaking implementation) or too deep (useless indirection)? Interfaces small and focused? |
| **Traceability** | Does every feature, function, and module trace back to a feature ID (F1, F2, ...) or bug report? Can a reviewer follow the chain from requirement → code → test → commit? |
| **Debuggability** | Are execution flows traceable? Structured logging in place? Error boundaries defined? Can a failure be reproduced from logs alone? |

IF any principle is violated, THEN revise the plan before presenting.

Present to the user:

1. **Progress Report** — A table listing every step from Step 0 to the step before this one, with columns: Step name, Status (✅ Completed / ⏭️ Skipped), and Notes (brief reason if skipped).
2. **Task summary** — what you're building
3. **Implementation plan** — from Step 6 (post-audit)
4. **Principles audit result** — brief summary of what was checked and the outcome
5. **Files to create/modify** — every file listed
6. **Acceptance criteria** — from the feature spec
7. **Risks or open questions** — anything unclear

Ask:

> "Here is my implementation plan for `{{TASK_ID}}`. It has been audited against SOLID, DRY, KISS, YAGNI, TDD, Abstraction, Traceability, and Debuggability principles. Please review and confirm, or suggest changes."

**Wait for explicit user confirmation before proceeding. Do NOT proceed until the user has reviewed and approved the plan.**
