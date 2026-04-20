# Learnings - Dark Mode Fix

- Added missing CSS variables (`--input`, `--popover`, `--popover-foreground`) to `:root` and `.dark` in `client/src/index.css`.
- Mapped these variables in the `@theme` block for Tailwind v4 support.
- Added a `.dark .soft-overlay` override to ensure proper contrast in dark mode.
- The project uses Tailwind v4 style imports and theme configuration.
## UI Primitives Semantic Token Update
- Updated \popover.tsx\ and \command.tsx\ to use \g-popover\ instead of \g-white\.
- Updated \MultiSearchableSelect.tsx\ to use \g-card\ for the trigger and \g-popover\ for the inline content.
- Verified that \CreatableSearchableSelect.tsx\ and \SearchableSelect.tsx\ already use semantic tokens like \g-muted/10\ and \order-border\.
- No \	ext-slate-*\ or \order-slate-*\ colors were found in these specific files, suggesting they were either already updated or didn't use them.

- Updated shared UI components to use semantic tokens for better dark mode support.
- Replaced hardcoded slate colors (bg-slate-50, text-slate-400, etc.) with semantic equivalents (bg-muted, text-muted-foreground).
- Mapped bg-white to bg-card for main containers and bg-popover for floating elements.
- Verified that semantic tokens like border-border and text-foreground are used consistently across shared components.
