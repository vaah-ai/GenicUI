// GenicUI brand placeholder — full theming lives in M5.1-T4 (Landing page).
// See: .vaahagents/milestones-and-tasks/milestone-05.1-documentation-site/task-M5.1-T1-docus-scaffold.md
//
// Brand color is a placeholder ("indigo") until T4 lands. Never reference
// @nuxt/ui-pro here — Nuxt UI v4 is MIT and ships Pro features in the
// unified open-source package.

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'indigo',
      secondary: 'sky',
      tertiary: 'violet',
      info: 'sky',
      success: 'emerald',
      warning: 'amber',
      error: 'rose'
    }
  },

  site: {
    name: 'GenicUI',
    description: 'Generative agentic UI framework — render custom UI from any AI agent via MCP.'
  }
})