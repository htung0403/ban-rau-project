import { supabaseService } from '../../config/supabase';
import { format } from 'date-fns';

export class DeliveryService {
  private static async syncExportOrderForDelivery(
    deliveryId: string,
    totalAssigned: number,
    userId?: string,
    exportPaymentStatus?: 'unpaid' | 'paid',
    assignments?: Array<{ expected_amount?: number | null }>
  ) {
    const { data: deliveryOrder, error: deliveryError } = await supabaseService
      .from('delivery_orders')
      .select('id, product_name, unit_price, delivery_date, order_category, import_order_id, vegetable_order_id, image_url')
      .eq('id', deliveryId)
      .single();

    if (deliveryError || !deliveryOrder) throw deliveryError || new Error('Không tìm thấy đơn giao hàng');

    // Chỉ đồng bộ phiếu xuất cho hàng tạp hóa (standard) từ trang DeliveryPage.
    if (deliveryOrder.order_category && deliveryOrder.order_category !== 'standard') {
      return;
    }

    let customerId: string | null = null;
    if (deliveryOrder.import_order_id) {
      const { data: importOrder } = await supabaseService
        .from('import_orders')
        .select('customer_id')
        .eq('id', deliveryOrder.import_order_id)
        .single();
      customerId = importOrder?.customer_id || null;
    } else if (deliveryOrder.vegetable_order_id) {
      const { data: vegetableOrder } = await supabaseService
        .from('vegetable_orders')
        .select('customer_id')
        .eq('id', deliveryOrder.vegetable_order_id)
        .single();
      customerId = vegetableOrder?.customer_id || null;
    }

    const exportDate = deliveryOrder.delivery_date || format(new Date(), 'yyyy-MM-dd');
    const safeQuantity = Math.max(0, totalAssigned || 0);
    const expectedAmountFromAssignments = (assignments || []).reduce(
      (sum, assignment) => sum + Math.max(0, Number(assignment?.expected_amount || 0)),
      0
    );
    const debtAmount = expectedAmountFromAssignments;

    const { data: existingExportOrder } = await supabaseService
      .from('export_orders')
      .select('id, paid_amount, export_time')
      .eq('product_id', deliveryId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingExportOrder) {
      const paidAmount = Number(existingExportOrder.paid_amount || 0);
      let nextPaidAmount = Math.min(paidAmount, debtAmount);
      let nextPaymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';

      if (exportPaymentStatus === 'paid') {
        nextPaidAmount = debtAmount;
        nextPaymentStatus = debtAmount > 0 ? 'paid' : 'unpaid';
      } else if (exportPaymentStatus === 'unpaid') {
        nextPaidAmount = 0;
        nextPaymentStatus = 'unpaid';
      } else if (nextPaidAmount > 0 && nextPaidAmount < debtAmount) {
        nextPaymentStatus = 'partial';
      } else if (debtAmount > 0 && nextPaidAmount >= debtAmount) {
        nextPaymentStatus = 'paid';
      }

      const updatePayload: Record<string, any> = {
        export_date: exportDate,
        export_time: existingExportOrder.export_time || format(new Date(), 'HH:mm'),
        product_name: deliveryOrder.product_name,
        quantity: safeQuantity,
        debt_amount: debtAmount,
        paid_amount: nextPaidAmount,
        payment_status: nextPaymentStatus,
      };

      if (customerId) {
        updatePayload.customer_id = customerId;
      }

      if (deliveryOrder.image_url) {
        updatePayload.image_url = deliveryOrder.image_url;
      }

      const { error: updateError } = await supabaseService
        .from('export_orders')
        .update(updatePayload)
        .eq('id', existingExportOrder.id);

      if (updateError) throw updateError;

      await supabaseService
        .from('delivery_orders')
        .update({ status: 'da_giao' })
        .eq('id', deliveryId);

      return;
    }

    const createPayload: Record<string, any> = {
      export_date: exportDate,
      export_time: format(new Date(), 'HH:mm'),
      product_id: deliveryId,
      product_name: deliveryOrder.product_name,
      quantity: safeQuantity,
      debt_amount: debtAmount,
      payment_status: exportPaymentStatus === 'paid' && debtAmount > 0 ? 'paid' : 'unpaid',
      paid_amount: exportPaymentStatus === 'paid' ? debtAmount : 0,
    };

    if (userId) {
      createPayload.created_by = userId;
    }

    if (customerId) {
      createPayload.customer_id = customerId;
    }

    if (deliveryOrder.image_url) {
      createPayload.image_url = deliveryOrder.image_url;
    }

    const { error: createError } = await supabaseService
      .from('export_orders')
      .insert(createPayload);

    if (createError) throw createError;

    await supabaseService
      .from('delivery_orders')
      .update({ status: 'da_giao' })
      .eq('id', deliveryId);
  }

