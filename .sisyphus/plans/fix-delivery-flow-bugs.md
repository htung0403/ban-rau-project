## Plan: Fix Delivery Flow Logic Bugs

**Goal**: Fix logic bugs in the vehicle assignment flow where duplicate payment collections are created and vehicle un-assignment fails to persist.
**Scope**: `server/src/modules/delivery/delivery.service.ts`

### Issue 1: Duplicate Payment Collections
**Bug**: When an assignment is edited (e.g. quantity changed), the backend deletes and re-inserts `delivery_vehicles`, and then inserts new `payment_collections`. It never deletes the old `draft` payment collections, resulting in duplicates.
**Fix**: Before inserting new `payment_collections`, delete existing `payment_collections` for the target `delivery_order_id` that have `status = 'draft'`.

### Issue 2: Failing to Un-assign Vehicles
**Bug**: When a vehicle is removed from the assignment list in the frontend, it is omitted from the payload. The backend uses `const vIds = assignments.map(a => a.vehicle_id)` and only deletes `delivery_vehicles` matching those `vIds`. The removed vehicle is omitted from `vIds` and thus remains in the database.
**Fix**: Delete ALL `delivery_vehicles` for this `deliveryId` before re-inserting, because the frontend sends the full comprehensive list of assignments (including disabled/paid ones). Alternatively, fetch existing `vehicle_id`s from `delivery_vehicles` for this `deliveryId`, compute the union of existing and new `vIds`, and delete all of them.

### Implementation Steps
1. **Update `delivery.service.ts` - `assignVehicles` method**:
   - Fetch existing `delivery_vehicles` for the `deliveryId` to get `existingVids`.
   - Combine `existingVids` with payload `vIds` to get `allAffectedVids`.
   - Delete `delivery_vehicles` for `allAffectedVids`.
   - Delete `payment_collections` with status `draft` for `allAffectedVids`.
   - Proceed with insertion of new `delivery_vehicles` and new `draft` `payment_collections`.

## Final Verification Wave
- [ ] Assign a vehicle -> Check 1 delivery_vehicle and 1 payment_collection is created.
- [ ] Edit the assignment (change quantity) -> Check old draft payment_collection is gone, only 1 new payment_collection exists.
- [ ] Remove the assigned vehicle -> Check delivery_vehicles and payment_collections are completely removed.
- [ ] Verify Export Order logic works fine alongside these changes.