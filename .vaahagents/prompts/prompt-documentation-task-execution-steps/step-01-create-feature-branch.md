---
step: 1
title: Create Feature Branch
phase: Orientation
---

# Step 1: Create Feature Branch

Create the docs feature branch from `develop` using the Gitflow convention:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/{{TASK_ID}}-<short-kebab-description>
```

**Branch name pattern:** `feature/M5.1-T{n}-<short-description>` — e.g., `feature/M5.1-T4-landing-page`.

Return the branch name created.

**Gate:** IF `git status` on `develop` is dirty, THEN stop and warn the user — never branch from a dirty tree.