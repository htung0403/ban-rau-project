import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Image as ImageIcon, Package, Truck, ZoomIn } from 'lucide-react';
import { clsx } from 'clsx';
import type { DeliveryOrder, ImportOrder, ExportOrder } from '../../../types';

interface Props {
  isOpen: boolean;
  isClosing: boolean;
  order: DeliveryOrder | ImportOrder | ExportOrder | null;
  onClose: () => void;
}

type OrderImageRef = {
  image_url?: string | null;
  image_urls?: string[] | null;
};

type MaybeArray<T> = T | T[] | null | undefined;

type LinkedImportOrder = {
  order_code?: string;
  receipt_image_url?: string | null;
  import_order_items?: OrderImageRef[];
  vegetable_order_items?: OrderImageRef[];
};

type DeliveryOrderLike = DeliveryOrder & {
  image_url?: string | null;
  import_orders?: MaybeArray<LinkedImportOrder>;
  vegetable_orders?: MaybeArray<LinkedImportOrder>;
  payment_collections?: Array<{ image_url?: string | null }>;
};

type ImportOrderLike = ImportOrder & {
  delivery_orders?: OrderImageRef[];
};

type ExportOrderLike = ExportOrder & {
  product_name?: string | null;
};

const isDeliveryOrder = (value: Props['order']): value is DeliveryOrderLike => {
  return Boolean(value && 'delivery_date' in value);
};

const isImportOrder = (value: Props['order']): value is ImportOrderLike => {
  return Boolean(value && 'order_code' in value && !('delivery_date' in value));
};

const isExportOrder = (value: Props['order']): value is ExportOrderLike => {
  return Boolean(value && 'export_date' in value);
};

const pickRelation = <T,>(relation: MaybeArray<T>): T | undefined => {
  if (Array.isArray(relation)) return relation[0];
  return relation || undefined;
};



