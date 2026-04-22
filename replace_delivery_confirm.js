const fs = require('fs');

const file = 'D:/job-banrau/server/src/modules/delivery/delivery.service.ts';
let code = fs.readFileSync(file, 'utf8');

const oldCode = `
  static async confirmOrders(ids: string[]) {
    // 1. Fetch the delivery orders being confirmed
    const { data: sourceOrders, error: sourceError } = await supabaseService
      .from('delivery_orders')
      .select(\`
        *, 
        import_orders(customer_id, receiver_name, customers:customers!import_orders_customer_id_fkey(name), profiles:received_by(full_name)), 
        vegetable_orders(customer_id, receiver_name, customers:customers!vegetable_orders_customer_id_fkey(name), profiles:received_by(full_name))
      \`)
      .in('id', ids)
      .eq('status', 'hang_o_sg');

    if (sourceError) throw sourceError;
    if (!sourceOrders || sourceOrders.length === 0) return [];

    const getReceiverName = (o: any) => {
       const io = o.import_orders || o.vegetable_orders;
       if (!io) return '-';
       return io.customers?.name || io.receiver_name?.trim() || io.profiles?.full_name || '-';
    };

    // Group source orders by Key = \`delivery_date|order_category|receiverName|product_name\`
    const groups: Record<string, any[]> = {};
    for (const order of sourceOrders) {
       const receiverName = getReceiverName(order);
       const productName = (order.product_name || '').trim();
       const key = \`\${order.delivery_date}|\${order.order_category || 'standard'}|\${receiverName}|\${productName}\`;
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
         .select(\`
           *, 
           import_orders(customer_id, receiver_name, customers:customers!import_orders_customer_id_fkey(name), profiles:received_by(full_name)), 
           vegetable_orders(customer_id, receiver_name, customers:customers!vegetable_orders_customer_id_fkey(name), profiles:received_by(full_name)), 
           delivery_vehicles(id, assigned_quantity)
         \`)
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
`.trim();

const newCode = `
  static async confirmOrders(ids: string[]) {
    // 1. Fetch the delivery orders being confirmed
    const { data: sourceOrders, error: sourceError } = await supabaseService
      .from('delivery_orders')
      .select(\`
        *, 
        import_orders(customer_id, receiver_name, receipt_image_url, receipt_image_urls, import_order_items(image_url, image_urls), customers:customers!import_orders_customer_id_fkey(name), profiles:received_by(full_name)), 
        vegetable_orders(customer_id, receiver_name, receipt_image_url, receipt_image_urls, vegetable_order_items(image_url, image_urls), customers:customers!vegetable_orders_customer_id_fkey(name), profiles:received_by(full_name))
      \`)
      .in('id', ids)
      .eq('status', 'hang_o_sg');

    if (sourceError) throw sourceError;
    if (!sourceOrders || sourceOrders.length === 0) return [];

    const getReceiverName = (o: any) => {
       const io = o.import_orders || o.vegetable_orders;
       if (!io) return '-';
       return io.customers?.name || io.receiver_name?.trim() || io.profiles?.full_name || '-';
    };

    const collectAllImages = (orders: any[]): string[] => {
      const images = new Set<string>();
      for (const o of orders) {
        if (!o) continue;
        
        // delivery_order direct images
        if (o.image_url) {
          if (typeof o.image_url === 'string' && o.image_url.includes(',')) {
            o.image_url.split(',').forEach((u: string) => images.add(u.trim()));
          } else {
            images.add(o.image_url);
          }
        }
        if (o.image_urls && Array.isArray(o.image_urls)) {
          o.image_urls.forEach((u: string) => images.add(u));
        }
        
        // linked import_order images
        const io = o.import_orders;
        if (io) {
          if (io.receipt_image_url) images.add(io.receipt_image_url);
          if (io.receipt_image_urls && Array.isArray(io.receipt_image_urls)) {
            io.receipt_image_urls.forEach((u: string) => images.add(u));
          }
          if (io.import_order_items && Array.isArray(io.import_order_items)) {
            io.import_order_items.forEach((item: any) => {
              if (item.image_url) images.add(item.image_url);
              if (item.image_urls && Array.isArray(item.image_urls)) {
                item.image_urls.forEach((u: string) => images.add(u));
              }
            });
          }
        }
        
        // linked vegetable_order images
        const vo = o.vegetable_orders;
        if (vo) {
          if (vo.receipt_image_url) images.add(vo.receipt_image_url);
          if (vo.receipt_image_urls && Array.isArray(vo.receipt_image_urls)) {
            vo.receipt_image_urls.forEach((u: string) => images.add(u));
          }
          if (vo.vegetable_order_items && Array.isArray(vo.vegetable_order_items)) {
            vo.vegetable_order_items.forEach((item: any) => {
              if (item.image_url) images.add(item.image_url);
              if (item.image_urls && Array.isArray(item.image_urls)) {
                item.image_urls.forEach((u: string) => images.add(u));
              }
            });
          }
        }
      }
      return Array.from(images).filter(Boolean);
    };

    // Group source orders by Key = \`delivery_date|order_category|receiverName|product_name\`
    const groups: Record<string, any[]> = {};
    for (const order of sourceOrders) {
       const receiverName = getReceiverName(order);
       const productName = (order.product_name || '').trim();
       const key = \`\${order.delivery_date}|\${order.order_category || 'standard'}|\${receiverName}|\${productName}\`;
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
         .select(\`
           *, 
           import_orders(customer_id, receiver_name, receipt_image_url, receipt_image_urls, import_order_items(image_url, image_urls), customers:customers!import_orders_customer_id_fkey(name), profiles:received_by(full_name)), 
           vegetable_orders(customer_id, receiver_name, receipt_image_url, receipt_image_urls, vegetable_order_items(image_url, image_urls), customers:customers!vegetable_orders_customer_id_fkey(name), profiles:received_by(full_name)), 
           delivery_vehicles(id, assigned_quantity)
         \`)
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
         
         const allImages = collectAllImages([targetOrder, ...groupOrders]);
         
         await supabaseService
           .from('delivery_orders')
           .update({ 
             total_quantity: newTotal,
             image_urls: allImages.length > 0 ? allImages : targetOrder.image_urls,
             image_url: allImages.length > 0 ? allImages[0] : targetOrder.image_url
           })
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
           
           const allImages = collectAllImages(groupOrders);
           
           await supabaseService
             .from('delivery_orders')
             .update({ 
               total_quantity: newTotal, 
               status: 'can_giao',
               image_urls: allImages.length > 0 ? allImages : firstOrder.image_urls,
               image_url: allImages.length > 0 ? allImages[0] : firstOrder.image_url
             })
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
`.trim();

if (code.includes(oldCode)) {
  fs.writeFileSync(file, code.replace(oldCode, newCode));
  console.log('Successfully updated delivery.service.ts');
} else {
  console.log('Could not find old code in delivery.service.ts');
}
