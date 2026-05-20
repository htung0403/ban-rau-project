import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImagePlus, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import ErrorState from '../../components/shared/ErrorState';
import { useAuth } from '../../context/AuthContext';
import { useCustomerByUserId, useCreateMyOrder, useMyOrderProducts, useMyOrders, useUpdateMyOrder } from '../../hooks/queries/useCustomers';
import { useMyPermissions } from '../../hooks/queries/useRoles';
import { uploadApi } from '../../api/uploadApi';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import type { Customer, ImportOrder, ImportOrderItem } from '../../types';

const CUSTOMER_ORDER_CREATE_PATH = '/tai-khoan/don-hang/tao-don';

const getToday = () => new Date().toISOString().slice(0, 10);
const getCurrentTime = () => new Date().toTimeString().slice(0, 5);
const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

type FormState = {
  order_date: string;
  order_time: string;
  sender_name: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  total_amount: string;
  notes: string;
  items: CustomerOrderItemForm[];
};

type CustomerOrderItemForm = {
  product_id: string;
  package_type: string;
  item_note: string;
  weight_kg: string;
  quantity: string;
  unit_price: string;
  image_url: string | null;
  image_urls: string[];
};

const createInitialItem = (): CustomerOrderItemForm => ({
  product_id: '',
  package_type: '',
  item_note: '',
  weight_kg: '',
  quantity: '1',
  unit_price: '',
  image_url: null,
  image_urls: [],
});

const createInitialFormState = (): FormState => ({
  order_date: getToday(),
  order_time: getCurrentTime(),
  sender_name: '',
  receiver_name: '',
  receiver_phone: '',
  receiver_address: '',
  total_amount: '',
  notes: '',
  items: [createInitialItem()],
});

const getCustomerOrderPolicy = (customerType?: Customer['customer_type']) => {
  if (customerType === 'grocery_sender') return { orderCategory: 'standard' as const, binding: 'sender' as const };
  if (customerType === 'grocery_receiver') return { orderCategory: 'standard' as const, binding: 'receiver' as const };
  if (customerType === 'vegetable_sender') return { orderCategory: 'vegetable' as const, binding: 'sender' as const };
  if (customerType === 'vegetable_receiver') return { orderCategory: 'vegetable' as const, binding: 'receiver' as const };
  return null;
};

const toFormItem = (item?: ImportOrderItem): CustomerOrderItemForm => ({
  product_id: item?.product_id || '',
  package_type: item?.package_type || '',
  item_note: item?.item_note || '',
  weight_kg: item?.weight_kg != null ? String(item.weight_kg) : '',
  quantity: item?.quantity != null ? String(item.quantity) : '1',
  unit_price: item?.unit_price != null ? String(item.unit_price) : '',
  image_url: item?.image_url || null,
  image_urls: item?.image_urls || (item?.image_url ? [item.image_url] : []),
});

const MyOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const { data: customer, isLoading: loadingCustomer } = useCustomerByUserId(user?.id || '');
  const { data: orders, isLoading, isError, refetch } = useMyOrders(!!user?.id);
  const { data: myPermissions } = useMyPermissions(!!user?.id);
  const createOrderMutation = useCreateMyOrder();
  const updateOrderMutation = useUpdateMyOrder();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ImportOrder | null>(null);
  const [formState, setFormState] = useState<FormState>(createInitialFormState());
  const [uploadingItemIndex, setUploadingItemIndex] = useState<number | null>(null);

  const orderPolicy = getCustomerOrderPolicy(customer?.customer_type);
  const isSenderCustomer = orderPolicy?.binding === 'sender';
  const orderCategory = orderPolicy?.orderCategory || 'standard';
  const isVegetableOrder = orderCategory === 'vegetable';
  const { data: products } = useMyOrderProducts(isCreateOpen);
  const canSelfCreate = (myPermissions?.page_paths || []).includes(CUSTOMER_ORDER_CREATE_PATH);
  const productOptions = useMemo(
    () => (products || []).map((product) => ({ value: product.id, label: product.name, searchText: product.name })),
    [products],
  );
  const productsById = useMemo(() => new Map((products || []).map((product) => [product.id, product])), [products]);
  const calculatedVegetableTotal = useMemo(() => {
    if (!isVegetableOrder) return 0;
    return formState.items.reduce((total, item) => {
      const product = productsById.get(item.product_id);
      const quantity = Number(item.quantity) || 0;
      const unitPrice = item.unit_price ? Number(item.unit_price) : Number(product?.base_price) || 0;
      return total + (Number.isFinite(unitPrice) ? unitPrice : 0) * quantity;
    }, 0);
  }, [formState.items, isVegetableOrder, productsById]);

  const sortedOrders = useMemo(() => {
    if (!orders) return [];
    return [...orders].sort(
      (a, b) =>
        new Date(b.order_date).getTime() - new Date(a.order_date).getTime() ||
        new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime(),
    );
  }, [orders]);

  const openCreateModal = () => {
    setEditingOrder(null);
    setFormState(createInitialFormState());
    setIsCreateOpen(true);
  };

  const openEditModal = (order: ImportOrder) => {
    setEditingOrder(order);
    setIsCreateOpen(true);
    setFormState({
      order_date: order.order_date || getToday(),
      order_time: order.order_time || getCurrentTime(),
      sender_name: order.sender_name || '',
      receiver_name: order.receiver_name || '',
      receiver_phone: order.receiver_phone || '',
      receiver_address: order.receiver_address || '',
      total_amount: order.total_amount != null ? String(order.total_amount) : '',
      notes: order.notes || '',
      items: order.import_order_items?.length ? order.import_order_items.map(toFormItem) : [createInitialItem()],
    });
  };

  const closeModal = () => {
    if (createOrderMutation.isPending || updateOrderMutation.isPending) return;
    setIsCreateOpen(false);
    setEditingOrder(null);
  };

  const updateItem = (index: number, patch: Partial<CustomerOrderItemForm>) => {
    setFormState((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  };

  const addItem = () => {
    setFormState((prev) => ({ ...prev, items: [...prev.items, createInitialItem()] }));
  };

  const removeItem = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, itemIndex) => itemIndex !== index) : prev.items,
    }));
  };

  const uploadFiles = async (files: File[], folder: 'orders' | 'items') => {
    const invalidFile = files.find((file) => !file.type.startsWith('image/'));
    if (invalidFile) {
      toast.error('Chỉ hỗ trợ file ảnh');
      return [];
    }

    const results = await Promise.all(files.map((file) => uploadApi.uploadFile(file, 'import-orders', folder)));
    return results.map((result) => result.url);
  };

  const handleItemUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    try {
      setUploadingItemIndex(index);
      const newUrls = await uploadFiles(files, 'items');
      if (newUrls.length > 0) {
        setFormState((prev) => ({
          ...prev,
          items: prev.items.map((item, itemIndex) => {
            if (itemIndex !== index) return item;
            const imageUrls = [...item.image_urls, ...newUrls];
            return { ...item, image_urls: imageUrls, image_url: imageUrls[0] || null };
          }),
        }));
        toast.success('Tải ảnh hàng thành công');
      }
    } catch {
      toast.error('Lỗi khi tải ảnh hàng');
    } finally {
      setUploadingItemIndex(null);
      event.target.value = '';
    }
  };

  const removeItemImage = (itemIndex: number, imageIndex: number) => {
    setFormState((prev) => ({
      ...prev,
      items: prev.items.map((item, currentIndex) => {
        if (currentIndex !== itemIndex) return item;
        const imageUrls = item.image_urls.filter((_, currentImageIndex) => currentImageIndex !== imageIndex);
        return { ...item, image_urls: imageUrls, image_url: imageUrls[0] || null };
      }),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validItems = formState.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      weight_kg: item.weight_kg ? Number(item.weight_kg) : null,
      unit_price: isVegetableOrder
        ? item.unit_price ? Number(item.unit_price) : Number(productsById.get(item.product_id)?.base_price) || 0
        : item.unit_price ? Number(item.unit_price) : null,
    }));

    if (validItems.some((item) => !item.product_id || !Number.isFinite(item.quantity) || item.quantity <= 0)) {
      toast.error('Vui lòng chọn mặt hàng và nhập số lượng lớn hơn 0');
      return;
    }

    const payload = {
      order_date: formState.order_date || undefined,
      order_time: formState.order_time || undefined,
      sender_name: formState.sender_name || undefined,
      receiver_name: formState.receiver_name || undefined,
      receiver_phone: formState.receiver_phone || undefined,
      receiver_address: formState.receiver_address || undefined,
      total_amount: isVegetableOrder
        ? calculatedVegetableTotal
        : formState.total_amount ? Number(formState.total_amount) : undefined,
      notes: formState.notes || undefined,
      is_custom_amount: true,
      order_category: orderCategory,
      items: validItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        package_type: !isVegetableOrder && item.package_type ? item.package_type : undefined,
        item_note: item.item_note || undefined,
        weight_kg: !isVegetableOrder ? item.weight_kg : undefined,
        unit_price: item.unit_price,
        image_url: item.image_url,
        image_urls: item.image_urls,
        payment_status: 'unpaid' as const,
      })),
    };

    if (editingOrder) {
      await updateOrderMutation.mutateAsync({
        orderId: editingOrder.id,
        payload,
      });
      closeModal();
      return;
    }

    await createOrderMutation.mutateAsync(payload);
    closeModal();
  };

  const isSubmitting = createOrderMutation.isPending || updateOrderMutation.isPending;

  if (loadingCustomer || isLoading) {
    return (
      <div className="w-full flex-1">
        <PageHeader title="Đơn hàng của tôi" description="Theo dõi và quản lý các đơn hàng của bạn" />
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <PageHeader
        title="Đơn hàng của tôi"
        description="Xem, tạo và chỉnh sửa đơn trước khi admin xác nhận"
        backPath="/"
      />

      <div className="bg-white rounded-2xl border border-border shadow-sm p-4 md:p-5 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-[13px] text-muted-foreground">
            Loại khách hàng: <span className="font-bold text-foreground">{customer?.customer_type || 'Chưa xác định'}</span>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            disabled={!canSelfCreate}
            className="px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 disabled:opacity-60 inline-flex items-center gap-2"
            title={canSelfCreate ? 'Tạo đơn hàng mới' : 'Admin chưa cấp quyền tạo đơn hàng'}
          >
            <Plus size={15} />
            Tạo đơn hàng
          </button>
        </div>

        <div className="overflow-auto rounded-xl border border-border">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-3 py-2 text-left font-bold">Mã đơn</th>
                <th className="px-3 py-2 text-left font-bold">Ngày</th>
                <th className="px-3 py-2 text-left font-bold">{isSenderCustomer ? 'Người nhận' : 'Người gửi'}</th>
                <th className="px-3 py-2 text-right font-bold">Tổng tiền</th>
                <th className="px-3 py-2 text-left font-bold">Trạng thái</th>
                <th className="px-3 py-2 text-right font-bold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    Chưa có đơn hàng nào
                  </td>
                </tr>
              ) : (
                sortedOrders.map((order) => {
                  const editable = order.status === 'pending' && !order.admin_confirmed_at;
                  const statusLabel = order.admin_confirmed_at ? 'admin_confirmed' : order.status;
                  return (
                    <tr key={order.id} className="border-t border-border/70">
                      <td className="px-3 py-2 font-semibold">{order.order_code || '-'}</td>
                      <td className="px-3 py-2">{order.order_date || '-'}</td>
                      <td className="px-3 py-2">{isSenderCustomer ? (order.receiver_name || '-') : (order.sender_name || '-')}</td>
                      <td className="px-3 py-2 text-right">
                        {(order.total_amount || 0).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-muted text-foreground">
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={!editable}
                          onClick={() => openEditModal(order)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-[12px] font-semibold hover:bg-muted disabled:opacity-40"
                          title={editable ? 'Sửa đơn hàng' : 'Chỉ sửa khi đơn đang pending'}
                        >
                          <Pencil size={13} />
                          Sửa
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/35 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[92vh] bg-white rounded-2xl border border-border shadow-xl overflow-hidden flex flex-col">
            <form onSubmit={handleSubmit}>
              <div className="px-5 py-4 border-b border-border bg-muted/20">
                <h3 className="text-[15px] font-bold text-foreground">
                  {editingOrder ? 'Sửa đơn hàng' : 'Tạo đơn hàng'}
                </h3>
                <p className="text-[12px] text-muted-foreground mt-1">
                  {isVegetableOrder ? 'Đơn rau' : 'Đơn tạp hóa'} · {isSenderCustomer ? 'Bạn là người gửi' : 'Bạn là người nhận'}
                </p>
              </div>

              <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(92vh-140px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label="Ngày đơn"
                    type="date"
                    value={formState.order_date}
                    onChange={(value) => setFormState((prev) => ({ ...prev, order_date: value }))}
                    required
                  />
                  <Input
                    label="Giờ đơn"
                    type="time"
                    value={formState.order_time}
                    onChange={(value) => setFormState((prev) => ({ ...prev, order_time: value }))}
                    required
                  />
                </div>

                {isSenderCustomer ? (
                  <>
                    <Input
                      label="Người nhận"
                      value={formState.receiver_name}
                      onChange={(value) => setFormState((prev) => ({ ...prev, receiver_name: value }))}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label="Số điện thoại người nhận"
                        value={formState.receiver_phone}
                        onChange={(value) => setFormState((prev) => ({ ...prev, receiver_phone: value }))}
                      />
                      <Input
                        label="Địa chỉ người nhận"
                        value={formState.receiver_address}
                        onChange={(value) => setFormState((prev) => ({ ...prev, receiver_address: value }))}
                      />
                    </div>
                  </>
                ) : (
                  <Input
                    label="Người gửi"
                    value={formState.sender_name}
                    onChange={(value) => setFormState((prev) => ({ ...prev, sender_name: value }))}
                  />
                )}

                {isVegetableOrder ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                    <div className="text-[12px] font-semibold text-emerald-700">Tổng tiền tự tính theo giá rau đã cài đặt</div>
                    <div className="text-xl font-black text-emerald-800 mt-1">{formatCurrency(calculatedVegetableTotal)}</div>
                  </div>
                ) : (
                  <Input
                    label="Tổng tiền"
                    type="number"
                    min={0}
                    value={formState.total_amount}
                    onChange={(value) => setFormState((prev) => ({ ...prev, total_amount: value }))}
                  />
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[13px] font-bold text-foreground">Danh sách hàng</h4>
                      <p className="text-[12px] text-muted-foreground">Bắt buộc chọn mặt hàng và số lượng cho mỗi dòng.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addItem}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-[12px] font-bold hover:bg-muted"
                    >
                      <Plus size={14} />
                      Thêm dòng
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formState.items.map((item, index) => {
                      const selectedProduct = productsById.get(item.product_id);
                      const vegetableUnitPrice = item.unit_price ? Number(item.unit_price) : Number(selectedProduct?.base_price) || 0;
                      const quantity = Number(item.quantity) || 0;
                      const vegetableLineTotal = vegetableUnitPrice * quantity;

                      return (
                      <div key={index} className="rounded-2xl border border-border bg-muted/10 p-3 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,1fr)_110px_140px_auto] gap-3 items-end">
                          <div className="space-y-1.5">
                            <label className="text-[12px] font-semibold text-muted-foreground">Mặt hàng</label>
                            <SearchableSelect
                              options={productOptions}
                              value={item.product_id}
                              onValueChange={(value) => {
                                const product = productsById.get(value);
                                updateItem(index, {
                                  product_id: value,
                                  unit_price: isVegetableOrder ? String(Number(product?.base_price) || 0) : item.unit_price,
                                });
                              }}
                              placeholder="Chọn mặt hàng"
                              searchPlaceholder="Tìm mặt hàng..."
                            />
                          </div>
                          <Input
                            label="Số lượng"
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(value) => updateItem(index, { quantity: value })}
                            required
                          />
                          {isVegetableOrder ? (
                            <div className="space-y-1.5">
                              <label className="text-[12px] font-semibold text-muted-foreground">Đơn giá</label>
                              <div className="h-10 px-3 rounded-xl border border-border bg-muted/40 text-sm font-bold flex items-center">
                                {selectedProduct ? formatCurrency(vegetableUnitPrice) : '-'}
                              </div>
                            </div>
                          ) : (
                            <Input
                              label="Kg"
                              type="number"
                              min={0}
                              value={item.weight_kg}
                              onChange={(value) => updateItem(index, { weight_kg: value })}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            disabled={formState.items.length === 1}
                            className="h-10 px-3 rounded-xl border border-border text-red-500 hover:bg-red-50 disabled:opacity-40"
                            title="Xóa dòng"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {isVegetableOrder ? (
                          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
                            <Input
                              label="Ghi chú nhanh"
                              value={item.item_note}
                              onChange={(value) => updateItem(index, { item_note: value })}
                            />
                            <div className="space-y-1.5">
                              <label className="text-[12px] font-semibold text-muted-foreground">Thành tiền</label>
                              <div className="h-10 px-3 rounded-xl border border-border bg-background text-sm font-black flex items-center justify-end">
                                {formatCurrency(vegetableLineTotal)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input
                              label="Loại kiện / ghi chú kiện"
                              value={item.package_type}
                              onChange={(value) => updateItem(index, { package_type: value })}
                            />
                            <Input
                              label="Đơn giá"
                              type="number"
                              min={0}
                              value={item.unit_price}
                              onChange={(value) => updateItem(index, { unit_price: value })}
                            />
                          </div>
                        )}

                        <ImagePicker
                          label="Ảnh hàng"
                          urls={item.image_urls}
                          isUploading={uploadingItemIndex === index}
                          onUpload={(event) => handleItemUpload(index, event)}
                          onRemove={(imageIndex) => removeItemImage(index, imageIndex)}
                        />
                      </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-muted-foreground">Ghi chú</label>
                  <textarea
                    rows={3}
                    value={formState.notes}
                    onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                  />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-border bg-muted/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border border-border text-[13px] font-semibold hover:bg-muted"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                  {editingOrder ? 'Lưu cập nhật' : 'Tạo đơn'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

const Input: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: number;
}> = ({ label, value, onChange, type = 'text', required = false, min }) => (
  <div className="space-y-1.5">
    <label className="text-[12px] font-semibold text-muted-foreground">{label}</label>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      type={type}
      required={required}
      min={min}
      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
    />
  </div>
);

const ImagePicker: React.FC<{
  label: string;
  urls: string[];
  isUploading: boolean;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
}> = ({ label, urls, isUploading, onUpload, onRemove }) => (
  <div className="space-y-2">
    <label className="text-[12px] font-semibold text-muted-foreground">{label}</label>
    <div className="flex flex-wrap gap-2">
      {urls.map((url, index) => (
        <div key={`${url}-${index}`} className="relative w-16 h-16 rounded-xl border border-border overflow-hidden bg-muted">
          <img src={url} alt={label} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white inline-flex items-center justify-center"
            aria-label="Xóa ảnh"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <label className="w-16 h-16 rounded-xl border border-dashed border-border bg-muted/30 text-muted-foreground hover:text-primary hover:border-primary/60 cursor-pointer inline-flex items-center justify-center">
        <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
        {isUploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
      </label>
    </div>
  </div>
);

export default MyOrdersPage;
