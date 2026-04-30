import type { Customer, ImportOrder, DeliveryOrder } from '../index';

type AssertExact<T, _U extends T> = T;

// Customer accepts aliases array
const _a: AssertExact<Customer, Customer> = {
  id: '1',
  name: 'Test Customer',
  total_orders: 0,
  total_revenue: 0,
  debt: 0,
  created_at: '2026-01-01',
  aliases: ['Alias A', 'Alias B'],
};

// Customer works without aliases (optional)
const _b: AssertExact<Customer, Customer> = {
  id: '2',
  name: 'No Aliases',
  total_orders: 0,
  total_revenue: 0,
  debt: 0,
  created_at: '2026-01-01',
};

// ImportOrder accepts selected_alias
const _c: AssertExact<ImportOrder, ImportOrder> = {
  id: '1',
  order_code: 'IO-001',
  order_date: '2026-01-01',
  order_time: '08:00',
  sender_name: 'Sender',
  receiver_name: 'Receiver',
  status: 'pending',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  selected_alias: 'Alias A',
};

// ImportOrder works without selected_alias (optional)
const _d: AssertExact<ImportOrder, ImportOrder> = {
  id: '2',
  order_code: 'IO-002',
  order_date: '2026-01-01',
  order_time: '08:00',
  sender_name: 'Sender',
  receiver_name: 'Receiver',
  status: 'pending',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

// ImportOrder nested customers includes aliases
const _e: AssertExact<ImportOrder, ImportOrder> = {
  id: '3',
  order_code: 'IO-003',
  order_date: '2026-01-01',
  order_time: '08:00',
  sender_name: 'Sender',
  receiver_name: 'Receiver',
  status: 'pending',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  customers: { id: '1', name: 'Test', aliases: ['Alias A'] },
};

// DeliveryOrder nested import_orders includes selected_alias
const _f: AssertExact<DeliveryOrder, DeliveryOrder> = {
  id: '1',
  import_order_id: '1',
  product_name: 'Product',
  total_quantity: 10,
  delivered_quantity: 5,
  remaining_quantity: 5,
  status: 'hang_o_sg',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  import_orders: {
    order_code: 'IO-001',
    sender_name: 'Sender',
    receiver_name: 'Receiver',
    selected_alias: 'Alias A',
  },
};

// DeliveryOrder nested vegetable_orders includes selected_alias
const _g: AssertExact<DeliveryOrder, DeliveryOrder> = {
  id: '2',
  vegetable_order_id: '1',
  product_name: 'Vegetable',
  total_quantity: 20,
  delivered_quantity: 10,
  remaining_quantity: 10,
  status: 'can_giao',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  vegetable_orders: {
    order_code: 'VO-001',
    sender_name: 'Sender',
    receiver_name: 'Receiver',
    selected_alias: null,
  },
};

void _a; void _b; void _c; void _d; void _e; void _f; void _g;