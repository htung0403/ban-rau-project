import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, UploadCloud } from 'lucide-react';
import { useUpdateDeliveryOrder } from '../../../hooks/queries/useDelivery';
import { useProducts } from '../../../hooks/queries/useProducts';
import { CreatableSearchableSelect } from '../../../components/ui/CreatableSearchableSelect';
import { uploadApi } from '../../../api/uploadApi';
import type { DeliveryOrder, Product } from '../../../types';
import { useCustomers } from '../../../hooks/queries/useCustomers';
import { importOrdersApi } from '../../../api/importOrdersApi';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  isClosing?: boolean;
  orders: DeliveryOrder[];
  hideImage?: boolean;
  onClose: () => void;
}

const getOrderPreviewImage = (order: DeliveryOrder, localUrl?: string) => {
  if (localUrl) return localUrl;
  const directImage = (order as DeliveryOrder & { image_url?: string }).image_url;
  const importReceipt = (order.import_orders as { receipt_image_url?: string } | undefined)?.receipt_image_url;
  const vegetableReceipt = (order.vegetable_orders as { receipt_image_url?: string } | undefined)?.receipt_image_url;

  const firstImportItemImage = (order.import_orders as any)?.import_order_items?.find((i: any) => i.image_url)?.image_url;
  const firstVegetableItemImage = (order.vegetable_orders as any)?.vegetable_order_items?.find((i: any) => i.image_url)?.image_url;

  return (
    directImage ||
    order.payment_collections?.find((pc) => pc.image_url)?.image_url ||
    importReceipt ||
    vegetableReceipt ||
    firstImportItemImage ||
    firstVegetableItemImage ||
    null
  );
};

const formatAmount = (val?: number) => {
  if (val == null) return '0';
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
};

