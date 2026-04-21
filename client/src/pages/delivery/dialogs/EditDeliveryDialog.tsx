import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, UploadCloud, Truck, User } from 'lucide-react';
import { useUpdateDeliveryOrder, useAssignVehicle } from '../../../hooks/queries/useDelivery';
import { useProducts } from '../../../hooks/queries/useProducts';
import { useCustomers } from '../../../hooks/queries/useCustomers';
import { useVehicles } from '../../../hooks/queries/useVehicles';
import { useEmployees } from '../../../hooks/queries/useHR';
import { importOrdersApi } from '../../../api/importOrdersApi';
import { uploadApi } from '../../../api/uploadApi';
import { CreatableSearchableSelect } from '../../../components/ui/CreatableSearchableSelect';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import type { DeliveryOrder, Product } from '../../../types';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  isClosing?: boolean;
  order: DeliveryOrder | null;
  onClose: () => void;
}

const pickRelation = <T,>(relation: any): T | undefined => {
  if (Array.isArray(relation)) return relation[0];
  return relation || undefined;
};

const getOrderPreviewImage = (order: any, localUrl?: string) => {
  if (localUrl) return localUrl;
  if (!order) return null;
  
  const directImage = order.image_url;
  if (directImage) return directImage;

  const paymentImage = order.payment_collections?.find((pc: any) => pc.image_url)?.image_url;
  if (paymentImage) return paymentImage;

  const linkedImport = pickRelation<any>(order.import_orders);
  const linkedVeg = pickRelation<any>(order.vegetable_orders);

  if (linkedImport?.receipt_image_url) return linkedImport.receipt_image_url;
  if (linkedVeg?.receipt_image_url) return linkedVeg.receipt_image_url;

  const collectFirstImage = (refs: any): string | null => {
    const list = Array.isArray(refs) ? refs : (refs ? [refs] : []);
    for (const ref of list) {
      if (ref.image_url) {
        if (typeof ref.image_url === 'string' && ref.image_url.includes(',')) return ref.image_url.split(',')[0].trim();
        if (typeof ref.image_url === 'string') return ref.image_url;
      }
      if (ref.image_urls && Array.isArray(ref.image_urls) && ref.image_urls.length > 0) {
        return ref.image_urls[0];
      }
    }
    return null;
  };

  const importItemImage = collectFirstImage(linkedImport?.import_order_items);
  if (importItemImage) return importItemImage;

  const vegItemImage = collectFirstImage(linkedVeg?.vegetable_order_items);
  if (vegItemImage) return vegItemImage;

  return null;
};

