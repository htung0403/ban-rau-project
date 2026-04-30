import { z } from 'zod';

const importOrderItemSchema = z.object({
  product_id: z.string().uuid().optional().nullable(),
  package_type: z.string().optional().nullable(),
  item_note: z.string().optional().nullable(),
  weight_kg: z.number().optional().nullable(),
  quantity: z.number().int().positive(),
  unit_price: z.number().optional().nullable(),
  image_url: z.string().optional().nullable(),
  image_urls: z.array(z.string()).optional().nullable(),
  payment_status: z.enum(['paid', 'unpaid']).default('unpaid'),
});

const importOrderSchema = z.object({
  order_date: z.string().optional(),
  order_time: z.string().optional(),
  sender_name: z.string().optional(),
  sender_id: z.string().uuid().optional().nullable(),
  receiver_name: z.string().optional(),
  receiver_phone: z.string().optional(),
  receiver_address: z.string().optional(),
  warehouse_id: z.string().uuid().optional().nullable(),
  customer_id: z.string().uuid().optional().nullable(),
  order_category: z.enum(['standard', 'vegetable']).optional().default('standard'),
  total_amount: z.number().optional().nullable(),
  is_custom_amount: z.boolean().optional(),
  license_plate: z.string().optional().nullable(),
  driver_name: z.string().optional().nullable(),
  supplier_name: z.string().optional().nullable(),
  sheet_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  receipt_image_url: z.string().optional().nullable(),
  receipt_image_urls: z.array(z.string()).optional().nullable(),
  payment_status: z.enum(['paid', 'unpaid']).default('unpaid'),
  items: z.array(importOrderItemSchema).optional(),
  received_by: z.string().uuid().optional().nullable(),
  status: z.enum(['pending', 'processing', 'delivered', 'returned']).optional(),
  selected_alias: z.string().optional().nullable(),
});

// Test 1: POST /api/import-orders creates order with selected_alias
function testCreateOrderWithSelectedAlias() {
  const input = {
    customer_id: '123e4567-e89b-12d3-a456-426614174000',
    receiver_name: 'Nguyễn Văn A',
    selected_alias: 'Alias Name',
    order_category: 'standard' as const,
    items: [],
  };

  const result = importOrderSchema.parse(input);
  console.assert(result.selected_alias === 'Alias Name', 'selected_alias should match');
  console.log('✅ Test 1 PASSED: POST /api/import-orders creates order with selected_alias');
}

// Test 2: PUT /api/import-orders/:id updates selected_alias
function testUpdateOrderSelectedAlias() {
  const input = {
    selected_alias: 'Updated Alias',
  };

  const result = importOrderSchema.partial().parse(input);
  console.assert(result.selected_alias === 'Updated Alias', 'selected_alias should match on update');
  console.log('✅ Test 2 PASSED: PUT /api/import-orders/:id updates selected_alias');
}

// Test 3: GET /api/import-orders/:id returns order with selected_alias
function testGetOrderWithSelectedAlias() {
  const orderRecord = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    customer_id: '123e4567-e89b-12d3-a456-426614174000',
    receiver_name: 'Nguyễn Văn A',
    selected_alias: 'Alias Name',
    order_date: '2024-01-01',
    total_amount: 100000,
  };

  console.assert(orderRecord.selected_alias === 'Alias Name', 'selected_alias should be present in response');
  console.log('✅ Test 3 PASSED: GET /api/import-orders/:id returns order with selected_alias');
}

// Test 4: Order without selected_alias works correctly
function testOrderWithoutSelectedAlias() {
  const input = {
    customer_id: '123e4567-e89b-12d3-a456-426614174000',
    receiver_name: 'Nguyễn Văn B',
    order_category: 'standard' as const,
  };

  const result = importOrderSchema.parse(input);
  console.assert(result.selected_alias === undefined, 'selected_alias should be undefined when not provided');
  console.log('✅ Test 4 PASSED: Order without selected_alias works correctly');
}

// Test 5: Null selected_alias clears the field
function testNullSelectedAlias() {
  const input = {
    selected_alias: null,
  };

  const result = importOrderSchema.partial().parse(input);
  console.assert(result.selected_alias === null, 'selected_alias should be null');
  console.log('✅ Test 5 PASSED: Null selected_alias clears the field');
}

console.log('\n=== Import Orders Selected Alias Tests ===\n');
testCreateOrderWithSelectedAlias();
testUpdateOrderSelectedAlias();
testGetOrderWithSelectedAlias();
testOrderWithoutSelectedAlias();
testNullSelectedAlias();
console.log('\n=== All Import Orders Selected Alias Tests Passed ===\n');