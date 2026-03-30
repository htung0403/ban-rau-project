import { supabaseService } from '../../config/supabase';

export class VehicleService {
  static async getAll() {
    const { data, error } = await supabaseService.from('vehicles').select('*, profiles(full_name)');
    if (error) throw error;
    return data;
  }

  static async create(vehicleData: any) {
    const { data, error } = await supabaseService.from('vehicles').insert(vehicleData).select().single();
    if (error) throw error;
    return data;
  }

  static async update(id: string, vehicleData: any) {
    const { data, error } = await supabaseService.from('vehicles').update(vehicleData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  static async checkin(vehicleId: string, driverId: string, checkinData: any) {
    const { data, error } = await supabaseService
      .from('vehicle_checkins')
      .insert({
        vehicle_id: vehicleId,
        driver_id: driverId,
        checkin_type: checkinData.type,
        latitude: checkinData.latitude,
        longitude: checkinData.longitude,
        address_snapshot: checkinData.address,
      })
      .select()
      .single();
    
    if (error) throw error;

    // Update vehicle status
    await supabaseService.from('vehicles').update({
      status: checkinData.type === 'in' ? 'in_transit' : 'available'
    }).eq('id', vehicleId);

    return data;
  }

  static async getCheckins(vehicleId: string) {
    const { data, error } = await supabaseService
      .from('vehicle_checkins')
      .select('*, profiles(full_name)')
      .eq('vehicle_id', vehicleId)
      .order('checkin_time', { ascending: false });
    if (error) throw error;
    return data;
  }

  static async collectPayment(paymentData: any, receivedBy: string) {
    const { data, error } = await supabaseService
      .from('payment_collections')
      .insert({
        ...paymentData,
        received_by: receivedBy,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getCollections(filters: any) {
    let query = supabaseService.from('payment_collections').select('*, profiles!payment_collections_driver_id_fkey(full_name), vehicles(license_plate)');
    
    if (filters.date) query = query.eq('collected_date', filters.date);
    if (filters.vehicle_id) query = query.eq('vehicle_id', filters.vehicle_id);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async getAssignments(vehicleId: string) {
    const { data, error } = await supabaseService
      .from('delivery_vehicles')
      .select('*, delivery_orders(*, import_orders(order_code, receiver_name, customers(name)))')
      .eq('vehicle_id', vehicleId)
      // Filter for orders that are NOT completed
      .not('delivery_orders.status', 'eq', 'completed')
      .order('assigned_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
