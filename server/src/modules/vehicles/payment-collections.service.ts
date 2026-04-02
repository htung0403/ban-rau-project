import { supabaseService } from '../../config/supabase';
import { CreatePaymentCollectionDto, SubmitPaymentDto, ConfirmPaymentDto, PaymentCollectionStatus } from '../../types';

export class PaymentCollectionsService {
  static async getPaymentCollections(filters: { driverId?: string, status?: string, vehicleId?: string, dateFrom?: string, dateTo?: string }) {
    let query = supabaseService
      .from('payment_collections')
      .select(`
        *,
        delivery_orders ( id, import_orders ( order_code, customers ( name ) ) ),
        drivers:profiles!payment_collections_driver_id_fkey(full_name),
        receivers:profiles!payment_collections_receiver_id_fkey(full_name),
        vehicles ( license_plate )
      `)
      .order('collected_at', { ascending: false });

    if (filters.driverId) query = query.eq('driver_id', filters.driverId);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.vehicleId) query = query.eq('vehicle_id', filters.vehicleId);
    if (filters.dateFrom) query = query.gte('collected_at', filters.dateFrom);
    if (filters.dateTo) query = query.lte('collected_at', filters.dateTo);

    const { data, error } = await query;
    if (error) throw error;

    // Map to normalized PaymentCollection shape matching frontend
    return data.map((pc: any) => this.mapToDto(pc));
  }

  static async getPaymentCollectionById(id: string) {
    const { data, error } = await supabaseService
      .from('payment_collections')
      .select(`
        *,
        delivery_orders ( id, import_orders ( order_code, customers ( name ) ) ),
        drivers:profiles!payment_collections_driver_id_fkey(full_name),
        receivers:profiles!payment_collections_receiver_id_fkey(full_name),
        vehicles ( license_plate )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return this.mapToDto(data);
  }

  static async createPaymentCollection(data: CreatePaymentCollectionDto, driverId: string) {
    // 1. Get delivery order to get customer_id and expected_amount
    const { data: doData, error: doError } = await supabaseService
      .from('delivery_orders')
      .select('id, import_orders(customer_id, total_amount)')
      .eq('id', data.deliveryOrderId)
      .single();

    if (doError || !doData) throw new Error('Không tìm thấy đơn giao hàng');

    // 2. Get vehicle_id from delivery_vehicles where assigned to this driver
    const { data: dvData, error: dvError } = await supabaseService
      .from('delivery_vehicles')
      .select('vehicle_id')
      .eq('delivery_order_id', data.deliveryOrderId)
      .eq('driver_id', driverId)
      .limit(1)
      .maybeSingle();

    if (dvError || !dvData) throw new Error('Bạn không được giao đơn hàng này');

    const importOrder: any = Array.isArray(doData.import_orders) ? doData.import_orders[0] : doData.import_orders;
    const expectedAmount = importOrder?.total_amount || 0;

    if (data.collectedAmount < expectedAmount && (!data.notes || data.notes.trim() === '')) {
      throw new Error('Vui lòng ghi chú lý do thu thiếu tiền');
    }

    // 3. Create the payment collection ticket
    const { data: pcData, error: pcError } = await supabaseService
      .from('payment_collections')
      .insert({
        delivery_order_id: data.deliveryOrderId,
        customer_id: importOrder?.customer_id,
        driver_id: driverId,
        vehicle_id: dvData.vehicle_id,
        expected_amount: expectedAmount,
        collected_amount: data.collectedAmount,
        collected_at: data.collectedAt,
        notes: data.notes,
        status: 'draft'
      })
      .select()
      .single();

    if (pcError) {
      if (pcError.code === '23505') { // unique_active_collection
        throw new Error('Đơn hàng này đã có phiếu thu hoạt động');
      }
      throw pcError;
    }

    return this.getPaymentCollectionById(pcData.id);
  }

  static async updatePaymentCollection(id: string, data: any, driverId: string) {
    // Validate state
    const pc = await this.getRawById(id);
    if (pc.driver_id !== driverId) throw new Error('Không có quyền sửa phiếu này');
    if (pc.status !== 'draft') throw new Error('Chỉ được sửa phiếu ở trạng thái draft');

    let expectedAmount = pc.expected_amount;

    if (data.collectedAmount !== undefined) {
      if (data.collectedAmount < expectedAmount && (!data.notes || data.notes.trim() === '') && (!pc.notes || pc.notes.trim() === '')) {
        throw new Error('Vui lòng ghi chú lý do thu thiếu tiền');
      }
    }

    const updatePayload: any = {};
    if (data.collectedAmount !== undefined) updatePayload.collected_amount = data.collectedAmount;
    if (data.collectedAt !== undefined) updatePayload.collected_at = data.collectedAt;
    if (data.notes !== undefined) updatePayload.notes = data.notes;

    const { error } = await supabaseService
      .from('payment_collections')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;
    return this.getPaymentCollectionById(id);
  }

  static async submitPaymentCollection(id: string, data: SubmitPaymentDto, driverId: string) {
    const pc = await this.getRawById(id);
    if (pc.driver_id !== driverId) throw new Error('Không có quyền nộp phiếu này');
    if (pc.status !== 'draft') throw new Error('Phiếu phải ở trạng thái draft để nộp');

    const updatePayload = {
      status: 'submitted',
      receiver_id: data.receiverId,
      receiver_type: data.receiverType,
      submitted_at: data.submittedAt,
      notes: data.notes ? data.notes : pc.notes
    };

    const { error } = await supabaseService
      .from('payment_collections')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;
    return this.getPaymentCollectionById(id);
  }

  static async selfConfirmPaymentCollection(id: string, reason: string, driverId: string) {
    const pc = await this.getRawById(id);
    if (pc.driver_id !== driverId) throw new Error('Không có quyền tự xác nhận phiếu này');
    if (pc.status !== 'draft' && pc.status !== 'submitted') throw new Error('Trạng thái không hợp lệ');
    if (!reason || reason.trim() === '') throw new Error('Lý do tự xác nhận là bắt buộc');

    const { error } = await supabaseService
      .from('payment_collections')
      .update({
        status: 'self_confirmed',
        self_confirm_reason: reason,
        confirmed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    // update debt
    await this.updateCustomerDebt(pc.customer_id, pc.collected_amount);
    await this.markImportItemAsPaid(pc.delivery_order_id);

    return this.getPaymentCollectionById(id);
  }

  static async confirmPaymentCollection(id: string, data: ConfirmPaymentDto, receiverId: string) {
    const pc = await this.getRawById(id);
    if (pc.status !== 'submitted') throw new Error('Phiếu chưa được gửi');
    // We optionally validate if the current user is the target receiver, or if any manager can confirm
    // For now we allow if they are staff/manager by role (via route middleware)

    const updatePayload = {
      status: 'confirmed',
      confirmed_at: data.confirmedAt,
      notes: data.notes ? data.notes : pc.notes
    };

    const { error } = await supabaseService
      .from('payment_collections')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;

    // update debt
    await this.updateCustomerDebt(pc.customer_id, pc.collected_amount);
    await this.markImportItemAsPaid(pc.delivery_order_id);

    return this.getPaymentCollectionById(id);
  }

  static async revertToDraft(id: string, actorId: string) {
    const pc = await this.getRawById(id);
    if (pc.status !== 'submitted') throw new Error('Chỉ có thể lấy lại khi đang chờ xác nhận');
    // Optionally check if actor is driver or staff

    const { error } = await supabaseService
      .from('payment_collections')
      .update({
        status: 'draft',
        receiver_id: null,
        receiver_type: null,
        submitted_at: null
      })
      .eq('id', id);

    if (error) throw error;
    return this.getPaymentCollectionById(id);
  }

  static async getCollectionSummaryByVehicle(filters: { dateFrom?: string, dateTo?: string }) {
    // Actually we fetch confirmed or all and group in frontend, or do simple aggregate locally
    let query = supabaseService
      .from('payment_collections')
      .select(`
        *,
        delivery_orders ( id, import_orders ( order_code, customers ( name ) ) ),
        drivers:profiles!payment_collections_driver_id_fkey(full_name),
        receivers:profiles!payment_collections_receiver_id_fkey(full_name),
        vehicles ( license_plate )
      `);

    if (filters.dateFrom) query = query.gte('collected_at', filters.dateFrom);
    if (filters.dateTo) query = query.lte('collected_at', filters.dateTo);

    const { data, error } = await query;
    if (error) throw error;

    return data.map((pc: any) => this.mapToDto(pc));
  }

  private static async getRawById(id: string) {
    const { data, error } = await supabaseService
      .from('payment_collections')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) throw new Error('Phiếu thu không tồn tại');
    return data;
  }

  private static async updateCustomerDebt(customerId: string, collectedAmount: number) {
    if (!customerId) return;
    // We fetch current debt and deduct
    // Note: To make this robust it should be an RPC or a trigger, but implementing in app level as requested:
    const { data: customer, error: fetchError } = await supabaseService
      .from('customers')
      .select('debt')
      .eq('id', customerId)
      .single();

    if (fetchError || !customer) return;

    const newDebt = Number(customer.debt || 0) - Number(collectedAmount);

    const { error: updateError } = await supabaseService
      .from('customers')
      .update({ debt: newDebt })
      .eq('id', customerId);

    if (updateError) {
      console.error('Failed to update customer debt', updateError);
    }
  }

  private static async markImportItemAsPaid(deliveryOrderId: string) {
    if (!deliveryOrderId) return;
    const { data: doData } = await supabaseService.from('delivery_orders').select('import_order_id, product_name').eq('id', deliveryOrderId).single();
    if (!doData || !doData.import_order_id) return;

    const { data: items } = await supabaseService.from('import_order_items').select('id, product_id, package_type').eq('import_order_id', doData.import_order_id);
    if (!items || items.length === 0) return;

    const productIds = items.map(i => i.product_id).filter(Boolean);
    let productsMap = new Map();
    if (productIds.length > 0) {
      const { data: pData } = await supabaseService.from('products').select('id, name').in('id', productIds);
      if (pData) pData.forEach(p => productsMap.set(p.id, p.name));
    }

    const matchedItem = items.find(i => {
      let name = i.package_type || 'Kiện';
      if (i.product_id && productsMap.has(i.product_id)) name = productsMap.get(i.product_id);
      return name === doData.product_name;
    });

    if (matchedItem) {
      await supabaseService.from('import_order_items').update({ payment_status: 'paid' }).eq('id', matchedItem.id);
    }
  }

  // Helper mapping 
  private static mapToDto(pc: any) {
    return {
      id: pc.id,
      deliveryOrderId: pc.delivery_order_id,
      deliveryOrderCode: pc.delivery_orders?.import_orders ? (Array.isArray(pc.delivery_orders.import_orders) ? pc.delivery_orders.import_orders[0].order_code : pc.delivery_orders.import_orders.order_code) : undefined,
      customerId: pc.customer_id,
      customerName: pc.delivery_orders?.import_orders ? (Array.isArray(pc.delivery_orders.import_orders) ? pc.delivery_orders.import_orders[0].customers?.name : pc.delivery_orders.import_orders.customers?.name) : undefined,
      driverId: pc.driver_id,
      driverName: pc.drivers?.full_name,
      vehicleId: pc.vehicle_id,
      licensePlate: pc.vehicles?.license_plate,
      expectedAmount: Number(pc.expected_amount),
      collectedAmount: Number(pc.collected_amount),
      difference: Number(pc.difference),
      collectedAt: pc.collected_at,
      status: pc.status,
      submittedAt: pc.submitted_at,
      receiverId: pc.receiver_id,
      receiverName: pc.receivers?.full_name,
      receiverType: pc.receiver_type,
      confirmedAt: pc.confirmed_at,
      selfConfirmReason: pc.self_confirm_reason,
      notes: pc.notes
    };
  }
}
