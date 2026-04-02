import { supabaseService } from '../../config/supabase';

export class InventoryService {
  /**
   * Adjusts the stock level of a product in a warehouse.
   * If the record doesn't exist, it creates one (for increments).
   */
  static async adjustStock(warehouseId: string, productId: string, importOrderId: string | null = null, amount: number) {
    // 1. Try to get existing inventory record
    let query = supabaseService
      .from('inventory')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .eq('product_id', productId);
      
    if (importOrderId) {
       query = query.eq('import_order_id', importOrderId);
    } else {
       query = query.is('import_order_id', null);
    }
    
    const { data: existing, error: fetchError } = await query.maybeSingle();

    if (fetchError) throw fetchError;

    if (existing) {
      // 2. Update existing
      const newQuantity = Math.max(0, (existing.quantity || 0) + amount);
      const { error: updateError } = await supabaseService
        .from('inventory')
        .update({ 
          quantity: newQuantity,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;
    } else if (amount > 0) {
      // 3. Create new if incrementing
      const { error: insertError } = await supabaseService
        .from('inventory')
        .insert({
          warehouse_id: warehouseId,
          product_id: productId,
          import_order_id: importOrderId,
          quantity: amount,
          last_updated_at: new Date().toISOString()
        });

      if (insertError) throw insertError;
    }

    // 4. Update the aggregate current_stock in warehouses table for convenience
    // This is optional but keeps the legacy columns somewhat in sync if needed.
    await this.syncWarehouseTotalStock(warehouseId);
  }

  static async syncWarehouseTotalStock(warehouseId: string) {
    const { data: items, error: sumError } = await supabaseService
      .from('inventory')
      .select('quantity')
      .eq('warehouse_id', warehouseId);

    if (sumError) return;

    const total = items.reduce((acc, item) => acc + (item.quantity || 0), 0);

    await supabaseService
      .from('warehouses')
      .update({ current_stock: total })
      .eq('id', warehouseId);
  }

  static async getWarehouseInventory(warehouseId: string) {
    const { data, error } = await supabaseService
      .from('inventory')
      .select('*, products(*), import_orders(license_plate, sheet_number, order_date, supplier_name)')
      .eq('warehouse_id', warehouseId);

    if (error) throw error;
    return data;
  }

  static async getBatchesForProduct(productId: string) {
    const { data, error } = await supabaseService
      .from('inventory')
      .select('*, import_orders(license_plate, sheet_number, order_date, supplier_name)')
      .eq('product_id', productId)
      .gt('quantity', 0)
      .order('last_updated_at', { ascending: true });

    if (error) throw error;
    return data;
  }
}
