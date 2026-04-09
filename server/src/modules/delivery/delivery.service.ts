import { supabaseService } from '../../config/supabase';
import { format } from 'date-fns';

export class DeliveryService {
  static async getAllToday(startDate?: string, endDate?: string, orderCategory?: string) {
    let query = supabaseService
      .from('delivery_orders')
      .select('*, import_orders(order_code, sender_name, receiver_name, customers(name), total_amount, profiles:received_by(full_name), receipt_image_url, import_order_items(image_url)), vegetable_orders(order_code, sender_name, receiver_name, customers(name), total_amount, profiles:received_by(full_name), receipt_image_url, vegetable_order_items(image_url)), delivery_vehicles(*, vehicles(license_plate)), payment_collections(id, status, vehicle_id, image_url)')
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
    return data;
  }

  static async create(deliveryData: any) {
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

      await this.assignVehicles(order.id, vehicles);
    }

    return order;
  }

  static async assignVehicles(deliveryId: string, assignments: any[], image_url?: string | null) {
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
    } else if (doData && totalAssigned >= doData.total_quantity && doData.status === 'can_giao') {
      await supabaseService
        .from('delivery_orders')
        .update({ status: 'da_giao' })
        .eq('id', deliveryId);
    }

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
