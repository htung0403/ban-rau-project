import { supabaseService } from '../../config/supabase';
import { format } from 'date-fns';
import type { UserPayload } from '../../types';
import {
  deliveryOrderRowMatchesGoodsScope,
  fetchDriverScopeForUser,
  goodsScopeFullAccess,
  goodsScopeIsDriverRole,
  goodsScopeIsStaffRole,
  importOrderRowMatchesGoodsScope,
  type DriverScope,
} from '../../utils/goodsScope';

export class DeliveryService {
  /** Chỉ đánh dấu đã giao khi đã phân đủ số lượng; còn hàng thì can_giao. */
  private static resolveDeliveryStatusFromAssignedQuantity(
    totalQuantity: unknown,
    totalAssigned: number,
    options?: { previousStatus?: string | null; preserveHangOsgWhenUnassigned?: boolean }
  ): 'hang_o_sg' | 'can_giao' | 'da_giao' {
    const tq = Number(totalQuantity || 0);
    const ta = Math.max(0, Number(totalAssigned || 0));
    if (tq > 0 && ta >= tq) return 'da_giao';
    if (
      options?.preserveHangOsgWhenUnassigned &&
      options.previousStatus === 'hang_o_sg' &&
      ta === 0
    ) {
      return 'hang_o_sg';
    }
    return 'can_giao';
  }

  private static async syncExportOrderForDelivery(
    deliveryId: string,
    totalAssigned: number,
    userId?: string,
    exportPaymentStatus?: 'unpaid' | 'paid',
    assignments?: Array<{ expected_amount?: number | null }>
  ) {
    const { data: deliveryOrder, error: deliveryError } = await supabaseService
      .from('delivery_orders')
      .select(
        'id, product_name, unit_price, delivery_date, order_category, import_order_id, vegetable_order_id, image_url, image_urls, total_quantity'
      )
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
      if (deliveryOrder.image_urls?.length) {
        updatePayload.image_urls = deliveryOrder.image_urls;
      }

      const { error: updateError } = await supabaseService
        .from('export_orders')
        .update(updatePayload)
        .eq('id', existingExportOrder.id);

      if (updateError) throw updateError;

      const exportSyncStatus = this.resolveDeliveryStatusFromAssignedQuantity(
        deliveryOrder.total_quantity,
        safeQuantity
      );
      await supabaseService.from('delivery_orders').update({ status: exportSyncStatus }).eq('id', deliveryId);

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
    if (deliveryOrder.image_urls?.length) {
      createPayload.image_urls = deliveryOrder.image_urls;
    }

    const { error: createError } = await supabaseService
      .from('export_orders')
      .insert(createPayload);

    if (createError) throw createError;

    const exportSyncStatus = this.resolveDeliveryStatusFromAssignedQuantity(
      deliveryOrder.total_quantity,
      safeQuantity
    );
    await supabaseService.from('delivery_orders').update({ status: exportSyncStatus }).eq('id', deliveryId);
  }

  private static deliverySourceIsSoftDeleted(row: any): boolean {
    const io = row?.import_orders;
    const vo = row?.vegetable_orders;
    const ioDel = Array.isArray(io) ? io[0]?.deleted_at : io?.deleted_at;
    const voDel = Array.isArray(vo) ? vo[0]?.deleted_at : vo?.deleted_at;
    return Boolean(ioDel || voDel);
  }