const EditDeliveryDialog: React.FC<Props> = ({ isOpen, isClosing, order, onClose }) => {
  const updateMutation = useUpdateDeliveryOrder();
  const assignMutation = useAssignVehicle();
  const { data: products } = useProducts(isOpen);
  const { data: allCustomers } = useCustomers(undefined, isOpen);
  const { data: vehicles } = useVehicles(isOpen);
  const { data: employees } = useEmployees(isOpen);

  const isDaGiao = order?.status === 'da_giao';

  const productOptions = useMemo(() => {
    if (!products) return [];
    return products.map((p: Product) => ({
      label: p.name,
      value: p.name,
    }));
  }, [products]);

  const isVeg = order?.order_category === 'vegetable' || !!order?.vegetable_order_id;

  const senderOptions = useMemo(() => {
    if (!allCustomers) return [];
    const targetType = isVeg ? 'vegetable_sender' : 'grocery_sender';
    const list = allCustomers
      .filter((c: any) => c.customer_type === targetType)
      .map((c: any) => ({
        label: `${c.name} ${c.phone ? `(${c.phone})` : ''}`,
        value: c.id,
      }));
    return list;
  }, [allCustomers, isVeg]);

  const receiverOptions = useMemo(() => {
    if (!allCustomers) return [];
    const targetType = isVeg ? 'vegetable_receiver' : 'grocery_receiver';
    const list = allCustomers
      .filter((c: any) => c.customer_type === targetType)
      .map((c: any) => ({
        label: `${c.name} ${c.phone ? `(${c.phone})` : ''}`,
        value: c.id,
      }));
    return list;
  }, [allCustomers, isVeg]);

  const [formData, setFormData] = useState({
    product_name: '',
    total_quantity: 0,
    unit_price: 0,
    delivery_date: '',
    sender_id: null as string | null,
    sender_name: '',
    customer_id: null as string | null,
    receiver_name: '',
    image_url: '',
    vehicle_id: '',
    driver_id: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (order && isOpen) {
      const displayProductName = order.product_name.includes(' - ') 
        ? order.product_name.split(' - ').slice(1).join(' - ') 
        : order.product_name;

      let uPrice = order.unit_price;
      if (!uPrice || uPrice === 0) {
         const p = products?.find((p: Product) => p.name === displayProductName);
         if (p) {
            uPrice = p.base_price || 0;
         }
      }
      if (uPrice && uPrice >= 10000) uPrice = uPrice / 1000;

      let defaultVehicleId = '';
      let defaultDriverId = '';
      if (order.delivery_vehicles && order.delivery_vehicles.length > 0) {
        defaultVehicleId = order.delivery_vehicles[0].vehicle_id || '';
        defaultDriverId = order.delivery_vehicles[0].driver_id || '';
      }

      setFormData({
        product_name: displayProductName,
        total_quantity: order.total_quantity || 0,
        unit_price: uPrice || 0,
        delivery_date: order.delivery_date || '',
        sender_id: order.import_orders?.sender_id || order.vegetable_orders?.sender_id || null,
        sender_name: order.import_orders?.sender_name || order.vegetable_orders?.sender_name || order.import_orders?.sender_customers?.name || order.vegetable_orders?.sender_customers?.name || '',
        customer_id: order.import_orders?.customer_id || order.vegetable_orders?.customer_id || null,
        receiver_name: order.import_orders?.receiver_name || order.vegetable_orders?.receiver_name || order.import_orders?.customers?.name || order.vegetable_orders?.customers?.name || '',
        image_url: (order as any).image_url || '',
        vehicle_id: defaultVehicleId,
        driver_id: defaultDriverId
      });
    }
  }, [order, isOpen, products]);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const resp = await uploadApi.uploadFile(file, 'import-orders', 'delivery-orders');
      setFormData(prev => ({ ...prev, image_url: resp.url }));
      toast.success('Tải ảnh lên thành công!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải ảnh lên');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    
    setIsSubmitting(true);
    try {
      const payload: any = {};
      
      const oldDisplayProductName = order.product_name.includes(' - ') 
        ? order.product_name.split(' - ').slice(1).join(' - ') 
        : order.product_name;

      if (formData.product_name !== oldDisplayProductName) {
         const prefix = order.product_name.includes(' - ') ? order.product_name.split(' - ')[0] + ' - ' : '';
         payload.product_name = prefix + formData.product_name;
      }

      if (formData.total_quantity !== order.total_quantity) payload.total_quantity = Number(formData.total_quantity);
      const rawPrice = Number(formData.unit_price) || 0;
      const normalizedPrice = rawPrice > 0 && rawPrice < 10000 ? rawPrice * 1000 : rawPrice;
      if (normalizedPrice !== order.unit_price) payload.unit_price = normalizedPrice;
      if (formData.delivery_date && formData.delivery_date !== order.delivery_date) payload.delivery_date = formData.delivery_date;
      if (formData.image_url && formData.image_url !== (order as any).image_url) payload.image_url = formData.image_url;

      if (Object.keys(payload).length > 0) {
        await updateMutation.mutateAsync({
          id: order.id,
          payload
        });
      }

      if (isDaGiao && formData.vehicle_id && formData.driver_id) {
        const existingVehicle = order.delivery_vehicles?.[0];
        const changedVehicle = existingVehicle?.vehicle_id !== formData.vehicle_id || existingVehicle?.driver_id !== formData.driver_id || existingVehicle?.assigned_quantity !== Number(formData.total_quantity);
        if (changedVehicle || !existingVehicle) {
          await assignMutation.mutateAsync({
            id: order.id,
            payload: {
              assignments: [{
                vehicle_id: formData.vehicle_id,
                driver_id: formData.driver_id,
                quantity: Number(formData.total_quantity),
              }]
            }
          });
        }
      }

      // Handle source order updates (Sender/Receiver)
      const sourceId = order.import_order_id || order.vegetable_order_id;
      const isVeg = !!order.vegetable_order_id;
      const orderData = order.import_orders || order.vegetable_orders;
      
      if (sourceId && orderData) {
         const changedSender = formData.sender_id !== orderData.sender_id || formData.sender_name !== orderData.sender_name;
         const changedReceiver = formData.customer_id !== orderData.customer_id || formData.receiver_name !== orderData.receiver_name;
         
         if (changedSender || changedReceiver) {
            const sourcePayload: any = {
               order_category: isVeg ? 'vegetable' : 'standard',
            };
            if (changedSender) {
               sourcePayload.sender_id = formData.sender_id || null;
               sourcePayload.sender_name = formData.sender_name || '';
            }
            if (changedReceiver) {
               sourcePayload.customer_id = formData.customer_id || null;
               sourcePayload.receiver_name = formData.receiver_name || '';
            }
            await importOrdersApi.update(sourceId, sourcePayload);
         }
      }

      toast.success('Đã cập nhật đơn hàng');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra khi cập nhật');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProductChange = (val: string) => {
     let newPrice = formData.unit_price;
     const product = products?.find((p: Product) => p.name === val);
     if (product) {
        newPrice = product.base_price || 0;
     }
     setFormData(prev => ({ ...prev, product_name: val, unit_price: newPrice }));
  };

  const handleSenderChange = (val: string, isCreate: boolean) => {
    if (isCreate) {
       setFormData(prev => ({ ...prev, sender_id: null, sender_name: val }));
    } else {
       const found = allCustomers?.find((c: any) => c.id === val);
       setFormData(prev => ({ ...prev, sender_id: val, sender_name: found?.name || '' }));
    }
  };

  const handleReceiverChange = (val: string, isCreate: boolean) => {
    if (isCreate) {
       setFormData(prev => ({ ...prev, customer_id: null, receiver_name: val }));
    } else {
       const found = allCustomers?.find((c: any) => c.id === val);
       setFormData(prev => ({ ...prev, customer_id: val, receiver_name: found?.name || '' }));
    }
  };

  const content = (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-0 md:p-4">
      <div 
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={!isSubmitting ? onClose : undefined}
      />
      
      <div className={`relative w-full h-full md:h-auto md:max-w-md bg-background md:rounded-2xl shadow-xl transition-all duration-300 overflow-hidden flex flex-col md:max-h-[90vh] ${
        isClosing ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'
      }`}>
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-bold text-foreground">Chỉnh sửa đơn hàng</h2>
          <button 
            onClick={!isSubmitting ? onClose : undefined} 
            disabled={isSubmitting}
            className="p-2 hover:bg-muted rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar">
          <form id="edit-delivery-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Ảnh đơn hàng */}
            <div className="space-y-1.5 flex justify-center mb-2">
              <label className="relative block w-24 h-24 rounded-xl bg-muted/20 border-2 border-dashed border-border cursor-pointer overflow-hidden group">
                {getOrderPreviewImage(order as DeliveryOrder, formData.image_url) ? (
                  <>
                    <img src={getOrderPreviewImage(order as DeliveryOrder, formData.image_url) || undefined} alt="Receipt" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <UploadCloud size={20} className="text-white" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                    <UploadCloud size={24} className="opacity-50 group-hover:opacity-100 mb-1" />
                    <span className="text-[10px] font-bold opacity-70">TẢI ẢNH</span>
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-card/80 flex items-center justify-center">
                    <Loader2 size={24} className="text-primary animate-spin" />
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload}
                  disabled={isSubmitting || isUploading}
                />
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-foreground">Tên hàng hóa <span className="text-red-500">*</span></label>
              <CreatableSearchableSelect
                options={productOptions}
                value={formData.product_name}
                onValueChange={handleProductChange}
                onCreate={handleProductChange}
                placeholder="Chọn hoặc nhập tên hàng..."
                className="w-full bg-card border border-border rounded-xl"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Số lượng <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  required
                  min="0.1"
                  step="0.1"
                  className="w-full h-11 px-3 border border-border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                  value={formData.total_quantity}
                  onChange={e => setFormData({ ...formData, total_quantity: parseFloat(e.target.value) || 0 })}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Đơn giá</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-full h-11 px-3 border border-border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                  value={formData.unit_price}
                  onChange={e => setFormData({ ...formData, unit_price: parseInt(e.target.value) || 0 })}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-foreground">{isVeg ? 'Người gửi (Chủ hàng)' : 'Người gửi'}</label>
              <CreatableSearchableSelect
                options={senderOptions}
                value={formData.sender_id || formData.sender_name}
                fallbackLabel={formData.sender_name}
                onValueChange={(val) => handleSenderChange(val, false)}
                onCreate={(val) => handleSenderChange(val, true)}
                placeholder="Chọn hoặc tạo người gửi..."
                className="w-full bg-card border border-border rounded-xl"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-foreground">{isVeg ? 'Người nhận (Tên vựa)' : 'Người nhận'}</label>
              <CreatableSearchableSelect
                options={receiverOptions}
                value={formData.customer_id || formData.receiver_name}
                fallbackLabel={formData.receiver_name}
                onValueChange={(val) => handleReceiverChange(val, false)}
                onCreate={(val) => handleReceiverChange(val, true)}
                placeholder="Chọn hoặc tạo người nhận..."
                className="w-full bg-card border border-border rounded-xl"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-foreground">Ngày giao</label>
              <input
                type="date"
                className="w-full h-11 px-3 border border-border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                value={formData.delivery_date}
                onChange={e => setFormData({ ...formData, delivery_date: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            {isDaGiao && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-foreground flex items-center gap-1">
                    <Truck size={14} className="text-primary" /> Xe
                  </label>
                  <SearchableSelect
                    options={(vehicles || []).map(v => ({
                      value: v.id,
                      label: `${v.license_plate} ${v.profiles?.full_name ? '(' + v.profiles.full_name + ')' : ''}`,
                      selectedLabel: v.license_plate
                    }))}
                    value={formData.vehicle_id}
                    onValueChange={(val: string) => {
                      setFormData(prev => ({ ...prev, vehicle_id: val }));
                      const vehicle = vehicles?.find(v => v.id === val);
                      if (vehicle?.driver_id || vehicle?.in_charge_id) {
                        setFormData(prev => ({ ...prev, driver_id: vehicle.driver_id || vehicle.in_charge_id || '' }));
                      }
                    }}
                    placeholder="Chọn xe..."
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-foreground flex items-center gap-1">
                    <User size={14} className="text-primary" /> Tài xế
                  </label>
                  <SearchableSelect
                    options={(employees || []).filter(e => e.role === 'driver' || e.role?.toLowerCase().includes('tài xế') || e.role?.toLowerCase().includes('tai xe') || e.role?.toLowerCase().includes('tai_xe') || e.role?.toLowerCase().includes('lơ xe') || e.role?.toLowerCase().includes('lo xe') || e.role?.toLowerCase().includes('lo_xe')).map(e => ({ value: e.id, label: e.full_name }))}
                    value={formData.driver_id}
                    onValueChange={(val: string) => setFormData(prev => ({ ...prev, driver_id: val }))}
                    placeholder="Chọn tài xế..."
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="p-4 border-t border-border shrink-0 bg-muted/50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-[14px] font-bold text-muted-foreground bg-card border border-border rounded-xl hover:bg-muted transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            form="edit-delivery-form"
            type="submit"
            disabled={isSubmitting}
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

export default EditDeliveryDialog;