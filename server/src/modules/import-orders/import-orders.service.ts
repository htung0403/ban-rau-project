import { supabaseService } from '../../config/supabase';
import { format } from 'date-fns';

export class ImportOrderService {
  static async getAll(filters: any) {
    const isVegOnly = filters.order_category === 'vegetable';
    const isStandardOnly = filters.order_category === 'standard';
    const fetchBoth = !isVegOnly && !isStandardOnly;

    const buildQuery = (tName: string, iName: string) => {
      let q = supabaseService
        .from(tName)
        .select(`*, profiles(full_name), warehouses(name), customers(id, name, phone, address), ${iName}(*, products(*)), delivery_orders(*, delivery_vehicles(*, vehicles(license_plate)))`);

      q = q.is('deleted_at', null);
      
      if (filters.dateFrom) q = q.gte('order_date', filters.dateFrom);
      if (filters.dateTo) q = q.lte('order_date', filters.dateTo);
      if (filters.status) {
        if (filters.status.includes(',')) {
          q = q.in('status', filters.status.split(','));
        } else {
          q = q.eq('status', filters.status);
        }
      }
      if (filters.supplier_name) q = q.ilike('supplier_name', `%${filters.supplier_name}%`);
      if (filters.license_plate) q = q.ilike('license_plate', `%${filters.license_plate}%`);
      return q;
    };

    let allData: any[] = [];
    
    if (fetchBoth || isStandardOnly) {
      const { data, error } = await buildQuery('import_orders', 'import_order_items');
      if (error) throw error;
      if (data) allData = allData.concat(data.map((d: any) => ({ ...d, order_category: 'standard' })));
    }
    
    if (fetchBoth || isVegOnly) {
      const { data, error } = await buildQuery('vegetable_orders', 'vegetable_order_items');
      if (error) throw error;
      if (data) {
        allData = allData.concat(data.map((d: any) => {
           const mapped = { ...d, order_category: 'vegetable' };
           if (mapped.vegetable_order_items) {
             mapped.import_order_items = mapped.vegetable_order_items;
             delete mapped.vegetable_order_items;
           }
           return mapped;
        }));
      }
    }

    // Sort by created_at desc
    allData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Compute total_order_amount
    return allData.map((order: any) => {
      return { ...order, total_order_amount: Number(order.total_amount) || 0 };
    });
  }

  static async getById(id: string) {
    let { data, error } = await supabaseService
      .from('import_orders')
      .select('*, profiles(full_name), warehouses(name), customers(id, name, phone, address), import_order_items(*, products(*)), delivery_orders(*, delivery_vehicles(*, vehicles(license_plate)))')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    let isVeg = false;
    if (!data) {
      // Try vegetable_orders
      const veg = await supabaseService
        .from('vegetable_orders')
        .select('*, profiles(full_name), warehouses(name), customers(id, name, phone, address), vegetable_order_items(*, products(*)), delivery_orders(*, delivery_vehicles(*, vehicles(license_plate)))')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle();
      data = veg.data;
      error = veg.error;
      isVeg = true;
    }

    if (error) throw error;
    if (!data) throw new Error('Order not found');
    
    const mappedOrder = { ...data, order_category: isVeg ? 'vegetable' : 'standard', total_order_amount: Number(data.total_amount) || 0 };
    if (isVeg && mappedOrder.vegetable_order_items) {
      mappedOrder.import_order_items = mappedOrder.vegetable_order_items;
      delete mappedOrder.vegetable_order_items;
    }
    return mappedOrder;
  }

  static async generateOrderCode(date: string, isVeg: boolean) {
    const tName = isVeg ? 'vegetable_orders' : 'import_orders';
    const { count, error } = await supabaseService
      .from(tName)
      .select('*', { count: 'exact', head: true })
      .eq('order_date', date);

    if (error) throw error;

    const sequence = (count || 0) + 1;
    const dateStr = date.replace(/-/g, '');
    const seqStr = sequence.toString().padStart(3, '0');

    return `${dateStr}-${seqStr}`;
  }

