# Learnings — warehouse-redesign

## [2026-04-27] Session: ses_2347ee05dffeNK0Ch9Zm9I1g7l

### Status Check
- Task 1 (deliveryAgeRule.ts): NOT started — `isOldOrderForAgeRule` still local in DeliveryPage.tsx (lines 176-189)
- Task 2 (warehouse_confirmed_at type): NOT started — field not in index.ts
- Task 3 (server endpoint): NOT started — no confirmWarehouse in delivery.service.ts
- Task 4 (client API + hook): NOT started
- Task 5 (Supabase select *): No-op — already uses SELECT *
- Task 6 (WarehousesPage rewrite): NOT started
- Task 7 (DB column): MANUAL step — user must run SQL in Supabase dashboard

### Key File Locations
- isOldOrderForAgeRule: DeliveryPage.tsx lines 176-189 (local function, not exported)
- getDeliveryRemainingQty: DeliveryPage.tsx lines 159-165
- getEffectiveDeliveryStatus: DeliveryPage.tsx lines 168-174
- DeliveryOrder type: client/src/types/index.ts ~line 298 (confirmed_at near line 299)
- deliveryApi.ts: client/src/api/deliveryApi.ts
- useDelivery.ts: client/src/hooks/queries/useDelivery.ts
- delivery.service.ts: server/src/modules/delivery/delivery.service.ts
- delivery.routes.ts: server/src/modules/delivery/delivery.routes.ts
- WarehousesPage: client/src/pages/warehouse/WarehousesPage.tsx

### Import path correction for deliveryAgeRule.ts
- Types import: `import type { DeliveryOrder, DeliveryStatus } from '../types';` 
  (lib/ is one level below src/, types is at src/types/index.ts)