const BulkEditDeliveryDialog: React.FC<Props> = ({ isOpen, isClosing, orders, hideImage = false, onClose }) => {
  const updateMutation = useUpdateDeliveryOrder();
  const { data: products } = useProducts(isOpen);
  const { data: allCustomers } = useCustomers(undefined, isOpen);

  const productOptions = useMemo(() => {
    if (!products) return [];
    return products.map((p: Product) => ({
      label: p.name,
      value: p.name,
    }));
  }, [products]);

  const isVeg = orders.length > 0 && (orders[0].order_category === 'vegetable' || !!orders[0].vegetable_order_id);

  const senderOptions = useMemo(() => {
    if (!allCustomers) return [];
    const targetType = isVeg ? 'vegetable_sender' : 'grocery_sender';
    return allCustomers
      .filter((c: any) => c.customer_type === targetType)
      .map((c: any) => ({
        label: `${c.name} ${c.phone ? `(${c.phone})` : ''}`,
        value: c.id,
      }));
  }, [allCustomers, isVeg]);

  const receiverOptions = useMemo(() => {
    if (!allCustomers) return [];
    const targetType = isVeg ? 'vegetable_receiver' : 'grocery_receiver';
    return allCustomers
      .filter((c: any) => c.customer_type === targetType)
      .map((c: any) => ({
        label: `${c.name} ${c.phone ? `(${c.phone})` : ''}`,
        value: c.id,
      }));
  }, [allCustomers, isVeg]);

  const [editData, setEditData] = useState<Record<string, { product_name: string; total_quantity: number; unit_price: number; image_url?: string; sender_id?: string | null; sender_name?: string; customer_id?: string | null; receiver_name?: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isOpen) {
      if (orders && orders.length > 0 && products && !isInitialized.current) {
        const initial: any = {};
        orders.forEach(o => {
          const displayProductName = o.product_name.includes(' - ') 
            ? o.product_name.split(' - ').slice(1).join(' - ') 
            : o.product_name;

          let uPrice = o.unit_price;
          if (!uPrice || uPrice === 0) {
             const p = products?.find((p: Product) => p.name === displayProductName);
             if (p) {
                uPrice = p.base_price || 0;
             }
          }

          initial[o.id] = {
            product_name: displayProductName,
            total_quantity: o.total_quantity || 0,
            unit_price: uPrice || 0,
            image_url: (o as any).image_url || '',
            sender_id: o.import_orders?.sender_id || o.vegetable_orders?.sender_id || null,
            sender_name: o.import_orders?.sender_name || o.vegetable_orders?.sender_name || o.import_orders?.sender_customers?.name || o.vegetable_orders?.sender_customers?.name || '',
            customer_id: o.import_orders?.customer_id || o.vegetable_orders?.customer_id || null,
            receiver_name: o.import_orders?.receiver_name || o.vegetable_orders?.receiver_name || o.import_orders?.customers?.name || o.vegetable_orders?.customers?.name || ''
          };
        });
        setEditData(initial);
        isInitialized.current = true;
      }
    } else {
      isInitialized.current = false;
    }
  }, [isOpen, orders, products, allCustomers]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orders.length === 0) return;

    setIsSubmitting(true);
    try {
      const sourceOrderUpdates: Record<string, any> = {};

      await Promise.all(
        orders.map(order => {
          const current = editData[order.id];
          if (!current) return Promise.resolve();

          // Prepare source order updates
          const sourceId = order.import_order_id || order.vegetable_order_id;
          const isVeg = !!order.vegetable_order_id;
          const orderData = order.import_orders || order.vegetable_orders;
          
          if (sourceId && orderData) {
             const changedSender = current.sender_id !== orderData.sender_id || current.sender_name !== orderData.sender_name;
             const changedReceiver = current.customer_id !== orderData.customer_id || current.receiver_name !== orderData.receiver_name;
             
             if (changedSender || changedReceiver) {
                if (!sourceOrderUpdates[sourceId]) {
                   sourceOrderUpdates[sourceId] = {
                      order_category: isVeg ? 'vegetable' : 'standard',
                   };
                }
                if (changedSender) {
                   sourceOrderUpdates[sourceId].sender_id = current.sender_id || null;
                   sourceOrderUpdates[sourceId].sender_name = current.sender_name || '';
                }
                if (changedReceiver) {
                   sourceOrderUpdates[sourceId].customer_id = current.customer_id || null;
                   sourceOrderUpdates[sourceId].receiver_name = current.receiver_name || '';
                }
             }
          }

          // Only send payload if values actually changed to avoid unnecessary updates
          const payload: any = {};
          
          const oldDisplayProductName = order.product_name.includes(' - ') 
            ? order.product_name.split(' - ').slice(1).join(' - ') 
            : order.product_name;

          if (current.product_name !== oldDisplayProductName) {
             const prefix = order.product_name.includes(' - ') ? order.product_name.split(' - ')[0] + ' - ' : '';
             payload.product_name = prefix + current.product_name;
          }

          if (current.total_quantity !== order.total_quantity) payload.total_quantity = current.total_quantity;
          if (current.unit_price !== order.unit_price) payload.unit_price = current.unit_price;
          if (current.image_url && current.image_url !== (order as any).image_url) payload.image_url = current.image_url;

          if (Object.keys(payload).length > 0) {
            return updateMutation.mutateAsync({
              id: order.id,
              payload
            });
          }
          return Promise.resolve();
        })
      );

      // Execute source order updates
      const sourceUpdatePromises = Object.entries(sourceOrderUpdates).map(([sourceId, updatePayload]) => {
         return importOrdersApi.update(sourceId, updatePayload);
      });
      if (sourceUpdatePromises.length > 0) {
         await Promise.all(sourceUpdatePromises);
      }

      toast.success(`Đã cập nhật ${orders.length} đơn hàng`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra khi cập nhật');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateRow = (id: string, field: string, value: any) => {
    setEditData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const handleImageUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 10MB');
      return;
    }

    setUploadingImageId(id);
    try {
      const resp = await uploadApi.uploadFile(file, 'import-orders', 'delivery-orders');
      updateRow(id, 'image_url', resp.url);
      toast.success('Tải ảnh lên thành công!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải ảnh lên');
    } finally {
      setUploadingImageId(null);
      e.target.value = '';
    }
  };

  const handleProductChange = (id: string, val: string) => {
     updateRow(id, 'product_name', val);
     const product = products?.find((p: Product) => p.name === val);
     if (product) {
        updateRow(id, 'unit_price', product.base_price || 0);
     }
  };

  const handleSenderChange = (id: string, val: string, isCreate: boolean) => {
    if (isCreate) {
       updateRow(id, 'sender_id', null);
       updateRow(id, 'sender_name', val);
    } else {
       updateRow(id, 'sender_id', val);
       const found = allCustomers?.find((c: any) => c.id === val);
       updateRow(id, 'sender_name', found?.name || '');
    }
  };

  const handleReceiverChange = (id: string, val: string, isCreate: boolean) => {
    if (isCreate) {
       updateRow(id, 'customer_id', null);
       updateRow(id, 'receiver_name', val);
    } else {
       updateRow(id, 'customer_id', val);
       const found = allCustomers?.find((c: any) => c.id === val);
       updateRow(id, 'receiver_name', found?.name || '');
    }
  };

  const content = (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div 
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={!isSubmitting ? onClose : undefined}
      />
      
      <div className={`relative w-full max-w-5xl bg-white rounded-2xl shadow-xl transition-all duration-300 overflow-hidden flex flex-col max-h-[90vh] ${
        isClosing ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'
      }`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800">Sửa hàng loạt</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[12px] font-bold">
              {orders.length} đơn hàng
            </span>
          </div>
          <button 
            onClick={!isSubmitting ? onClose : undefined} 
            disabled={isSubmitting}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
          <form id="bulk-edit-form" onSubmit={handleSubmit} className="min-w-[800px]">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
                <tr>
                  {!hideImage && (
                    <th className="px-4 py-3 text-[12px] font-bold text-slate-600 uppercase tracking-wide text-left w-16">Ảnh</th>
                  )}
                  <th className="px-4 py-3 text-[12px] font-bold text-slate-600 uppercase tracking-wide text-left min-w-[150px]">{isVeg ? 'Người gửi (Chủ hàng)' : 'Người gửi'}</th>
                  <th className="px-4 py-3 text-[12px] font-bold text-slate-600 uppercase tracking-wide text-left min-w-[150px]">{isVeg ? 'Người nhận (Tên vựa)' : 'Người nhận'}</th>
                  <th className="px-4 py-3 text-[12px] font-bold text-slate-600 uppercase tracking-wide text-left min-w-[200px]">Tên hàng hóa <span className="text-red-500">*</span></th>
                  <th className="px-4 py-3 text-[12px] font-bold text-slate-600 uppercase tracking-wide text-left w-24">Số lượng <span className="text-red-500">*</span></th>
                  <th className="px-4 py-3 text-[12px] font-bold text-slate-600 uppercase tracking-wide text-left w-32">Đơn giá</th>
                  <th className="px-4 py-3 text-[12px] font-bold text-slate-600 uppercase tracking-wide text-right w-32">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {orders.map(order => {
                  const rowData = editData[order.id];
                  if (!rowData) return null;
                  
                  const amount = (rowData.total_quantity || 0) * (rowData.unit_price || 0);
                  const previewImage = getOrderPreviewImage(order, rowData.image_url);

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      {!hideImage && (
                        <td className="px-4 py-3">
                          <label className="relative block w-10 h-10 rounded-lg bg-muted/20 border border-border cursor-pointer overflow-hidden group">
                            {previewImage ? (
                              <>
                                <img src={previewImage} alt="Receipt" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <UploadCloud size={16} className="text-white" />
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                <UploadCloud size={16} className="opacity-50 group-hover:opacity-100" />
                              </div>
                            )}
                            {uploadingImageId === order.id && (
                               <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                  <Loader2 size={16} className="text-primary animate-spin" />
                               </div>
                            )}
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handleImageUpload(order.id, e)}
                              disabled={isSubmitting || uploadingImageId === order.id}
                            />
                          </label>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <CreatableSearchableSelect
                          options={senderOptions}
                          value={rowData.sender_id || rowData.sender_name}
                          fallbackLabel={rowData.sender_name}
                          onValueChange={(val) => handleSenderChange(order.id, val, false)}
                          onCreate={(val) => handleSenderChange(order.id, val, true)}
                          placeholder="Chọn người gửi..."
                          className="w-full bg-white border border-slate-200 rounded-xl min-w-[120px]"
                          disabled={isSubmitting}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <CreatableSearchableSelect
                          options={receiverOptions}
                          value={rowData.customer_id || rowData.receiver_name}
                          fallbackLabel={rowData.receiver_name}
                          onValueChange={(val) => handleReceiverChange(order.id, val, false)}
                          onCreate={(val) => handleReceiverChange(order.id, val, true)}
                          placeholder="Chọn người nhận..."
                          className="w-full bg-white border border-slate-200 rounded-xl min-w-[120px]"
                          disabled={isSubmitting}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <CreatableSearchableSelect
                          options={productOptions}
                          value={rowData.product_name}
                          onValueChange={(val) => handleProductChange(order.id, val)}
                          onCreate={(val) => handleProductChange(order.id, val)}
                          placeholder="Nhập tên hàng..."
                          className="w-full bg-white border border-slate-200 rounded-xl"
                          disabled={isSubmitting}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          required
                          min="0.1"
                          step="0.1"
                          className="w-full h-11 px-3 border border-slate-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                          value={rowData.total_quantity}
                          onChange={e => updateRow(order.id, 'total_quantity', parseFloat(e.target.value) || 0)}
                          disabled={isSubmitting}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          className="w-full h-11 px-3 border border-slate-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                          value={rowData.unit_price}
                          onChange={e => updateRow(order.id, 'unit_price', parseInt(e.target.value) || 0)}
                          disabled={isSubmitting}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[14px] font-bold text-slate-700">
                          {formatAmount(amount)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </form>
        </div>

        <div className="p-4 border-t border-slate-100 shrink-0 bg-white flex justify-end gap-2 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] z-20">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-[14px] font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            form="bulk-edit-form"
            type="submit"
            disabled={isSubmitting || orders.length === 0}
            className="px-4 py-2.5 text-[14px] font-bold text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default BulkEditDeliveryDialog;