  static async create(orderData: any, userId: string) {
    const { items, order_category, ...mainData } = orderData;
    const isVeg = order_category === 'vegetable';
    const tName = isVeg ? 'vegetable_orders' : 'import_orders';
    const iName = isVeg ? 'vegetable_order_items' : 'import_order_items';
    const fkName = isVeg ? 'vegetable_order_id' : 'import_order_id';

    const orderDate = mainData.order_date || format(new Date(), 'yyyy-MM-dd');
    const orderCode = await this.generateOrderCode(orderDate, isVeg);

    // 1. Create order
    const { data: order, error: orderError } = await supabaseService
      .from(tName)
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
        sender_name: mainData.sender_name,
        receiver_name: mainData.receiver_name,
        sheet_number: mainData.sheet_number,
        customer_id: mainData.customer_id,
        is_custom_amount: mainData.is_custom_amount || false,
        total_amount: mainData.total_amount,
        receipt_image_url: mainData.receipt_image_url,
        payment_status: mainData.payment_status || 'unpaid',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Create items
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        weight_kg: item.weight_kg,
        package_type: item.package_type,
        item_note: item.item_note,
        package_quantity: item.package_quantity,
        image_url: item.image_url,
        payment_status: item.payment_status || 'unpaid',
        [fkName]: (order as any).id,
      }));

      const { error: itemsError, data: insertedItems } = await supabaseService
        .from(iName)
        .insert(itemsToInsert)
        .select('*, products(name)');

      if (itemsError) throw itemsError;

      // Auto-create delivery orders
      if (insertedItems && insertedItems.length > 0) {
        const doInsert = insertedItems.map(item => ({
          [fkName]: (order as any).id,
          product_id: item.product_id,
          product_name: item.products?.name || item.package_type || 'Hàng hóa',
          total_quantity: item.quantity || 1,
          order_category: order_category || 'standard',
          delivery_date: orderDate,
          status: 'hang_o_sg'
        }));
        const { error: doError } = await supabaseService.from('delivery_orders').insert(doInsert);
        if (doError) console.error("Failed to auto-create delivery orders:", doError);
      }

    }

    return order;
  }

  static async update(id: string, orderData: any) {
    console.log('--- BACKEND UPDATE ORDER --- ID:', id, 'DATA:', orderData);
    const { items, order_category, ...mainData } = orderData;
    const isVeg = order_category === 'vegetable';
    const tName = isVeg ? 'vegetable_orders' : 'import_orders';
    const iName = isVeg ? 'vegetable_order_items' : 'import_order_items';
    const fkName = isVeg ? 'vegetable_order_id' : 'import_order_id';

    // 1. Update main order
    const { data: order, error: orderError } = await supabaseService
      .from(tName)
      .update({
        order_date: mainData.order_date,
        order_time: mainData.order_time,
        warehouse_id: mainData.warehouse_id,
        status: mainData.status,
        notes: mainData.notes,
        license_plate: mainData.license_plate,
        driver_name: mainData.driver_name,
        supplier_name: mainData.supplier_name,
        sender_name: mainData.sender_name,
        receiver_name: mainData.receiver_name,
        sheet_number: mainData.sheet_number,
        customer_id: mainData.customer_id,
        is_custom_amount: mainData.is_custom_amount || false,
        total_amount: mainData.total_amount,
        receipt_image_url: mainData.receipt_image_url,
        payment_status: mainData.payment_status || 'unpaid',
      })
      .eq('id', id)
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Delete old items
    const { error: deleteError } = await supabaseService
      .from(iName)
      .delete()
      .eq(fkName, id);
    
    if (deleteError) throw deleteError;

    // 3. Insert new items 
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => {
        return {
          product_id: item.product_id,
          quantity: item.quantity,
          weight_kg: item.weight_kg,
          package_type: item.package_type,
          item_note: item.item_note,
          package_quantity: item.package_quantity,
          image_url: item.image_url,
          payment_status: item.payment_status || 'unpaid',
          [fkName]: id,
        };
      });

      const { error: insertError, data: insertedItems } = await supabaseService
        .from(iName)
        .insert(itemsToInsert)
        .select('*, products(name)');

      if (insertError) throw insertError;

      // Handle delivery_orders sync on update (only for pending without vehicles)
      const { data: existingDO } = await supabaseService
        .from('delivery_orders')
        .select('id, delivery_vehicles(id)')
        .eq(fkName, id);

      const deletableIds = existingDO?.filter(d => !d.delivery_vehicles || d.delivery_vehicles.length === 0).map(d => d.id) || [];
      
      if (deletableIds.length > 0) {
        await supabaseService.from('delivery_orders').delete().in('id', deletableIds);
      }

      // Re-create delivery orders for deletable or new ones
      if (insertedItems && insertedItems.length > 0) {
        const newDoInsert = insertedItems.map(item => ({
          [fkName]: id,
          product_id: item.product_id,
          product_name: item.products?.name || item.package_type || 'Hàng hóa',
          total_quantity: item.quantity || 1,
          order_category: order_category || 'standard',
          delivery_date: mainData.order_date || format(new Date(), 'yyyy-MM-dd'),
          status: 'hang_o_sg'
        }));
        const { error: doError } = await supabaseService.from('delivery_orders').insert(newDoInsert);
        if (doError) console.error("Failed to sync delivery orders on update:", doError);
      }

    }

    return order;
  }

  static async delete(id: string) {
    const deletedAt = new Date().toISOString();

    const { data: importOrder, error: importErr } = await supabaseService
      .from('import_orders')
      .update({ deleted_at: deletedAt })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (importErr) throw importErr;
    if (importOrder) return;

    const { data: vegetableOrder, error: vegErr } = await supabaseService
      .from('vegetable_orders')
      .update({ deleted_at: deletedAt })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (vegErr) throw vegErr;
    if (!vegetableOrder) throw new Error('Order not found or already deleted');
  }
}
