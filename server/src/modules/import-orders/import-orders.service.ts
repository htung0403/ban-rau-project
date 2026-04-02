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
        import_order_id: (order as any).id,
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

    try {
      await this.syncDeliveryOrders(order.id, mainData.order_date, items, mainData);
    } catch (e) {
      console.warn('Failed to auto-create delivery orders:', e);
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
        } as any;
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

    try {
      await this.syncDeliveryOrders(order.id, mainData.order_date, items, mainData);
    } catch (e) {
      console.warn('Failed to auto-update delivery orders:', e);
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

  private static async syncDeliveryOrders(orderId: string, orderDate: string, items: any[], mainData: any) {
    const normalizedItems = (items && items.length > 0) ? items : [{ package_type: mainData.package_type, quantity: mainData.quantity }];
    
    // Resolve products
    const productIds = normalizedItems.map((i: any) => i.product_id).filter(Boolean);
    let productsMap = new Map();
    if (productIds.length > 0) {
      const { data: productsData } = await supabaseService.from('products').select('id, name').in('id', productIds);
      if (productsData) {
        productsData.forEach(p => productsMap.set(p.id, p.name));
      }
    }

    const desiredDeliveries = normalizedItems.map((item: any) => {
      let name = item.package_type || 'Kiện';
      if (item.product_id && productsMap.has(item.product_id)) {
         name = productsMap.get(item.product_id);
      }
      let cost = 0;
      if (item.payment_status === 'unpaid') {
        cost = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
      }
      return {
         product_name: name,
         total_quantity: Number(item.quantity) || 0,
         import_cost: cost
      };
    });

    // Fetch existing
    const { data: existingDeliveries } = await supabaseService
      .from('delivery_orders')
      .select('id, product_name')
      .eq('import_order_id', orderId);

    const existingList = existingDeliveries || [];
    const usedIds = new Set();

    for (const desired of desiredDeliveries) {
      let match = existingList.find(e => e.product_name === desired.product_name && !usedIds.has(e.id));
      if (!match) {
        match = existingList.find(e => !usedIds.has(e.id));
      }

      if (match) {
        usedIds.add(match.id);
        await supabaseService.from('delivery_orders')
          .update({
            product_name: desired.product_name,
            total_quantity: desired.total_quantity,
            import_cost: desired.import_cost,
            delivery_date: orderDate || format(new Date(), 'yyyy-MM-dd')
          })
          .eq('id', match.id);
      } else {
        await supabaseService.from('delivery_orders').insert({
          import_order_id: orderId,
          product_name: desired.product_name,
          total_quantity: desired.total_quantity,
          import_cost: desired.import_cost,
          delivery_date: orderDate || format(new Date(), 'yyyy-MM-dd'),
          status: 'pending'
        });
      }
    }

    // Delete unused
    const toDelete = existingList.filter(e => !usedIds.has(e.id)).map(e => e.id);
    if (toDelete.length > 0) {
      await supabaseService.from('delivery_orders').delete().in('id', toDelete);
    }
  }
}

