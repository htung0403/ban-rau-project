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

const pickFirstImage = (...candidates: Array<string | null | undefined>): string | null => {
  const firstValid = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0);
  return firstValid || null;
};

const OrderImagesDialog: React.FC<Props> = ({ isOpen, isClosing, order, onClose }) => {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  if (!isOpen && !isClosing) return null;

  const isDelivery = isDeliveryOrder(order);
  const isImport = isImportOrder(order);
  const isExport = isExportOrder(order);

  let importImage: string | null = null;
  let deliveryImage: string | null = null;
  let orderCode = 'N/A';
  let orderLabel = '';

  if (isDelivery) {
    const dOrder = order;
    const linkedImportOrder = pickRelation(dOrder?.import_orders);
    const linkedVegetableOrder = pickRelation(dOrder?.vegetable_orders);

    importImage = pickFirstImage(
      linkedImportOrder?.receipt_image_url,
      linkedVegetableOrder?.receipt_image_url,
      linkedImportOrder?.import_order_items?.find((item) => item?.image_url)?.image_url,
      linkedVegetableOrder?.vegetable_order_items?.find((item) => item?.image_url)?.image_url,
    );
    deliveryImage = pickFirstImage(
      dOrder?.image_url,
      dOrder?.payment_collections?.find((pc) => pc?.image_url)?.image_url,
    );
    orderCode = linkedImportOrder?.order_code || linkedVegetableOrder?.order_code || 'N/A';
    orderLabel = dOrder?.product_name || orderCode;
  } else if (isImport) {
    const iOrder = order;
    importImage = iOrder?.receipt_image_url || iOrder?.import_order_items?.find((item) => item?.image_url)?.image_url || null;
    deliveryImage = iOrder?.delivery_orders?.find((d) => d.image_url)?.image_url || null;
    orderCode = iOrder?.order_code || 'N/A';
    orderLabel = iOrder?.supplier_name || iOrder?.sender_name || orderCode;
  } else if (isExport) {
    const eOrder = order;
    deliveryImage = eOrder?.image_url || null;
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
          {/* Ảnh Nhập Hàng */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Package size={18} />
              <span>Nhập hàng</span>
            </div>
            <div 
              className={clsx(
                "relative bg-slate-50 border border-border rounded-2xl overflow-hidden flex flex-col group",
                importImage ? "cursor-pointer" : "h-[220px] items-center justify-center"
              )}
              onClick={() => importImage && setFullscreenImage(importImage)}
            >
              {importImage ? (
                <>
                  <img src={importImage} alt="Biên nhận nhập hàng" className="w-full object-cover max-h-[300px]" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn size={40} className="text-white drop-shadow-lg" />
                  </div>
                </>
              ) : (
                <div className="text-slate-400 flex flex-col items-center gap-2">
                  <ImageIcon size={40} className="opacity-20" />
                  <p className="text-sm font-medium">Không có ảnh biên nhận mở đơn</p>
                </div>
              )}
            </div>
          </div>

          {/* Vạch chia luân chuyển */}
          <div className="hidden sm:flex items-center justify-center text-slate-300">
             <div className="w-px h-full bg-slate-200" />
          </div>

          {/* Ảnh Xuất/Giao Hàng */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 text-orange-500 font-bold">
              <Truck size={18} />
              <span>Xuất / Giao xe</span>
            </div>
            <div 
              className={clsx(
                "relative bg-slate-50 border border-border rounded-2xl overflow-hidden flex flex-col group",
                deliveryImage ? "cursor-pointer" : "h-[250px] items-center justify-center"
              )}
              onClick={() => deliveryImage && setFullscreenImage(deliveryImage)}
            >
              {deliveryImage ? (
                <>
                  <img src={deliveryImage} alt="Ảnh giao / xuất kho" className="w-full object-cover max-h-[300px]" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn size={40} className="text-white drop-shadow-lg" />
                  </div>
                </>
              ) : (
                <div className="text-slate-400 flex flex-col items-center gap-2">
                  <ImageIcon size={40} className="opacity-20" />
                  <p className="text-sm font-medium">Không có ảnh hàng hóa</p>
                </div>
              )}
            </div>
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
