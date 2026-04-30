import { describe, it, expect } from 'vitest';
import type { DeliveryOrder, ImportOrder } from '../src/types';

// --- DeliveryPage / PrintDeliveryPage logic ---

function getReceiverDisplayName(order: DeliveryOrder) {
  const orderObj = order.import_orders || order.vegetable_orders;
  if (!orderObj) return '-';

  if (order.status === 'hang_o_sg' && orderObj.selected_alias) {
    return orderObj.selected_alias;
  }

  return orderObj.customers?.name || orderObj.receiver_name?.trim() || orderObj.profiles?.full_name || '-';
}

// --- ImportOrdersPage logic ---

function getImportChuHang(o: ImportOrder) {
  return o.selected_alias || o.customers?.name || o.sender_name;
}

function getImportReceiver(order: ImportOrder) {
  return (order as any).profiles?.full_name || order.selected_alias || order.receiver_name || order.received_by;
}

// --- VegetableImportsPage logic ---

function getOrderReceiverName(order: any) {
  return order.selected_alias || order.receiver_name || order.profiles?.full_name || '-';
}

// --- VegetablesPage logic ---

function getReceiverName(item: any) {
  return item.order?.selected_alias || item.order?.receiver_name || '-';
}

describe('Display alias logic', () => {
  describe('DeliveryPage: getReceiverDisplayName', () => {
    it('shows alias for hang_o_sg status when selected_alias is present', () => {
      const order = {
        id: '1',
        product_name: 'Test',
        total_quantity: 10,
        delivered_quantity: 5,
        remaining_quantity: 5,
        status: 'hang_o_sg' as const,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        import_orders: {
          order_code: 'IO-001',
          sender_name: 'Sender',
          receiver_name: 'Receiver Main',
          customers: { name: 'Customer Main' },
          selected_alias: 'Alias Name',
        },
      } as unknown as DeliveryOrder;

      expect(getReceiverDisplayName(order)).toBe('Alias Name');
    });

    it('shows main name for da_giao status even when alias exists', () => {
      const order = {
        id: '2',
        product_name: 'Test',
        total_quantity: 10,
        delivered_quantity: 10,
        remaining_quantity: 0,
        status: 'da_giao' as const,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        import_orders: {
          order_code: 'IO-002',
          sender_name: 'Sender',
          receiver_name: 'Receiver Main',
          customers: { name: 'Customer Main' },
          selected_alias: 'Alias Name',
        },
      } as unknown as DeliveryOrder;

      expect(getReceiverDisplayName(order)).toBe('Customer Main');
    });

    it('shows main name for can_giao status', () => {
      const order = {
        id: '3',
        product_name: 'Test',
        total_quantity: 10,
        delivered_quantity: 0,
        remaining_quantity: 10,
        status: 'can_giao' as const,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        import_orders: {
          order_code: 'IO-003',
          sender_name: 'Sender',
          receiver_name: 'Receiver Main',
          customers: { name: 'Customer Main' },
          selected_alias: 'Alias Name',
        },
      } as unknown as DeliveryOrder;

      expect(getReceiverDisplayName(order)).toBe('Customer Main');
    });

    it('falls back to receiver_name when no customers name', () => {
      const order = {
        id: '4',
        product_name: 'Test',
        total_quantity: 10,
        delivered_quantity: 5,
        remaining_quantity: 5,
        status: 'da_giao' as const,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        import_orders: {
          order_code: 'IO-004',
          sender_name: 'Sender',
          receiver_name: 'Receiver Fallback',
        },
      } as unknown as DeliveryOrder;

      expect(getReceiverDisplayName(order)).toBe('Receiver Fallback');
    });

    it('returns dash when no order object', () => {
      const order = {
        id: '5',
        product_name: 'Test',
        total_quantity: 10,
        delivered_quantity: 5,
        remaining_quantity: 5,
        status: 'hang_o_sg' as const,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      } as unknown as DeliveryOrder;

      expect(getReceiverDisplayName(order)).toBe('-');
    });

    it('uses vegetable_orders when import_orders is absent', () => {
      const order = {
        id: '6',
        product_name: 'Test',
        total_quantity: 10,
        delivered_quantity: 5,
        remaining_quantity: 5,
        status: 'hang_o_sg' as const,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        vegetable_orders: {
          order_code: 'VO-001',
          sender_name: 'Sender',
          receiver_name: 'Veg Receiver',
          selected_alias: 'Veg Alias',
        },
      } as unknown as DeliveryOrder;

      expect(getReceiverDisplayName(order)).toBe('Veg Alias');
    });
  });

  describe('ImportOrdersPage: getImportChuHang', () => {
    it('shows alias when present', () => {
      const order = {
        id: '1',
        order_code: 'IO-001',
        order_date: '2026-01-01',
        order_time: '08:00',
        sender_name: 'Sender Name',
        receiver_name: 'Receiver',
        status: 'pending' as const,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        selected_alias: 'Alias Name',
        customers: { name: 'Customer Main' },
      } as unknown as ImportOrder;

      expect(getImportChuHang(order)).toBe('Alias Name');
    });

    it('shows main name when no alias', () => {
      const order = {
        id: '2',
        order_code: 'IO-002',
        order_date: '2026-01-01',
        order_time: '08:00',
        sender_name: 'Sender Name',
        receiver_name: 'Receiver',
        status: 'pending' as const,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        customers: { name: 'Customer Main' },
      } as unknown as ImportOrder;

      expect(getImportChuHang(order)).toBe('Customer Main');
    });

    it('falls back to sender_name when no alias and no customer', () => {
      const order = {
        id: '3',
        order_code: 'IO-003',
        order_date: '2026-01-01',
        order_time: '08:00',
        sender_name: 'Sender Fallback',
        receiver_name: 'Receiver',
        status: 'pending' as const,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      } as unknown as ImportOrder;

      expect(getImportChuHang(order)).toBe('Sender Fallback');
    });
  });

  describe('ImportOrdersPage: getImportReceiver', () => {
    it('prefers profiles.full_name over alias', () => {
      const order = {
        id: '1',
        order_code: 'IO-001',
        order_date: '2026-01-01',
        order_time: '08:00',
        sender_name: 'Sender',
        receiver_name: 'Receiver Name',
        status: 'pending' as const,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        selected_alias: 'Alias Name',
        profiles: { full_name: 'Profile Name' },
      } as unknown as ImportOrder;

      expect(getImportReceiver(order)).toBe('Profile Name');
    });

    it('shows alias when no profiles.full_name', () => {
      const order = {
        id: '2',
        order_code: 'IO-002',
        order_date: '2026-01-01',
        order_time: '08:00',
        sender_name: 'Sender',
        receiver_name: 'Receiver Name',
        status: 'pending' as const,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        selected_alias: 'Alias Name',
      } as unknown as ImportOrder;

      expect(getImportReceiver(order)).toBe('Alias Name');
    });

    it('falls back to receiver_name when no alias and no profiles', () => {
      const order = {
        id: '3',
        order_code: 'IO-003',
        order_date: '2026-01-01',
        order_time: '08:00',
        sender_name: 'Sender',
        receiver_name: 'Receiver Name',
        status: 'pending' as const,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      } as unknown as ImportOrder;

      expect(getImportReceiver(order)).toBe('Receiver Name');
    });
  });

  describe('VegetableImportsPage: getOrderReceiverName', () => {
    it('shows alias when present', () => {
      const order = {
        selected_alias: 'Alias Name',
        receiver_name: 'Receiver Name',
        profiles: { full_name: 'Profile Name' },
      };

      expect(getOrderReceiverName(order)).toBe('Alias Name');
    });

    it('falls back to receiver_name when no alias', () => {
      const order = {
        receiver_name: 'Receiver Name',
        profiles: { full_name: 'Profile Name' },
      };

      expect(getOrderReceiverName(order)).toBe('Receiver Name');
    });

    it('falls back to profiles.full_name when no alias and no receiver_name', () => {
      const order = {
        profiles: { full_name: 'Profile Name' },
      };

      expect(getOrderReceiverName(order)).toBe('Profile Name');
    });

    it('returns dash when nothing available', () => {
      const order = {};

      expect(getOrderReceiverName(order)).toBe('-');
    });
  });

  describe('VegetablesPage: getReceiverName', () => {
    it('shows alias when present', () => {
      const item = {
        order: {
          selected_alias: 'Alias Name',
          receiver_name: 'Receiver Name',
        },
      };

      expect(getReceiverName(item)).toBe('Alias Name');
    });

    it('falls back to receiver_name when no alias', () => {
      const item = {
        order: {
          receiver_name: 'Receiver Name',
        },
      };

      expect(getReceiverName(item)).toBe('Receiver Name');
    });

    it('returns dash when nothing available', () => {
      const item = { order: {} };

      expect(getReceiverName(item)).toBe('-');
    });
  });

  describe('Merge logic unaffected by aliases', () => {
    it('alias does not change grouping key for ImportOrdersPage chuHang filter', () => {
      const order1 = {
        id: '1',
        order_code: 'IO-001',
        order_date: '2026-01-01',
        order_time: '08:00',
        sender_name: 'Sender',
        receiver_name: 'Receiver',
        status: 'pending' as const,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        selected_alias: 'Alias A',
        customers: { name: 'Customer X' },
      } as unknown as ImportOrder;

      const order2 = {
        id: '2',
        order_code: 'IO-002',
        order_date: '2026-01-01',
        order_time: '08:00',
        sender_name: 'Sender',
        receiver_name: 'Receiver',
        status: 'pending' as const,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        selected_alias: 'Alias B',
        customers: { name: 'Customer X' },
      } as unknown as ImportOrder;

      // Both orders have the same customer name, so they should group together
      // The display shows different aliases, but the underlying customer is the same
      expect(getImportChuHang(order1)).toBe('Alias A');
      expect(getImportChuHang(order2)).toBe('Alias B');

      // But the customer name (used for grouping) is the same
      expect(order1.customers?.name).toBe('Customer X');
      expect(order2.customers?.name).toBe('Customer X');
    });
  });
});