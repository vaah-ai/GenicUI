---
step: 1
title: Create Feature Branch
phase: Orientation
---

# Step 1: Create Feature Branch

**Determine the project's branching strategy:**

- **Gitflow** — base branch is `develop`. Feature branches must be created from `develop`, not `main`. This project uses Gitflow.

**Invoke `git` MCP server:**

- Switch to `develop`.
- Pull latest changes to ensure the base branch is up-to-date.
- Create branch: `feature/{{TASK_ID}}-short-description`.
- Verify the branch was created from `develop` and is active.

**Error recovery:** IF the branch already exists, THEN switch to it and confirm it is up-to-date with `develop`. IF git returns an access or permission error, THEN stop and report to the user — do not proceed without version control.
