export const meta = {
  name: 'genicui-documentation-task-execution',
  description: 'Execute GenicUI M5.1 documentation-site tasks through a 12-step multi-agent workflow',
  phases: [
    { title: 'Orientation', detail: 'Load context, create branch, understand scope' },
    { title: 'Content Sourcing', detail: 'Source from corpus, verify library syntax, plan IA' },
    { title: 'Authoring', detail: 'Write pages, configure components, SEO, llms' },
    { title: 'Polish & Publish', detail: 'Build, link-check, audit, memory, commit' },
  ],
}

const STEPS_DIR = '.vaahagents/prompts/prompt-documentation-task-execution-steps'

// ==================== Phase 1: Orientation ====================

phase('Orientation')

const step0 = await agent(
  `Read and execute \`${STEPS_DIR}/step-00-load-session-context.md\`. ` +
  `Follow all instructions including memory MCP lookup, TodoWrite initialization, ` +
  `and reading spec files. Return a concise summary of session context loaded and any ` +
  `recovered state from previous sessions.`,
  { label: 'Step 0: Load Session Context' }
)
log('Step 0 complete — session context loaded')

const step1 = await agent(
  `Read and execute \`${STEPS_DIR}/step-01-create-feature-branch.md\`. ` +
  `Follow all instructions for creating the docs feature branch from develop. ` +
  `Return the branch name created.`,
  { label: 'Step 1: Create Feature Branch' }
)
log('Step 1 complete — feature branch created')

const step2 = await agent(
  `Read and execute \`${STEPS_DIR}/step-02-read-task-spec-and-smoke-tests.md\`. ` +
  `Follow all instructions for reading the task spec, acceptance criteria, ` +
  `sub-tasks, and smoke tests. Return a concise summary of ACs and dependencies.`,
  { label: 'Step 2: Read Task Spec + Smoke Tests' }
)
log('Step 2 complete — task spec understood')

// ==================== Phase 2: Content Sourcing ====================

phase('Content Sourcing')

const step3 = await agent(
  `Read and execute \`${STEPS_DIR}/step-03-source-content-from-corpus.md\`. ` +
  `Follow all instructions for sourcing content from the corpus (packages, registries, ` +
  `specs, playground). Return a structured outline of reusable assets per source page.`,
  { label: 'Step 3: Source Content from Corpus' }
)
log('Step 3 complete — content sourced')

const step4 = await agent(
  `Read and execute \`${STEPS_DIR}/step-04-verify-library-syntax-via-context7.md\`. ` +
  `Follow all instructions: invoke context7 MCP for Docus, Nuxt UI v4, Nuxt Content v3, ` +
  `and nuxt-seo. Return a compact cheat-sheet of versions, MDC inventory, and version-skew risks.`,
  { label: 'Step 4: Verify Library Syntax via context7' }
)
log('Step 4 complete — library syntax verified')

const step5 = await agent(
  `Read and execute \`${STEPS_DIR}/step-05-plan-page-outline-and-ia-fit.md\`. ` +
  `Follow all instructions including invoking sequential-thinking MCP when IA is ambiguous, ` +
  `and persisting the plan to memory MCP under "GenicUI — {{TASK_ID}} Documentation Plan". ` +
  `Return the page outline.`,
  { label: 'Step 5: Plan Page Outline + IA Fit' }
)
log('Step 5 complete — page outline planned')

// ==================== Phase 3: Authoring ====================

phase('Authoring')

const step6 = await agent(
  `Read and execute \`${STEPS_DIR}/step-06-author-markdown-and-mdc.md\`. ` +
  `Follow all instructions including invoking nuxt-content, tailwind-css-patterns, ` +
  `and nuxt-ui skills, authoring pages in the prescribed order (index → concepts → ` +
  `guides/API → cookbook → cross-link cleanup), and per-page curl verification. ` +
  `Context from planning: content (${step3}), library syntax (${step4}), outline (${step5}). ` +
  `Return a list of files created with one-line summaries.`,
  { label: 'Step 6: Author Markdown + MDC' }
)
log('Step 6 complete — markdown + MDC authored')

const step7 = await agent(
  `Read and execute \`${STEPS_DIR}/step-07-configure-components-seo-llms.md\`. ` +
  `Follow the task-specific instructions: brand tokens (T4), nav updates, ` +
  `auto-generated API pages (T8), nuxt-seo + llms (T11), Vercel wiring (T12). ` +
  `Return a list of files modified and the nav tree state.`,
  { label: 'Step 7: Configure Components / SEO / llms' }
)
log('Step 7 complete — components / SEO / llms configured')

// ==================== Phase 4: Polish & Publish ====================

phase('Polish & Publish')

const step8 = await agent(
  `Read and execute \`${STEPS_DIR}/step-08-build-and-preview-verification.md\`. ` +
  `Follow the verification ladder (typecheck → lint → dev smoke → prod build → ` +
  `markdown routing → raw routing → sitemap → llms → playwright screenshot). ` +
  `Return a per-AC verification table.`,
  { label: 'Step 8: Build + Preview Verification' }
)
log('Step 8 complete — build + preview verified')

const step9 = await agent(
  `Read and execute \`${STEPS_DIR}/step-09-link-check-and-accessibility-audit.md\`. ` +
  `Follow all instructions: linkinator run, external-link allowlist, ` +
  `Lighthouse via web-perf skill. Return link-check summary + per-page Lighthouse scores.`,
  { label: 'Step 9: Link Check + Accessibility Audit' }
)
log('Step 9 complete — links + accessibility audited')

const step10 = await agent(
  `Read and execute \`${STEPS_DIR}/step-10-update-memory-and-project-context.md\`. ` +
  `Follow all instructions: persist IA decisions, brand placeholders, MDC inventory, ` +
  `and cross-ref patterns to memory MCP. Update reference files in this prompt only ` +
  `when a pattern is provably reusable. Return memory entries + files updated.`,
  { label: 'Step 10: Update Memory + Project Context' }
)
log('Step 10 complete — memory + project context updated')

const step11 = await agent(
  `Read and execute \`${STEPS_DIR}/step-11-completion-audit-and-git-commit.md\`. ` +
  `Follow all instructions: completion audit checklist, present to user, ` +
  `wait for explicit user acknowledgment, then commit (no push). ` +
  `Return the final documentation completion report.`,
  { label: 'Step 11: Completion Audit + Git Commit' }
)
log('Step 11 complete — task committed')

// ==================== Return ====================

return {
  report: {
    steps: [step0, step1, step2, step3, step4, step5, step6, step7,
             step8, step9, step10, step11],
    audit: step11,
    branch: step1,
    authoring: step6,
    build: step8,
    links: step9,
    memory: step10,
  },
}