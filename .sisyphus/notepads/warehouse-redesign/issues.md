# Issues — warehouse-redesign

## [2026-04-27] Session: ses_2347ee05dffeNK0Ch9Zm9I1g7l

### Route ordering (Task 3)
- CRITICAL: PUT /warehouse-confirm MUST be placed BEFORE `/:id/...` routes
- Place after `router.put('/confirm', ...)` and before `router.put('/:id/assign-vehicle', ...)`

### Import path in deliveryAgeRule.ts
- File is at: client/src/lib/deliveryAgeRule.ts
- Types are at: client/src/types/index.ts
- Correct import: `import type { DeliveryOrder, DeliveryStatus } from '../types';`
- DeliveryPage import: `import { ... } from '../../lib/deliveryAgeRule';`

### Task 7 is manual
- User must run SQL in Supabase dashboard manually
- SQL: ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS warehouse_confirmed_at TIMESTAMPTZ DEFAULT NULL;
- Do NOT block Tasks 1-4 on this — they can proceed independently

### isOldOrderForAgeRule already updated
- Previous session already updated the logic to use 19:00 same day as confirmed_at
- When extracting to deliveryAgeRule.ts, copy the CURRENT version from DeliveryPage.tsx (already has new logic)
