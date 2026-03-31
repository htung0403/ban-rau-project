import { supabaseService } from '../../config/supabase';
import { format } from 'date-fns';
import { InventoryService } from '../inventory/inventory.service';

export class ImportOrderService {
  static async getAll(filters: any) {
    let query = supabaseService
      .from('import_orders')
      .select('*, profiles(full_name), warehouses(name), customers(name, phone, address), import_order_items(*, products(*))')
      .order('created_at', { ascending: false });

    if (filters.date) query = query.eq('order_date', filters.date);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.customer_id) query = query.eq('customer_id', filters.customer_id);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async getById(id: string) {
    const { data, error } = await supabaseService
      .from('import_orders')
      .select('*, profiles(full_name), warehouses(name), customers(name, phone, address), import_order_items(*, products(*))')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  static async generateOrderCode(date: string) {
    const { count, error } = await supabaseService
      .from('import_orders')
      .select('*', { count: 'exact', head: true })
      .eq('order_date', date);

    if (error) throw error;

    const sequence = (count || 0) + 1;
    const dateStr = date.replace(/-/g, '');
    const seqStr = sequence.toString().padStart(3, '0');

    return `${dateStr}-${seqStr}`;
  }

  static async create(orderData: any, userId: string) {
    const { items, ...mainData } = orderData;
    const orderDate = mainData.order_date || format(new Date(), 'yyyy-MM-dd');
    const orderCode = await this.generateOrderCode(orderDate);

    // 1. Create order
    const { data: order, error: orderError } = await supabaseService
      .from('import_orders')
      .insert({
        ...mainData,
        order_code: orderCode,
        received_by: userId,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Create items & Adjust Inventory
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        ...item,
        import_order_id: order.id,
      }));

      const { error: itemsError } = await supabaseService
        .from('import_order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Adjust inventory for each product
      for (const item of items) {
        if (item.product_id && mainData.warehouse_id && item.quantity > 0) {
          await InventoryService.adjustStock(mainData.warehouse_id, item.product_id, item.quantity);
        }
      }
    }

    return order;
  }

  static async update(id: string, orderData: any) {
    const { items, ...mainData } = orderData;

    // 1. Get old items to revert inventory
    const { data: oldItems, error: fetchOldError } = await supabaseService
      .from('import_order_items')
      .select('*')
      .eq('import_order_id', id);
    
    if (fetchOldError) throw fetchOldError;

    // Get old warehouse_id
    const { data: oldOrder, error: fetchOldOrderError } = await supabaseService
      .from('import_orders')
      .select('warehouse_id')
      .eq('id', id)
      .single();
    
    if (fetchOldOrderError) throw fetchOldOrderError;

    // 2. Update main order
    const { data: order, error: orderError } = await supabaseService
      .from('import_orders')
      .update(mainData)
      .eq('id', id)
      .select()
      .single();

    if (orderError) throw orderError;

    // 3. Revert old inventory
    if (oldItems && oldItems.length > 0 && oldOrder.warehouse_id) {
      for (const item of oldItems) {
        if (item.product_id && item.quantity > 0) {
          await InventoryService.adjustStock(oldOrder.warehouse_id, item.product_id, -item.quantity);
        }
      }
    }

    // 4. Delete old items
    const { error: deleteError } = await supabaseService
      .from('import_order_items')
      .delete()
      .eq('import_order_id', id);
    
    if (deleteError) throw deleteError;

    // 5. Insert new items & Apply new inventory
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => {
        // Remove nested objects if any
        const { products, ...cleanItem } = item;
        return {
          ...cleanItem,
          import_order_id: id,
        };
      });

      const { error: itemsError } = await supabaseService
        .from('import_order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Adjust inventory for each product
      for (const item of items) {
        if (item.product_id && mainData.warehouse_id && item.quantity > 0) {
          await InventoryService.adjustStock(mainData.warehouse_id, item.product_id, item.quantity);
        }
      }
    }

    return order;
  }

  static async delete(id: string) {
    // 1. Revert inventory before deleting
    const { data: items, error: fetchError } = await supabaseService
      .from('import_order_items')
      .select('*')
      .eq('import_order_id', id);
    
    const { data: order, error: fetchOrderError } = await supabaseService
      .from('import_orders')
      .select('warehouse_id')
      .eq('id', id)
      .single();

    if (!fetchError && !fetchOrderError && items && order.warehouse_id) {
      for (const item of items) {
        if (item.product_id && item.quantity > 0) {
          await InventoryService.adjustStock(order.warehouse_id, item.product_id, -item.quantity);
        }
      }
    }

    // 2. Delete order (cascade will delete items)
    const { error } = await supabaseService.from('import_orders').delete().eq('id', id);
    if (error) throw error;
  }
}

