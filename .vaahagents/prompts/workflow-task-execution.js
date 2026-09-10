export const meta = {
  name: 'genicui-task-execution',
  description: 'Execute GenicUI development tasks through a 16-step multi-agent workflow',
  phases: [
    { title: 'Orientation', detail: 'Load context, create branch, understand scope' },
    { title: 'Planning', detail: 'Research, plan, audit, and present for approval' },
    { title: 'Execution', detail: 'Implement, UAT, write tests' },
    { title: 'Completion', detail: 'Quality audit, memory, docs, commit' },
  ],
}

const STEPS_DIR = '.vaahagents/prompts/prompt-task-execution-steps'

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
  `Follow all instructions for creating the feature branch from develop. ` +
  `Return the branch name created.`,
  { label: 'Step 1: Create Feature Branch' }
)
log('Step 1 complete — feature branch created')

const step2 = await agent(
  `Read and execute \`${STEPS_DIR}/step-02-understand-task-scope.md\`. ` +
  `Follow all instructions for understanding the task scope, reading feature specs, ` +
  `architecture docs, and security docs. Return a concise summary of files to create/modify/delete.`,
  { label: 'Step 2: Understand Task Scope' }
)
log('Step 2 complete — task scope understood')

// ==================== Phase 2: Planning ====================

phase('Planning')

const step3 = await agent(
  `Read and execute \`${STEPS_DIR}/step-03-research-technologies.md\`. ` +
  `Follow all instructions for researching technologies and invoking relevant skills. ` +
  `Return a concise summary of technologies researched and integration patterns identified.`,
  { label: 'Step 3: Research Technologies' }
)
log('Step 3 complete — technologies researched')

const step4 = await agent(
  `Read and execute \`${STEPS_DIR}/step-04-analyze-related-code.md\`. ` +
  `Follow all instructions for analyzing related code in the monorepo. ` +
  `Return a concise summary of existing patterns and conventions observed.`,
  { label: 'Step 4: Analyze Related Code' }
)
log('Step 4 complete — related code analyzed')

const step5 = await agent(
  `Read and execute \`${STEPS_DIR}/step-05-plan-ui-ux-design.md\`. ` +
  `Follow all instructions including invoking UI/UX skills. ` +
  `Return a concise UI/UX design plan.`,
  { label: 'Step 5: Plan UI/UX Design' }
)
log('Step 5 complete — UI/UX planned')

const step6 = await agent(
  `Read and execute \`${STEPS_DIR}/step-06-create-implementation-plan.md\`. ` +
  `Follow all instructions including brainstorming skill, sequential-thinking MCP, ` +
  `and saving the plan to memory. Return the implementation plan.`,
  { label: 'Step 6: Create Implementation Plan' }
)
log('Step 6 complete — implementation plan created')

const step7 = await agent(
  `Read and execute \`${STEPS_DIR}/step-07-audit-present-plan.md\`. ` +
  `Follow all instructions: audit against principles, present to the user, ` +
  `and wait for explicit user confirmation before completing this step. ` +
  `Return the approved plan once the user confirms.`,
  { label: 'Step 7: Audit & Present Plan' }
)
log('Step 7 complete — plan approved by user')

// ==================== Phase 3: Execution ====================

phase('Execution')

const step8 = await agent(
  `Read and execute \`${STEPS_DIR}/step-08-implement-the-task.md\`. ` +
  `Follow all instructions including the layer-ordered implementation sequence ` +
  `and GenicUI constraints. ` +
  `Context from planning: research (${step3}), code analysis (${step4}), ` +
  `UI/UX plan (${step5}), implementation plan (${step6}), audit (${step7}). ` +
  `Return a concise summary of all files created/modified.`,
  { label: 'Step 8: Implement the Task' }
)
log('Step 8 complete — implementation done')

const step9 = await agent(
  `Read and execute \`${STEPS_DIR}/step-09-automated-uat-and-bug-fixes.md\`. ` +
  `Follow all instructions including infrastructure readiness, Playwright UAT sweep, ` +
  `and bug fix loop. Return verification results for each acceptance criterion.`,
  { label: 'Step 9: Automated UAT & Bug Fixes' }
)
log('Step 9 complete — UAT verified')

const step10 = await agent(
  `Read and execute \`${STEPS_DIR}/step-10-write-unit-tests.md\`. ` +
  `Follow all instructions for writing unit and integration tests. ` +
  `Return test count and coverage results.`,
  { label: 'Step 10: Write Unit and Integration Tests' }
)
log('Step 10 complete — unit tests written')

const step11 = await agent(
  `Read and execute \`${STEPS_DIR}/step-11-write-e2e-tests.md\`. ` +
  `Follow all instructions for writing Playwright E2E tests. ` +
  `Return test count and determinism results.`,
  { label: 'Step 11: Write E2E Tests' }
)
log('Step 11 complete — E2E tests written')

// ==================== Phase 4: Completion ====================

phase('Completion')

const step12 = await agent(
  `Read and execute \`${STEPS_DIR}/step-12-code-quality-audit.md\`. ` +
  `Follow all instructions including formatter, linter, typecheck, dead code, ` +
  `complexity check, diff review, and GenicUI-specific quality checks. ` +
  `Return audit results.`,
  { label: 'Step 12: Code Quality Audit' }
)
log('Step 12 complete — quality audit passed')

const step13 = await agent(
  `Read and execute \`${STEPS_DIR}/step-13-update-ai-memory.md\`. ` +
  `Follow all instructions for persisting session knowledge to memory MCP. ` +
  `Return list of memory entries created.`,
  { label: 'Step 13: Update AI Memory' }
)
log('Step 13 complete — memory updated')

const step14 = await agent(
  `Read and execute \`${STEPS_DIR}/step-14-update-project-context.md\`. ` +
  `Follow all instructions for updating project documentation. ` +
  `Return list of docs updated.`,
  { label: 'Step 14: Update Project Context' }
)
log('Step 14 complete — docs updated')

const step15 = await agent(
  `Read and execute \`${STEPS_DIR}/step-15-completion-audit-and-git-commit.md\`. ` +
  `Follow all instructions: completion audit checklist, present to user, ` +
  `wait for acknowledgment, then proceed to git commit. ` +
  `Return the final completion report.`,
  { label: 'Step 15: Completion Audit & Git Commit' }
)
log('Step 15 complete — task committed')

// ==================== Return ====================

return {
  report: {
    steps: [step0, step1, step2, step3, step4, step5, step6, step7,
             step8, step9, step10, step11, step12, step13, step14, step15],
    audit: step15,
    branch: step1,
    implementation: step8,
    tests: { unit: step10, e2e: step11 },
    quality: step12,
  }
}