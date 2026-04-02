import { supabaseService } from '../../config/supabase';
import { format } from 'date-fns';

export class ImportOrderService {
  static async getAll(filters: any) {
    let query = supabaseService
      .from('import_orders')
      .select('*, profiles(full_name), warehouses(name), customers(id, name, phone, address), import_order_items(*, products(*))')
      .order('created_at', { ascending: false });

    if (filters.date) query = query.eq('order_date', filters.date);
    if (filters.status) query = query.eq('status', filters.status);
    
    // Support filtering by supplier or license plate if needed
    if (filters.supplier_name) query = query.ilike('supplier_name', `%${filters.supplier_name}%`);
    if (filters.license_plate) query = query.ilike('license_plate', `%${filters.license_plate}%`);

    const { data, error } = await query;
    if (error) throw error;
    
    // total_amount is now computed by DB triggers
    return data.map((order: any) => {
      return { ...order, total_order_amount: Number(order.total_amount) || 0 };
    });
  }

  static async getById(id: string) {
    const { data, error } = await supabaseService
      .from('import_orders')
      .select('*, profiles(full_name), warehouses(name), customers(id, name, phone, address), import_order_items(*, products(*))')
      .eq('id', id)
      .single();
    if (error) throw error;
    
    return { ...data, total_order_amount: Number(data.total_amount) || 0 };
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
        order_date: orderDate,
        order_time: mainData.order_time || format(new Date(), 'HH:mm'),
        order_code: orderCode,
        received_by: userId,
        warehouse_id: mainData.warehouse_id,
        status: mainData.status || 'pending',
        notes: mainData.notes,
        license_plate: mainData.license_plate,
        driver_name: mainData.driver_name,
        supplier_name: mainData.supplier_name,
        sheet_number: mainData.sheet_number,
        customer_id: mainData.customer_id
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Create items
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        weight_kg: item.weight_kg,
        package_type: item.package_type,
        payment_status: item.payment_status || 'unpaid',
        import_order_id: (order as any).id,
      }));

      const { error: itemsError, data: insertedItems } = await supabaseService
        .from('import_order_items')
        .insert(itemsToInsert)
        .select('*, products(name)');

      if (itemsError) throw itemsError;

      // Auto-create delivery orders
      if (insertedItems && insertedItems.length > 0) {
        const doInsert = insertedItems.map(item => ({
          import_order_id: (order as any).id,
          product_id: item.product_id,
          product_name: item.products?.name || item.package_type || 'Hàng hóa',
          total_quantity: item.quantity || 1,
          unit_price: item.unit_price,
          import_cost: item.unit_price,
          delivery_date: orderDate,
          status: 'pending'
        }));
        const { error: doError } = await supabaseService.from('delivery_orders').insert(doInsert);
        if (doError) console.error("Failed to auto-create delivery orders:", doError);
      }

      // Handle "paid" status directly from form
      const formPaymentStatus = items[0]?.payment_status === 'paid';
      if (formPaymentStatus) {
        const { data: currentOrder } = await supabaseService
          .from('import_orders')
          .select('total_amount')
          .eq('id', (order as any).id)
          .single();
        if (currentOrder && Number(currentOrder.total_amount) > 0) {
          await supabaseService
            .from('import_orders')
            .update({ paid_amount: currentOrder.total_amount })
            .eq('id', (order as any).id);
        }
      }
    }

    return order;
  }

  static async update(id: string, orderData: any) {
    console.log('--- BACKEND UPDATE IMPORT ORDER --- ID:', id, 'DATA:', orderData);
    const { items, ...mainData } = orderData;

    // 1. Update main order
    const { data: order, error: orderError } = await supabaseService
      .from('import_orders')
      .update({
        order_date: mainData.order_date,
        order_time: mainData.order_time,
        warehouse_id: mainData.warehouse_id,
        status: mainData.status,
        notes: mainData.notes,
        license_plate: mainData.license_plate,
        driver_name: mainData.driver_name,
        supplier_name: mainData.supplier_name,
        sheet_number: mainData.sheet_number,
        customer_id: mainData.customer_id
      })
      .eq('id', id)
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Delete old items
    const { error: deleteError } = await supabaseService
      .from('import_order_items')
      .delete()
      .eq('import_order_id', id);
    
    if (deleteError) throw deleteError;

    // 3. Insert new items 
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => {
        return {
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          weight_kg: item.weight_kg,
          package_type: item.package_type,
          payment_status: item.payment_status || 'unpaid',
          import_order_id: id,
        };
      });

      const { error: insertError, data: insertedItems } = await supabaseService
        .from('import_order_items')
        .insert(itemsToInsert)
        .select('*, products(name)');

      if (insertError) throw insertError;

      // Handle delivery_orders sync on update (only for pending without vehicles)
      const { data: existingDO } = await supabaseService
        .from('delivery_orders')
        .select('id, delivery_vehicles(id)')
        .eq('import_order_id', id);

      const deletableIds = existingDO?.filter(d => !d.delivery_vehicles || d.delivery_vehicles.length === 0).map(d => d.id) || [];
      
      if (deletableIds.length > 0) {
        await supabaseService.from('delivery_orders').delete().in('id', deletableIds);
      }

      // Re-create delivery orders for deletable or new ones
      if (insertedItems && insertedItems.length > 0) {
        const newDoInsert = insertedItems.map(item => ({
          import_order_id: id,
          product_id: item.product_id,
          product_name: item.products?.name || item.package_type || 'Hàng hóa',
          total_quantity: item.quantity || 1,
          unit_price: item.unit_price,
          import_cost: item.unit_price,
          delivery_date: mainData.order_date || format(new Date(), 'yyyy-MM-dd'),
          status: 'pending'
        }));
        const { error: doError } = await supabaseService.from('delivery_orders').insert(newDoInsert);
        if (doError) console.error("Failed to sync delivery orders on update:", doError);
      }

      // Handle "paid" status directly from form
      const formPaymentStatus = items[0]?.payment_status === 'paid';
      if (formPaymentStatus) {
        const { data: currentOrder } = await supabaseService
          .from('import_orders')
          .select('total_amount')
          .eq('id', id)
          .single();
        if (currentOrder && Number(currentOrder.total_amount) > 0) {
          await supabaseService
            .from('import_orders')
            .update({ paid_amount: currentOrder.total_amount })
            .eq('id', id);
        }
      }
    }

    return order;
  }

  static async delete(id: string) {
    // Delete order (cascade will delete items)
    const { error } = await supabaseService.from('import_orders').delete().eq('id', id);
    if (error) throw error;
  }
}