const OrderImagesDialog: React.FC<Props> = ({ isOpen, isClosing, order, onClose }) => {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  if (!isOpen && !isClosing) return null;

  const isDelivery = isDeliveryOrder(order);
  const isImport = isImportOrder(order);
  const isExport = isExportOrder(order);

  let importImages: string[] = [];
  let deliveryImages: string[] = [];
  let orderCode = 'N/A';
  let orderLabel = '';

  const collectImages = (refs: MaybeArray<OrderImageRef> | OrderImageRef[]): string[] => {
    const list = Array.isArray(refs) ? refs : (refs ? [refs] : []);
    const urls: string[] = [];
    list.forEach(ref => {
      if (ref.image_url) {
        if (ref.image_url.includes(',')) urls.push(...ref.image_url.split(',').map((s: string) => s.trim()));
        else urls.push(ref.image_url);
      }
      if (ref.image_urls) urls.push(...ref.image_urls);
    });
    return [...new Set(urls)].filter(u => typeof u === 'string' && u.trim().length > 0);
  };

  if (isDelivery) {
    const dOrder = order;
    const linkedImportOrder = pickRelation(dOrder?.import_orders);
    const linkedVegetableOrder = pickRelation(dOrder?.vegetable_orders);

    importImages = [];
    if (linkedImportOrder?.receipt_image_url) importImages.push(linkedImportOrder.receipt_image_url);
    if (linkedVegetableOrder?.receipt_image_url) importImages.push(linkedVegetableOrder.receipt_image_url);
    importImages.push(...collectImages(linkedImportOrder?.import_order_items));
    importImages.push(...collectImages(linkedVegetableOrder?.vegetable_order_items));

    deliveryImages = [];
    if (dOrder?.image_url) deliveryImages.push(dOrder.image_url);
    dOrder?.payment_collections?.forEach(pc => {
        if (pc.image_url) deliveryImages.push(pc.image_url);
    });

    importImages = [...new Set(importImages)];
    deliveryImages = [...new Set(deliveryImages)];

    orderCode = linkedImportOrder?.order_code || linkedVegetableOrder?.order_code || 'N/A';
    orderLabel = dOrder?.product_name || orderCode;
  } else if (isImport) {
    const iOrder = order;
    importImages = [];
    if (iOrder.receipt_image_url) importImages.push(iOrder.receipt_image_url);
    importImages.push(...collectImages(iOrder.import_order_items));
    importImages = [...new Set(importImages)];

    deliveryImages = collectImages(iOrder.delivery_orders);
    
    orderCode = iOrder?.order_code || 'N/A';
    orderLabel = iOrder?.supplier_name || iOrder?.sender_name || orderCode;
  } else if (isExport) {
    const eOrder = order;
    deliveryImages = eOrder?.image_url ? [eOrder.image_url] : [];
    orderCode = eOrder?.id?.slice(0, 8).toUpperCase() || 'N/A';
    orderLabel = eOrder?.product_name || eOrder?.products?.name || 'Xuất hàng';
  }

  // Nếu là đơn xuất, ẩn phần Giai đoạn 1 đi cho đẹp
  const hidePhase1 = isExport;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-stretch justify-end sm:p-4">
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/40 backdrop-blur-sm transition-all duration-350 ease-out',
          isClosing ? 'opacity-0' : 'animate-in fade-in duration-300'
        )}
        onClick={onClose}
      />

      {/* Dialog Container */}
      <div
        className={clsx(
          'relative w-full bg-white flex flex-col transition-all duration-350',
          'max-h-[100dvh] sm:max-h-[90vh] min-h-0',
          hidePhase1 ? 'sm:max-w-[450px]' : 'sm:max-w-[800px]',
          'rounded-t-[32px] sm:rounded-3xl shadow-2xl',
          isClosing
            ? 'animate-out slide-out-to-right-full duration-300 opacity-0'
            : 'animate-in slide-in-from-right-full duration-300'
        )}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-white border-b border-border flex items-center justify-between shrink-0 sm:rounded-t-3xl shadow-sm z-10 pb-safe-top">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <ImageIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Ảnh hàng hóa
              </h2>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider line-clamp-1 max-w-[250px] sm:max-w-[350px]">
                {orderCode} - {orderLabel}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0 flex flex-col sm:flex-row gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Package size={18} />
              <span>Nhập hàng ({importImages.length})</span>
            </div>
            
            {importImages.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {importImages.map((img, idx) => (
                  <div 
                    key={idx}
                    className="relative bg-slate-50 border border-border rounded-xl overflow-hidden flex flex-col group cursor-pointer aspect-video sm:aspect-square"
                    onClick={() => setFullscreenImage(img)}
                  >
                    <img src={img} alt={`Nhập hàng ${idx}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn size={24} className="text-white drop-shadow-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] bg-slate-50 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-2">
                <ImageIcon size={40} className="opacity-20" />
                <p className="text-sm font-medium">Không có ảnh nhập hàng</p>
              </div>
            )}
          </div>

          {/* Vạch chia luân chuyển */}
          <div className="hidden sm:flex items-center justify-center text-slate-300">
             <div className="w-px h-full bg-slate-200" />
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 text-orange-500 font-bold">
              <Truck size={18} />
              <span>Xuất / Giao xe ({deliveryImages.length})</span>
            </div>

            {deliveryImages.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {deliveryImages.map((img, idx) => (
                  <div 
                    key={idx}
                    className="relative bg-slate-50 border border-border rounded-xl overflow-hidden flex flex-col group cursor-pointer aspect-video sm:aspect-square"
                    onClick={() => setFullscreenImage(img)}
                  >
                    <img src={img} alt={`Giao hàng ${idx}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn size={24} className="text-white drop-shadow-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] bg-slate-50 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-2">
                <ImageIcon size={40} className="opacity-20" />
                <p className="text-sm font-medium">Không có ảnh hàng hóa</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 sm:p-6 bg-slate-50 border-t border-border shrink-0 rounded-b-[32px] sm:rounded-b-3xl pb-safe-bottom">
          <button 
            type="button" 
            onClick={onClose} 
            className="w-full py-3 rounded-xl border border-border bg-white hover:bg-slate-50 text-foreground text-[14px] font-bold transition-all shadow-sm"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Fullscreen Overlay */}
      {fullscreenImage && (
        <div 
           className="fixed inset-0 z-[10000] bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-200"
           onClick={() => setFullscreenImage(null)}
        >
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
          >
            <X size={20} />
          </button>
          <img
            src={fullscreenImage}
            alt="View full"
            className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>,
    document.body
  );
};

export default OrderImagesDialog;