  static async getAllToday(startDate?: string, endDate?: string, orderCategory?: string, actor?: UserPayload) {
    let driverScope: DriverScope | null = null;
    if (actor && goodsScopeIsDriverRole(actor.role) && !goodsScopeFullAccess(actor.role)) {
      driverScope = await fetchDriverScopeForUser(actor.id);
    }

      let query = supabaseService
        .from('delivery_orders')
        .select(
          '*, import_orders(order_code, sender_name, sender_id, receiver_name, customer_id, license_plate, driver_name, received_by, customers:customers!import_orders_customer_id_fkey(name), sender_customers:customers!import_orders_sender_id_fkey(name), total_amount, profiles:received_by(full_name), receipt_image_url, import_order_items(image_url), deleted_at), vegetable_orders(order_code, sender_name, sender_id, receiver_name, customer_id, license_plate, driver_name, received_by, customers:customers!vegetable_orders_customer_id_fkey(name), sender_customers:customers!vegetable_orders_sender_id_fkey(name), total_amount, profiles:received_by(full_name), receipt_image_url, vegetable_order_items(image_url), deleted_at), delivery_vehicles(*, vehicles(license_plate, in_charge_id)), payment_collections(id, status, vehicle_id, image_url)'
        )
        .order('delivery_date', { ascending: false });

    if (orderCategory) query = query.eq('order_category', orderCategory);

    if (startDate && endDate) {
      query = query.gte('delivery_date', startDate).lte('delivery_date', endDate);
    } else if (startDate) {
      query = query.eq('delivery_date', startDate);
    } else if (!startDate && !endDate) {
      // Fetch all if no dates provided or empty strings (used for inventory/full list)
    } else {
      const today = format(new Date(), 'yyyy-MM-dd');
      query = query.eq('delivery_date', today);
    }

    const { data: rawData, error } = await query;
    if (error) throw error;
    let data = (rawData || []).filter((row: any) => !this.deliverySourceIsSoftDeleted(row));

    if (actor && !goodsScopeFullAccess(actor.role)) {
      const isStaff = goodsScopeIsStaffRole(actor.role);
      const isDriver = goodsScopeIsDriverRole(actor.role);
      if (isStaff || isDriver) {
        data = data.filter((row: any) => deliveryOrderRowMatchesGoodsScope(row, actor, driverScope));
      }
    }

    if (data.length === 0) return data;

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
    exportPaymentStatus?: 'unpaid' | 'paid',
    unit_price?: number,
    image_urls?: string[]
  ) {
    const updateData: any = {};
    if (image_url !== undefined) {
      updateData.image_url = image_url;
    }
    if (image_urls !== undefined) {
      updateData.image_urls = image_urls;
    }
    if (unit_price !== undefined) {
      updateData.unit_price = unit_price;
    }

    if (Object.keys(updateData).length > 0) {
      const { error: doUpdateError } = await supabaseService
        .from('delivery_orders')
        .update(updateData)
        .eq('id', deliveryId);

      if (doUpdateError) throw doUpdateError;
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

    // Tự động tạo phiếu thu nháp cho từng xe nếu có expected_amount > 0
    {
      const { data: doInfo } = await supabaseService
        .from('delivery_orders')
        .select('import_orders(customer_id), vegetable_orders(customer_id)')
        .eq('id', deliveryId)
        .single();

      if (doInfo) {
        const ioOrVeg: any = (doInfo as any).vegetable_orders || (doInfo as any).import_orders;
        const sourceOrder = Array.isArray(ioOrVeg) ? ioOrVeg[0] : ioOrVeg;
        const customerId = sourceOrder?.customer_id ?? null;

        for (const dv of (data || [])) {
          if (Number(dv.expected_amount || 0) > 0) {
            try {
              await supabaseService.from('payment_collections').insert({
                delivery_order_id: deliveryId,
                customer_id: customerId,
                driver_id: dv.driver_id,
                vehicle_id: dv.vehicle_id,
                expected_amount: dv.expected_amount,
                collected_amount: dv.expected_amount,
                collected_at: new Date().toISOString(),
                status: 'draft',
              });
            } catch (pcError) {
              console.error('Failed to auto-create payment collection for driver', dv.driver_id, pcError);
            }
          }
        }
      }
    }

    // Update vehicle status
    const vehicleIds = (assignments || []).map(a => a.vehicle_id).filter(id => !!id);
    if (vehicleIds.length > 0) {
      await supabaseService
        .from('vehicles')
        .update({ status: 'in_transit' })
        .in('id', vehicleIds);
    }

    // Trạng thái: chỉ da_giao khi đã phân đủ SL; còn hàng → can_giao (giữ hang_o_sg nếu chưa gán xe nào).
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

    if (doData) {
      const nextStatus = this.resolveDeliveryStatusFromAssignedQuantity(
        doData.total_quantity,
        totalAssigned,
        { previousStatus: doData.status, preserveHangOsgWhenUnassigned: true }
      );
      await supabaseService.from('delivery_orders').update({ status: nextStatus }).eq('id', deliveryId);
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
    // 1. Fetch the delivery orders being confirmed
    const { data: sourceOrders, error: sourceError } = await supabaseService
      .from('delivery_orders')
      .select(`
        *, 
        import_orders(customer_id, receiver_name, customers:customers!import_orders_customer_id_fkey(name), profiles:received_by(full_name)), 
        vegetable_orders(customer_id, receiver_name, customers:customers!vegetable_orders_customer_id_fkey(name), profiles:received_by(full_name))
      `)
      .in('id', ids)
      .eq('status', 'hang_o_sg');

    if (sourceError) throw sourceError;
    if (!sourceOrders || sourceOrders.length === 0) return [];

    const getReceiverName = (o: any) => {
       const io = o.import_orders || o.vegetable_orders;
       if (!io) return '-';
       return io.customers?.name || io.receiver_name?.trim() || io.profiles?.full_name || '-';
    };

    // Group source orders by Key = `delivery_date|order_category|receiverName|product_name`
    const groups: Record<string, any[]> = {};
    for (const order of sourceOrders) {
       const receiverName = getReceiverName(order);
       const productName = (order.product_name || '').trim();
       const key = `${order.delivery_date}|${order.order_category || 'standard'}|${receiverName}|${productName}`;
       if (!groups[key]) groups[key] = [];
       groups[key].push(order);
    }

    // Process each group
    for (const key of Object.keys(groups)) {
       const groupOrders = groups[key];
       const firstOrder = groupOrders[0];
       const receiverName = getReceiverName(firstOrder);
       
       const { data: existingCandidates } = await supabaseService
         .from('delivery_orders')
         .select(`
           *, 
           import_orders(customer_id, receiver_name, customers:customers!import_orders_customer_id_fkey(name), profiles:received_by(full_name)), 
           vegetable_orders(customer_id, receiver_name, customers:customers!vegetable_orders_customer_id_fkey(name), profiles:received_by(full_name)), 
           delivery_vehicles(id, assigned_quantity)
         `)
         .eq('status', 'can_giao')
         .eq('delivery_date', firstOrder.delivery_date)
         .eq('order_category', firstOrder.order_category || 'standard')
         .eq('product_name', firstOrder.product_name);

       let targetOrder = null;
       if (existingCandidates && existingCandidates.length > 0) {
         // Find one with the same receiverName and total assigned quantity == 0
         targetOrder = existingCandidates.find(o => {
           const matchName = getReceiverName(o) === receiverName;
           const assignedQty = (o.delivery_vehicles || []).reduce((sum: number, dv: any) => sum + Number(dv.assigned_quantity || 0), 0);
           return matchName && assignedQty === 0;
         });
       }

       if (targetOrder) {
         // Merge all groupOrders into targetOrder
         const addedQuantity = groupOrders.reduce((sum, o) => sum + (Number(o.total_quantity) || 0), 0);
         const newTotal = Number(targetOrder.total_quantity || 0) + addedQuantity;
         
         await supabaseService
           .from('delivery_orders')
           .update({ total_quantity: newTotal })
           .eq('id', targetOrder.id);
           
         // Delete the groupOrders
         const idsToDelete = groupOrders.map(o => o.id);
         await supabaseService.from('delivery_orders').delete().in('id', idsToDelete);
       } else {
         // Merge groupOrders into the firstOrder
         const targetId = firstOrder.id;
         const remainingOrders = groupOrders.slice(1);
         
         if (remainingOrders.length > 0) {
           const addedQuantity = remainingOrders.reduce((sum, o) => sum + (Number(o.total_quantity) || 0), 0);
           const newTotal = Number(firstOrder.total_quantity || 0) + addedQuantity;
           
           await supabaseService
             .from('delivery_orders')
             .update({ total_quantity: newTotal, status: 'can_giao' })
             .eq('id', targetId);
             
           const idsToDelete = remainingOrders.map(o => o.id);
           await supabaseService.from('delivery_orders').delete().in('id', idsToDelete);
         } else {
           // Just update its status to 'can_giao'
           await supabaseService
             .from('delivery_orders')
             .update({ status: 'can_giao' })
             .eq('id', targetId);
         }
       }
    }
    
    return { success: true };
  }

  static async getInventory(orderCategory?: string, actor?: UserPayload) {
    const fetchVeg = !orderCategory || orderCategory === 'vegetable';
    const fetchStd = !orderCategory || orderCategory === 'standard';

    const nestedDv =
      'delivery_orders(*, delivery_vehicles(*, vehicles(license_plate), profiles(full_name)))';

    let allData: any[] = [];
    if (fetchStd) {
      const { data, error } = await supabaseService
        .from('import_orders')
        .select(`*, warehouses(name), ${nestedDv}`)
        .eq('status', 'pending')
        .is('deleted_at', null);

      if (error) throw error;
      if (data) allData = allData.concat(data.map(d => ({ ...d, order_category: 'standard' })));
    }

    if (fetchVeg) {
      const { data, error } = await supabaseService
        .from('vegetable_orders')
        .select(`*, warehouses(name), ${nestedDv}`)
        .eq('status', 'pending')
        .is('deleted_at', null);

      if (error) throw error;
      if (data) allData = allData.concat(data.map(d => ({ ...d, order_category: 'vegetable' })));
    }

    if (actor && !goodsScopeFullAccess(actor.role)) {
      const isStaff = goodsScopeIsStaffRole(actor.role);
      const isDriver = goodsScopeIsDriverRole(actor.role);
      if (isStaff || isDriver) {
        let driverScope: DriverScope | null = null;
        if (isDriver) {
          driverScope = await fetchDriverScopeForUser(actor.id);
        }
        allData = allData.filter((row: any) => importOrderRowMatchesGoodsScope(row, actor, driverScope));
      }
    }

    return allData;
  }

  static async update(id: string, updateData: any) {
    const { data, error } = await supabaseService
      .from('delivery_orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async revertVehicle(deliveryId: string, vehicleId: string) {
    const { error: deleteError } = await supabaseService
      .from('delivery_vehicles')
      .delete()
      .eq('delivery_order_id', deliveryId)
      .eq('vehicle_id', vehicleId);

    if (deleteError) throw deleteError;

    await supabaseService
      .from('payment_collections')
      .delete()
      .eq('delivery_order_id', deliveryId)
      .eq('vehicle_id', vehicleId)
      .in('status', ['draft']);

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

    if (doData) {
      const nextStatus = this.resolveDeliveryStatusFromAssignedQuantity(
        doData.total_quantity,
        totalAssigned,
        { previousStatus: doData.status, preserveHangOsgWhenUnassigned: false }
      );
      await supabaseService.from('delivery_orders').update({ status: nextStatus }).eq('id', deliveryId);

      if (doData.order_category === 'standard' || !doData.order_category) {
        const { data: existingExport } = await supabaseService
          .from('export_orders')
          .select('id, debt_amount, paid_amount')
          .eq('product_id', deliveryId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingExport) {
          const { data: remainingDvs } = await supabaseService
            .from('delivery_vehicles')
            .select('assigned_quantity, expected_amount')
            .eq('delivery_order_id', deliveryId);

          const newQty = (remainingDvs || []).reduce((sum: number, dv: any) => sum + (dv.assigned_quantity || 0), 0);
          const newDebt = (remainingDvs || []).reduce((sum: number, dv: any) => sum + Number(dv.expected_amount || 0), 0);

          if (newQty === 0) {
            await supabaseService.from('export_orders').delete().eq('id', existingExport.id);
          } else {
            const newPaid = Math.min(Number(existingExport.paid_amount || 0), newDebt);
            const newPaymentStatus = newPaid <= 0 ? 'unpaid' : newPaid >= newDebt ? 'paid' : 'partial';
            await supabaseService.from('export_orders').update({
              quantity: newQty,
              debt_amount: newDebt,
              paid_amount: newPaid,
              payment_status: newPaymentStatus,
            }).eq('id', existingExport.id);
          }
        }
      }
    }

    return { success: true };
  }

  static async deleteOrders(ids: string[]) {
    // Delete related delivery_vehicles first (foreign key)
    const { error: dvError } = await supabaseService
      .from('delivery_vehicles')
      .delete()
      .in('delivery_order_id', ids);

    if (dvError) throw dvError;

    // Delete delivery orders
    const { data, error } = await supabaseService
      .from('delivery_orders')
      .delete()
      .in('id', ids)
      .select();

    if (error) throw error;
    return data;
  }
}
