import { supabaseService } from '../../config/supabase';
import { format } from 'date-fns';

export class DeliveryService {
  static async getAllToday(startDate?: string, endDate?: string) {
    let query = supabaseService
      .from('delivery_orders')
      .select('*, import_orders(order_code, sender_name, receiver_name, customers(name)), delivery_vehicles(*, vehicles(license_plate))')
      .order('delivery_date', { ascending: false });

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
        status: (vehicles && vehicles.length > 0) ? 'in_progress' : 'pending'
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

  static async assignVehicles(deliveryId: string, assignments: any[]) {
    // assignments: [{vehicle_id, driver_id, quantity}]
    
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
      assigned_quantity: a.quantity,
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
    const status = remaining <= 0 ? 'completed' : 'in_progress';

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

  static async getInventory() {
    const { data, error } = await supabaseService
      .from('import_orders')
      .select('*, warehouses(name)')
      .eq('status', 'pending'); // Items in warehouse not yet assigned for delivery
    if (error) throw error;
    return data;
  }
}
