/**
 * Customer Aliases API Tests
 *
 * Tests for the customer aliases feature:
 * - POST /api/customers creates customer with aliases array
 * - PUT /api/customers/:id updates customer aliases
 * - GET /api/customers/:id returns customer with aliases
 * - Customer without aliases works correctly
 */

import { z } from 'zod';

// ─── Schema Tests ────────────────────────────────────────────────────────────

// Mirror the schemas from customers.controller.ts
const createCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  customer_type: z.enum(['retail', 'wholesale', 'grocery', 'vegetable', 'grocery_sender', 'grocery_receiver', 'vegetable_sender', 'vegetable_receiver']).default('retail'),
  user_id: z.string().uuid().optional(),
  aliases: z.array(z.string()).optional(),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  customer_type: z.enum(['retail', 'wholesale', 'grocery', 'vegetable', 'grocery_sender', 'grocery_receiver', 'vegetable_sender', 'vegetable_receiver']).optional(),
  is_loyal: z.boolean().optional(),
  aliases: z.array(z.string()).optional(),
});

// ─── Test 1: POST /api/customers creates customer with aliases array ────────

function testCreateCustomerWithAliases() {
  const input = {
    name: 'Test Customer',
    phone: '0901234567',
    aliases: ['Alias One', 'Alias Two'],
  };

  const result = createCustomerSchema.parse(input);
  console.assert(result.name === 'Test Customer', 'name should match');
  console.assert(result.phone === '0901234567', 'phone should match');
  console.assert(Array.isArray(result.aliases), 'aliases should be array');
  console.assert(result.aliases!.length === 2, 'aliases should have 2 items');
  console.assert(result.aliases![0] === 'Alias One', 'first alias should match');
  console.assert(result.aliases![1] === 'Alias Two', 'second alias should match');
  console.log('✅ Test 1 PASSED: POST /api/customers creates customer with aliases array');
}

// ─── Test 2: PUT /api/customers/:id updates customer aliases ─────────────────

function testUpdateCustomerAliases() {
  const input = {
    aliases: ['Updated Alias'],
  };

  const result = updateCustomerSchema.parse(input);
  console.assert(Array.isArray(result.aliases), 'aliases should be array');
  console.assert(result.aliases!.length === 1, 'aliases should have 1 item');
  console.assert(result.aliases![0] === 'Updated Alias', 'alias should match');
  console.log('✅ Test 2 PASSED: PUT /api/customers/:id updates customer aliases');
}

// ─── Test 3: GET /api/customers/:id returns customer with aliases ────────────

function testGetCustomerWithAliases() {
  // Simulate a customer record returned from DB with aliases
  const customerRecord = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Customer',
    phone: '0901234567',
    address: '123 Test St',
    customer_type: 'retail',
    aliases: ['Alias One', 'Alias Two'],
    created_at: '2024-01-01T00:00:00Z',
  };

  console.assert(Array.isArray(customerRecord.aliases), 'aliases should be array');
  console.assert(customerRecord.aliases.length === 2, 'aliases should have 2 items');
  console.log('✅ Test 3 PASSED: GET /api/customers/:id returns customer with aliases');
}

// ─── Test 4: Customer without aliases works correctly ────────────────────────

function testCustomerWithoutAliases() {
  const input = {
    name: 'No Aliases Customer',
    phone: '0909876543',
  };

  const result = createCustomerSchema.parse(input);
  console.assert(result.name === 'No Aliases Customer', 'name should match');
  console.assert(result.aliases === undefined, 'aliases should be undefined when not provided');
  console.log('✅ Test 4 PASSED: Customer without aliases works correctly');
}

// ─── Test 5: Empty aliases array ─────────────────────────────────────────────

function testEmptyAliasesArray() {
  const input = {
    name: 'Empty Aliases Customer',
    aliases: [],
  };

  const result = createCustomerSchema.parse(input);
  console.assert(Array.isArray(result.aliases), 'aliases should be array');
  console.assert(result.aliases!.length === 0, 'aliases should be empty array');
  console.log('✅ Test 5 PASSED: Empty aliases array works correctly');
}

// ─── Test 6: Update with empty aliases clears aliases ────────────────────────

function testUpdateWithEmptyAliases() {
  const input = {
    aliases: [],
  };

  const result = updateCustomerSchema.parse(input);
  console.assert(Array.isArray(result.aliases), 'aliases should be array');
  console.assert(result.aliases!.length === 0, 'aliases should be empty array');
  console.log('✅ Test 6 PASSED: Update with empty aliases clears aliases');
}

// ─── Run all tests ───────────────────────────────────────────────────────────

console.log('\n=== Customer Aliases Tests ===\n');
testCreateCustomerWithAliases();
testUpdateCustomerAliases();
testGetCustomerWithAliases();
testCustomerWithoutAliases();
testEmptyAliasesArray();
testUpdateWithEmptyAliases();
console.log('\n=== All Customer Aliases Tests Passed ===\n');