  static async getAllToday(startDate?: string, endDate?: string, orderCategory?: string) {
    let query = supabaseService
      .from('delivery_orders')
      .select('*, import_orders(order_code, sender_name, receiver_name, license_plate, customers(name), total_amount, profiles:received_by(full_name), receipt_image_url, import_order_items(image_url)), vegetable_orders(order_code, sender_name, receiver_name, license_plate, customers(name), total_amount, profiles:received_by(full_name), receipt_image_url, vegetable_order_items(image_url)), delivery_vehicles(*, vehicles(license_plate)), payment_collections(id, status, vehicle_id, image_url)')
      .order('delivery_date', { ascending: false });

    if (orderCategory) query = query.eq('order_category', orderCategory);

    if (startDate && endDate) {
      query = query.gte('delivery_date', startDate).lte('delivery_date', endDate);
    } else if (startDate) {
      query = query.eq('delivery_date', startDate);
    } else if (startDate === undefined && endDate === undefined) {
      // Fetch all if no dates provided (used for inventory)
    } else {
      const today = format(new Date(), 'yyyy-MM-dd');
      query = query.eq('delivery_date', today);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return data;

    const deliveryIds = data.map((row: any) => row.id).filter(Boolean);
    if (deliveryIds.length === 0) return data;

    const { data: exportOrders, error: exportOrdersError } = await supabaseService
      .from('export_orders')
      .select('product_id, payment_status, created_at')
      .in('product_id', deliveryIds)
      .order('created_at', { ascending: false });

    if (exportOrdersError) throw exportOrdersError;

    const paymentStatusByDeliveryId = new Map<string, 'unpaid' | 'partial' | 'paid'>();
    (exportOrders || []).forEach((row: any) => {
      if (!row.product_id || paymentStatusByDeliveryId.has(row.product_id)) return;
      paymentStatusByDeliveryId.set(row.product_id, row.payment_status || 'unpaid');
    });

    return data.map((row: any) => ({
      ...row,
      export_order_payment_status: paymentStatusByDeliveryId.get(row.id),
    }));
  }

  static async create(deliveryData: any, userId?: string) {
    const { vehicles, ...orderData } = deliveryData;

    // 1. Create the delivery order
    const { data: order, error } = await supabaseService
      .from('delivery_orders')
      .insert({
        ...orderData,
        order_category: orderData.order_category || 'standard',
        status: (vehicles && vehicles.length > 0) ? 'can_giao' : 'hang_o_sg'
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Assign vehicles if provided
    if (vehicles && vehicles.length > 0) {
      const totalAssigned = vehicles.reduce((sum: number, v: any) => sum + v.quantity, 0);
      if (totalAssigned > order.total_quantity) {
        throw new Error('Tổng số lượng gán cho xe không được vượt quá số hàng trong đơn');
      }

      await this.assignVehicles(order.id, vehicles, undefined, userId);
    }

    return order;
  }

  static async assignVehicles(
    deliveryId: string,
    assignments: any[],
    image_url?: string | null,
    userId?: string,
    exportPaymentStatus?: 'unpaid' | 'paid'
  ) {
    // assignments: [{vehicle_id, driver_id, quantity}]
    
    // Save image_url if provided
    if (image_url !== undefined) {
      const { error: imageUpdateError } = await supabaseService
        .from('delivery_orders')
        .update({ image_url })
        .eq('id', deliveryId);

      if (imageUpdateError) throw imageUpdateError;
    }

    // Remote old assignments for these vehicles to prevent duplicates
    const vIds = assignments.map(a => a.vehicle_id).filter(Boolean);
    if (vIds.length > 0) {
      await supabaseService
        .from('delivery_vehicles')
        .delete()
        .eq('delivery_order_id', deliveryId)
        .in('vehicle_id', vIds);
    }

    const insertData = assignments.map(a => ({
      delivery_order_id: deliveryId,
      vehicle_id: a.vehicle_id,
      driver_id: a.driver_id,
      loader_name: a.loader_name || null,
      assigned_quantity: a.quantity,
      expected_amount: a.expected_amount || 0,
    }));

    const { data, error } = await supabaseService
      .from('delivery_vehicles')
      .insert(insertData)
      .select();

    if (error) throw error;

    // Update vehicle status
    const vehicleIds = (assignments || []).map(a => a.vehicle_id).filter(id => !!id);
    if (vehicleIds.length > 0) {
      await supabaseService
        .from('vehicles')
        .update({ status: 'in_transit' })
        .in('id', vehicleIds);
    }

    // Auto-check: if all quantity assigned → set status to 'da_giao'
    const { data: allDvs } = await supabaseService
      .from('delivery_vehicles')
      .select('assigned_quantity')
      .eq('delivery_order_id', deliveryId);

    const totalAssigned = (allDvs || []).reduce((sum: number, dv: any) => sum + (dv.assigned_quantity || 0), 0);

    const { data: doData } = await supabaseService
      .from('delivery_orders')
      .select('total_quantity, status, order_category')
      .eq('id', deliveryId)
      .single();

    if (doData?.order_category === 'vegetable') {
      await supabaseService
        .from('delivery_orders')
        .update({ status: 'da_giao' })
        .eq('id', deliveryId);
    } else if (doData && totalAssigned >= doData.total_quantity) {
      await supabaseService
        .from('delivery_orders')
        .update({ status: 'da_giao' })
        .eq('id', deliveryId);
    }

    await this.syncExportOrderForDelivery(
      deliveryId,
      totalAssigned,
      userId,
      exportPaymentStatus,
      assignments
    );

    return data;
  }

  static async updateQuantity(id: string, deliveredQty: number) {
    // 1. Get current data
    const { data: order, error: fetchError } = await supabaseService
      .from('delivery_orders')
      .select('total_quantity, delivered_quantity')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;

    const newDelivered = (order.delivered_quantity || 0) + deliveredQty;
    const remaining = order.total_quantity - newDelivered;
    const status = remaining <= 0 ? 'da_giao' : 'can_giao';

    // 2. Update with status logic
    const { data, error } = await supabaseService
      .from('delivery_orders')
      .update({
        delivered_quantity: newDelivered,
        status: status,
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async confirmOrders(ids: string[]) {
    const { data, error } = await supabaseService
      .from('delivery_orders')
      .update({ status: 'can_giao' })
      .in('id', ids)
      .eq('status', 'hang_o_sg')
      .select();

    if (error) throw error;
    return data;
  }

  static async getInventory(orderCategory?: string) {
    const fetchVeg = !orderCategory || orderCategory === 'vegetable';
    const fetchStd = !orderCategory || orderCategory === 'standard';

    let allData: any[] = [];
    if (fetchStd) {
      const { data, error } = await supabaseService
        .from('import_orders')
        .select('*, warehouses(name)')
        .eq('status', 'pending');
      
      if (error) throw error;
      if (data) allData = allData.concat(data.map(d => ({ ...d, order_category: 'standard' })));
    }

    if (fetchVeg) {
      const { data, error } = await supabaseService
        .from('vegetable_orders')
        .select('*, warehouses(name)')
        .eq('status', 'pending');
      
      if (error) throw error;
      if (data) allData = allData.concat(data.map(d => ({ ...d, order_category: 'vegetable' })));
    }

    return allData;
  }
}
