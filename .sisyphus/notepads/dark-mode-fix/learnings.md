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
## Dialog Wrappers Semantic Token Update
- Replaced hardcoded background colors \g-[#f8fafc]\ with \g-background\ across ~20 dialog files.
- Replaced \g-white\ with \g-card\ for dialog panels and internal cards.
- Replaced hardcoded slate colors (\	ext-slate-*\, \g-slate-*\, \order-slate-*\) with semantic tokens (\	ext-foreground\, \	ext-muted-foreground\, \g-muted\, \order-border\).
- Verified all changes with \lsp_diagnostics\ and ensured zero errors.
## Kho & Hàng Hóa Module Dark Mode Standardization
- Updated WarehousesPage.tsx, VegetableWarehousePage.tsx, ProductSettingsPage.tsx, and VegetableProductSettingsPage.tsx.
- Replaced g-white with g-card for main panels and cards.
- Replaced 	ext-slate-* with 	ext-foreground or 	ext-muted-foreground.
- Replaced order-slate-* and order-gray-300 with order-border.
- Replaced g-slate-50 with g-muted.
- Replaced g-[#f8fafc] with g-background in inputs and backgrounds.
- Maintained intentional colors like g-red-50, g-orange-100, and g-emerald-50 where they serve specific UI purposes (alerts, status, etc.).

### Đơn hàng & Giao vận Module Dark Mode Updates
- Replaced bg-white with bg-card for main panels.
- Replaced bg-slate-50 with bg-muted for secondary backgrounds.
- Updated STATUS_COLORS and PAYMENT_STATUS_CONFIG to use semantic tokens and translucent backgrounds (e.g., bg-emerald-500/10) for better dark mode compatibility.
- Replaced hardcoded text-slate-* with text-foreground or text-muted-foreground.
- Replaced border-slate-* with border-border.
- Maintained intentional overlays like bg-white/10 on image thumbnails and full-screen viewers.
- Used bg-background for small nested elements that need to contrast with bg-muted containers.
- Updated HR and Accounting pages to use semantic tokens (\g-card\, \g-muted\, \g-background\, \order-border\, \	ext-foreground\, \	ext-muted-foreground\) for dark mode support.
- Replaced hardcoded \g-white\ with \g-card\ for main panels.
- Replaced \g-slate-50\ and similar with \g-muted\ for secondary backgrounds.
- Replaced \g-[#f8fafc]\ with \g-background\ for page/panel backgrounds.
- Verified all changes with \lsp_diagnostics\.

### Delivery Pages Dark Mode Optimization
- Replaced hardcoded text-blue-600, text-orange-600, text-green-600, text-red-600 with dark mode variants (dark:text-blue-500, etc.) in DeliveryPage.tsx and VegetableDeliveryPage.tsx.
- Updated sticky headers to use bg-muted/80 dark:bg-muted/40 backdrop-blur-md for better contrast and consistency.
- Replaced bg-white with bg-card and border-slate-200 with border-border in the bulk action bar.
- Updated mobile card borders to use border-orange-500/30 dark:border-orange-500/20 for cards with remaining quantity.
- Replaced text-slate-* and bg-slate-* with semantic tokens like text-muted-foreground, text-foreground, bg-muted, and bg-border.
- Updated hover states to use bg-primary/5 dark:bg-primary/10 instead of hardcoded bg-blue-50/50.
