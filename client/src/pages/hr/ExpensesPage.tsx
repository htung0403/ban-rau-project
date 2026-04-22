import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import PageHeader from '../../components/shared/PageHeader';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useConfirmExpense, useEmployees } from '../../hooks/queries/useHR';
import { useVehicles } from '../../hooks/queries/useVehicles';
import { useAuth } from '../../context/AuthContext';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import StatusBadge from '../../components/shared/StatusBadge';
import DraggableFAB from '../../components/shared/DraggableFAB';
import { DatePicker } from '../../components/shared/DatePicker';
import CurrencyInput from '../../components/shared/CurrencyInput';
import { CustomSelect } from '../../components/shared/CustomSelect';
import { SearchInput } from '../../components/ui/SearchInput';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { uploadApi } from '../../api/uploadApi';
import { format } from 'date-fns';
import { matchesSearch } from '../../lib/str-utils';
import { Plus, Receipt, X, ChevronRight, Upload, Trash2, Edit2, CheckCircle2, Image as ImageIcon, Eye, ChevronLeft, ChevronRight as ChevronRightIcon, Camera } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import type { Expense } from '../../types';

const ExpensesPage = () => {
  const { user } = useAuth();
  const { data: expenses, isLoading, isError, refetch } = useExpenses();
  const { data: employees } = useEmployees(user?.role === 'admin');
  const { data: vehicles } = useVehicles();
  
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();
  const confirmMutation = useConfirmExpense();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const confirmingExpense = expenses?.find(e => e.id === confirmId);

  const isViewOnly = editingExpense?.payment_status === 'confirmed';

  const [previewImages, setPreviewImages] = useState<string[] | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'camera' | 'file' | null>(null);

  const [formData, setFormData] = useState({
    employee_id: user?.id || '',
    vehicle_id: '' as string | null,
    expense_name: '',
    amount: undefined as number | undefined,
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    image_urls: [] as string[],
    payment_status: 'unpaid' as 'unpaid' | 'paid',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filteredExpenses = React.useMemo(() => {
    if (!expenses) return [];
    return expenses.filter(e => {
      if (searchQuery && !matchesSearch(e.expense_name, searchQuery)) {
        return false;
      }
      if (filterEmployee && e.employee_id !== filterEmployee) {
        return false;
      }
      if (filterVehicle && e.vehicle_id !== filterVehicle) {
        return false;
      }
      if (filterStatus && e.payment_status !== filterStatus) {
        return false;
      }
      return true;
    });
  }, [expenses, searchQuery, filterEmployee, filterVehicle, filterStatus]);

  const closeDialog = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsDialogOpen(false);
      setIsClosing(false);
      setEditingExpense(null);
      setFormData({
        employee_id: user?.id || '',
        vehicle_id: '',
        expense_name: '',
        amount: undefined,
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        image_urls: [],
        payment_status: 'unpaid',
      });
    }, 300);
  };

  const openDialog = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      
      let displayAmount = expense.amount;
      if (expense.amount % 1000 === 0 && expense.amount / 1000 < 10000) {
        displayAmount = expense.amount / 1000;
      }

      setFormData({
        employee_id: expense.employee_id,
        vehicle_id: expense.vehicle_id || '',
        expense_name: expense.expense_name,
        amount: displayAmount,
        expense_date: expense.expense_date,
        image_urls: expense.image_urls || [],
        payment_status: expense.payment_status === 'confirmed' ? 'paid' : expense.payment_status,
      });
    } else {
      setEditingExpense(null);
      setFormData({
        employee_id: user?.id || '',
        vehicle_id: '',
        expense_name: '',
        amount: undefined,
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        image_urls: [],
        payment_status: 'unpaid',
      });
    }
    setIsDialogOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (formData.image_urls.length + files.length > 10) {
      toast.error('Tối đa 10 hình ảnh');
      return;
    }

    setIsUploading(true);
    const newUrls: string[] = [];
    
    try {
      setUploadType(e.target.capture ? 'camera' : 'file');
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadApi.uploadFile(file, 'expenses', 'receipts');
        newUrls.push(res.url);
      }
      setFormData(prev => ({
        ...prev,
        image_urls: [...prev.image_urls, ...newUrls]
      }));
    } catch (error) {
      toast.error('Lỗi khi tải ảnh lên');
    } finally {
      setIsUploading(false);
      setUploadType(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) {
      toast.error('Vui lòng nhập số tiền');
      return;
    }

    let finalAmount = formData.amount;
    if (finalAmount < 10000) {
      finalAmount = finalAmount * 1000;
    }

    const payload = {
      employee_id: formData.employee_id,
      vehicle_id: formData.vehicle_id || null,
      expense_name: formData.expense_name,
      amount: finalAmount,
      expense_date: formData.expense_date,
      image_urls: formData.image_urls,
      payment_status: formData.payment_status,
    };

    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, payload }, {
        onSuccess: () => closeDialog()
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => closeDialog()
      });
    }
  };

  const statusLabels: Record<string, string> = {
    unpaid: 'Chưa thanh toán',
    paid: 'Đã thanh toán',
    confirmed: 'Đã xác nhận'
  };

  const statusColors: Record<string, 'pending' | 'success' | 'error' | 'default'> = {
    unpaid: 'error',
    paid: 'success',
    confirmed: 'pending'
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const employeeOptions = employees?.map(emp => ({
    value: emp.id,
    label: emp.full_name
  })) || [];

  const vehicleOptions = [
    { value: '', label: 'Không chọn xe' },
    ...(vehicles?.map(v => ({
      value: v.id,
      label: v.license_plate
    })) || [])
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <div className="hidden md:block">
        <PageHeader
          title="Chi phí"
          description="Quản lý các khoản chi phí phát sinh"
          backPath="/hanh-chinh-nhan-su"
          actions={
            <button
              onClick={() => openDialog()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
            >
              <Plus size={16} />
              Thêm chi phí
            </button>
          }
        />
      </div>
      <DraggableFAB icon={<Plus size={24} />} onClick={() => openDialog()} />

      <div className="bg-card justify-between rounded-2xl md:border md:border-border sm:shadow-sm flex flex-col flex-1 min-h-0 mt-0 md:mt-4">
        {isLoading ? (
          <div className="p-4"><LoadingSkeleton columns={5} rows={6} /></div>
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : !expenses || expenses.length === 0 ? (
          <EmptyState title="Chưa có chi phí nào" />
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Filter Bar */}
            <div className="p-3 border-b border-border/50 flex flex-col sm:flex-row gap-3 shrink-0 bg-muted/5">
              <div className="flex-1 min-w-[200px]">
                <SearchInput
                  placeholder="Tìm tên chi phí..."
                  onSearch={(val) => setSearchQuery(val)}
                  className="bg-background"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                {user?.role === 'admin' && (
                  <div className="w-[150px] shrink-0">
                    <CustomSelect
                      value={filterEmployee}
                      onChange={setFilterEmployee}
                      options={[{ value: '', label: 'Tất cả nhân viên' }, ...employeeOptions]}
                      placeholder="Nhân viên"
                      className="h-10 w-full bg-background"
                    />
                  </div>
                )}
                <div className="w-[140px] shrink-0">
                  <CustomSelect
                    value={filterVehicle}
                    onChange={setFilterVehicle}
                    options={[{ value: '', label: 'Tất cả xe' }, ...vehicleOptions.filter(v => v.value !== '')]}
                    placeholder="Xe"
                    className="h-10 w-full bg-background"
                  />
                </div>
                <div className="w-[150px] shrink-0">
                  <CustomSelect
                    value={filterStatus}
                    onChange={setFilterStatus}
                    options={[
                      { value: '', label: 'Tất cả trạng thái' },
                      { value: 'unpaid', label: 'Chưa thanh toán' },
                      { value: 'paid', label: 'Đã thanh toán' },
                      { value: 'confirmed', label: 'Đã xác nhận' }
                    ]}
                    placeholder="Trạng thái"
                    className="h-10 w-full bg-background"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
              {filteredExpenses.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Không tìm thấy kết quả phù hợp</div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <table className="w-full text-left border-collapse hidden md:table">
              <thead className="bg-muted/30 sticky top-0 z-10 backdrop-blur-xl">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider whitespace-nowrap min-w-[200px] border-b border-border/50">Tên chi phí</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider text-center whitespace-nowrap border-b border-l border-border/50 bg-muted/5">Ảnh</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider whitespace-nowrap min-w-[150px] border-b border-l border-border/50">Người tạo</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-emerald-600 uppercase tracking-wider text-right whitespace-nowrap min-w-[150px] border-b border-l border-border/50 bg-emerald-50/30">Số tiền</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider whitespace-nowrap border-b border-l border-border/50">Ngày chi</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider text-center whitespace-nowrap border-b border-l border-border/50 bg-muted/10">Trạng thái</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider whitespace-nowrap border-b border-l border-border/50 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredExpenses.map(e => (
                  <tr key={e.id} className="group hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 border-r border-border/10">
                      <div className="flex items-center gap-2">
                        <div className="text-[14px] font-medium text-foreground">{e.expense_name}</div>
                      </div>
                      {e.vehicle && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">Xe: {e.vehicle.license_plate}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 border-r border-border/10 text-center bg-muted/5">
                      {e.image_urls && e.image_urls.length > 0 ? (
                        <button
                          onClick={() => {
                            setPreviewImages(e.image_urls);
                            setCurrentImageIndex(0);
                          }}
                          className="relative w-10 h-10 rounded-lg border border-border overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all group"
                        >
                          <img src={e.image_urls[0]} alt="Receipt" className="w-full h-full object-cover" />
                          {e.image_urls.length > 1 && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                              +{e.image_urls.length - 1}
                            </div>
                          )}
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-lg border border-border border-dashed flex items-center justify-center text-muted-foreground/30 mx-auto">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 border-r border-border/10 text-[13px] text-muted-foreground">
                       {e.employee?.full_name || 'Không xác định'}
                    </td>
                    <td className="px-6 py-4 text-right border-border/10 font-bold text-[14px] text-emerald-600 tabular-nums bg-emerald-50/20">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="px-6 py-4 border-l border-border/10 text-[13px] text-muted-foreground">
                       {format(new Date(e.expense_date), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 text-center border-l border-border/10 bg-muted/5">
                      <StatusBadge status={statusColors[e.payment_status] || 'default'} label={statusLabels[e.payment_status] || e.payment_status} />
                    </td>
                    <td className="px-6 py-4 text-right border-l border-border/10">
                      <div className="flex items-center justify-end gap-2">
                        {(e.payment_status === 'paid' || e.payment_status === 'unpaid') && user?.role === 'admin' && (
                          <button
                            onClick={() => setConfirmId(e.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Xác nhận đã thanh toán"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {e.payment_status !== 'confirmed' && (user?.role === 'admin' || user?.id === e.employee_id) && (
                          <>
                            <button
                              onClick={() => openDialog(e)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Sửa"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteId(e.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Xóa"
                            >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      {e.payment_status === 'confirmed' && (
                        <button
                          onClick={() => openDialog(e)}
                          className="p-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                    </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Card View */}
            <div className="flex flex-col gap-3 p-3 md:hidden bg-muted/50 min-h-full pb-20">
              {filteredExpenses.map(e => (
                <div key={e.id} className="bg-card rounded-xl border border-border/60 shadow-sm p-4 flex flex-col gap-3 relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${e.payment_status === 'confirmed' ? 'bg-emerald-500' : e.payment_status === 'unpaid' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  
                  <div className="flex justify-between items-start pl-1 mb-1">
                     <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-foreground">{e.expense_name}</span>
                        {e.image_urls && e.image_urls.length > 0 && (
                          <button
                            onClick={() => {
                              setPreviewImages(e.image_urls);
                              setCurrentImageIndex(0);
                            }}
                            className="p-1 bg-muted rounded-md text-primary"
                          >
                            <ImageIcon size={14} />
                          </button>
                        )}
                      </div>
                       <span className="text-[11px] text-muted-foreground mt-0.5">
                         {e.employee?.full_name} {e.vehicle && `• Xe: ${e.vehicle.license_plate}`}
                       </span>
                     </div>
                     <StatusBadge status={statusColors[e.payment_status] || 'default'} label={statusLabels[e.payment_status] || e.payment_status} />
                  </div>

                  <div className="flex items-center justify-between bg-muted/20 rounded-lg p-2.5 ml-1 border border-border/50">
                     <div className="flex flex-col">
                        <span className="text-[11px] text-muted-foreground font-medium">Ngày chi</span>
                        <span className="text-[13px] font-bold text-foreground">{format(new Date(e.expense_date), 'dd/MM/yyyy')}</span>
                     </div>
                     <div className="flex flex-col items-end">
                        <span className="text-[11px] text-emerald-600/80 font-medium">Số tiền</span>
                        <span className="text-[14px] font-bold text-emerald-600 tabular-nums">{formatCurrency(e.amount)}</span>
                     </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-1">
                    {(e.payment_status === 'paid' || e.payment_status === 'unpaid') && user?.role === 'admin' && (
                      <button
                        onClick={() => setConfirmId(e.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[12px] font-bold"
                      >
                        <CheckCircle2 size={14} />
                        Xác nhận
                      </button>
                    )}
                    {e.payment_status !== 'confirmed' && (user?.role === 'admin' || user?.id === e.employee_id) && (
                      <>
                        <button
                          onClick={() => openDialog(e)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[12px] font-bold"
                        >
                          <Edit2 size={14} />
                          Sửa
                        </button>
                        <button
                          onClick={() => setDeleteId(e.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[12px] font-bold"
                        >
                          <Trash2 size={14} />
                          Xóa
                        </button>
                      </>
                    )}
                    {e.payment_status === 'confirmed' && (
                      <button
                        onClick={() => openDialog(e)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[12px] font-bold"
                      >
                        <Eye size={14} />
                        Xem
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {(isDialogOpen || isClosing) && createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-end">
          {/* Backdrop */}
          <div
            className={clsx(
              'fixed inset-0 bg-black/40 backdrop-blur-md transition-all duration-350 ease-out',
              isClosing ? 'opacity-0' : 'animate-in fade-in duration-300',
            )}
            onClick={closeDialog}
          />
          {/* Panel */}
          <div
            className={clsx(
              'relative w-full max-w-[500px] bg-background shadow-2xl flex flex-col h-screen border-l border-border',
              isClosing ? 'dialog-slide-out' : 'dialog-slide-in',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Receipt size={20} />
                </div>
                <h2 className="text-lg font-bold text-foreground">
                  {editingExpense ? (editingExpense.payment_status === 'confirmed' ? 'Chi tiết chi phí' : 'Sửa chi phí') : 'Thêm chi phí'}
                </h2>
              </div>
              <button
                onClick={closeDialog}
                className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
                title="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Body */}
            <form id="expense-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
                  <Receipt size={16} className="text-emerald-500" />
                  <span className="text-[12px] font-bold text-emerald-500 uppercase tracking-wider">Thông tin chi phí</span>
                </div>
                <div className="p-5 grid grid-cols-1 gap-4">
                  {user?.role === 'admin' && (
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-bold text-foreground">Nhân viên <span className="text-red-500">*</span></label>
                      <CustomSelect
                        value={formData.employee_id}
                        onChange={(val) => setFormData({ ...formData, employee_id: val })}
                        options={employeeOptions}
                        placeholder="Chọn nhân viên"
                        className="w-full h-11"
                        align="start"
                        disabled={isViewOnly}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-foreground">Tên chi phí <span className="text-red-500">*</span></label>
                    <input
                      className="flex h-11 w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-[14px] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all font-medium"
                      required
                      value={formData.expense_name}
                      onChange={(e) => setFormData({ ...formData, expense_name: e.target.value })}
                      placeholder="Ví dụ: Đổ xăng, Phí cầu đường..."
                      disabled={isViewOnly}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-foreground">Xe (Tùy chọn)</label>
                    <CustomSelect
                      value={formData.vehicle_id || ''}
                      onChange={(val) => setFormData({ ...formData, vehicle_id: val })}
                      options={vehicleOptions}
                      placeholder="Chọn xe"
                      className="w-full h-11"
                      align="start"
                      disabled={isViewOnly}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-foreground">Số tiền <span className="text-red-500">*</span></label>
                    <div className="relative">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₫</span>
                       <CurrencyInput
                         required
                         value={formData.amount}
                         onChange={(val) => setFormData({ ...formData, amount: val })}
                         className="flex h-11 w-full rounded-xl border border-border/80 bg-background pl-8 pr-3 py-2 text-[14px] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all font-medium text-emerald-600"
                         placeholder="Ví dụ: 500,000"
                         disabled={isViewOnly}
                       />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-foreground">Ngày chi <span className="text-red-500">*</span></label>
                    <DatePicker
                      value={formData.expense_date}
                      onChange={(val) => setFormData({ ...formData, expense_date: val })}
                      className="w-full h-11"
                      disabled={isViewOnly}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-foreground">Trạng thái thanh toán</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, payment_status: 'unpaid' })}
                        disabled={isViewOnly}
                        className={clsx(
                          "flex items-center justify-center gap-2 h-11 rounded-xl border text-[13px] font-bold transition-all",
                          formData.payment_status === 'unpaid'
                            ? "bg-red-50 border-red-200 text-red-600 ring-2 ring-red-500/10"
                            : "bg-background border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        Chưa thanh toán
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, payment_status: 'paid' })}
                        disabled={isViewOnly}
                        className={clsx(
                          "flex items-center justify-center gap-2 h-11 rounded-xl border text-[13px] font-bold transition-all",
                          formData.payment_status === 'paid'
                            ? "bg-emerald-50 border-emerald-200 text-emerald-600 ring-2 ring-emerald-500/10"
                            : "bg-background border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        Đã thanh toán
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-foreground">Hình ảnh / Hóa đơn</label>
                        <div className="grid grid-cols-3 gap-2">
                          {formData.image_urls.map((url, idx) => (
                            <div key={idx} className="relative aspect-square rounded-xl border border-border overflow-hidden group">
                              <img src={url} alt="Receipt" className="w-full h-full object-cover" />
                              {!isViewOnly && (
                                <button
                                  type="button"
                                  onClick={() => removeImage(idx)}
                                  className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                          {!isViewOnly && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  if (fileInputRef.current) {
                                    fileInputRef.current.removeAttribute('capture');
                                    fileInputRef.current.click();
                                  }
                                }}
                                disabled={isUploading}
                                className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-emerald-500/50 hover:bg-emerald-50/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isUploading && uploadType === 'file' ? (
                                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <Upload size={20} />
                                    <span className="text-[11px] font-medium text-center px-1 leading-tight">Tải ảnh lên</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (fileInputRef.current) {
                                    fileInputRef.current.setAttribute('capture', 'environment');
                                    fileInputRef.current.click();
                                  }
                                }}
                                disabled={isUploading}
                                className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-blue-500/50 hover:bg-blue-50/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed md:hidden"
                              >
                                {isUploading && uploadType === 'camera' ? (
                                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <Camera size={20} />
                                    <span className="text-[11px] font-medium text-center px-1 leading-tight">Chụp ảnh</span>
                                  </>
                                )}
                              </button>
                            </>
                          )}
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            multiple
                            accept="image/*"
                            className="hidden"
                          />
                        </div>
                  </div>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="bg-card border-t border-border px-6 py-4 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={closeDialog}
                className="px-6 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-[13px] font-bold transition-all"
              >
                {editingExpense?.payment_status === 'confirmed' ? 'Đóng' : 'Hủy'}
              </button>
              {editingExpense?.payment_status !== 'confirmed' && (
                <button 
                  type="submit"
                  form="expense-form"
                  disabled={createMutation.isPending || updateMutation.isPending || isUploading}
                  className={clsx(
                    "flex items-center gap-2 px-8 py-2 rounded-xl text-[13px] font-bold shadow-lg transition-all group",
                    (createMutation.isPending || updateMutation.isPending || isUploading)
                      ? "bg-emerald-500/50 text-white/60 cursor-wait" 
                      : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20"
                  )}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Đang lưu...' : 'Lưu chi phí'}
                  {!(createMutation.isPending || updateMutation.isPending) && <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId, {
              onSuccess: () => setDeleteId(null)
            });
          }
        }}
        title="Xóa chi phí"
        message="Bạn có chắc chắn muốn xóa chi phí này? Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!confirmId}
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          if (confirmId) {
            confirmMutation.mutate(confirmId, {
              onSuccess: () => setConfirmId(null)
            });
          }
        }}
        title="Xác nhận chi phí"
        message={
          confirmingExpense ? (
            <div className="space-y-1">
              <p>Xác nhận chi phí này đã được thanh toán và hợp lệ?</p>
              <div className="text-[13px] bg-muted/50 p-3 rounded-lg border border-border space-y-1 mt-2 text-foreground/80">
                <div>• Chi phí: <span className="font-bold text-foreground">{confirmingExpense.expense_name}</span></div>
                <div>• Nhân viên: <span className="font-bold text-foreground">{confirmingExpense.employee?.full_name}</span></div>
                {confirmingExpense.vehicle && (
                  <div>• Xe: <span className="font-bold text-foreground">{confirmingExpense.vehicle.license_plate}</span></div>
                )}
                <div>• Số tiền: <span className="font-bold text-emerald-600">{formatCurrency(confirmingExpense.amount)}</span></div>
              </div>
            </div>
          ) : "Xác nhận chi phí này đã được thanh toán và hợp lệ?"
        }
        confirmLabel="Xác nhận"
        cancelLabel="Hủy"
        variant="primary"
        isLoading={confirmMutation.isPending}
      />

      {previewImages && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 animate-in fade-in duration-300">
          <button
            onClick={() => setPreviewImages(null)}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-[10001]"
          >
            <X size={24} />
          </button>

          {previewImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : previewImages.length - 1));
                }}
                className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-[10001]"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => (prev < previewImages.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-[10001]"
              >
                <ChevronRightIcon size={32} />
              </button>
            </>
          )}

          <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center">
            <img
              src={previewImages[currentImageIndex]}
              alt="Preview"
              className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-300"
            />
            {previewImages.length > 1 && (
              <div className="mt-4 px-4 py-2 bg-white/10 rounded-full text-white text-[13px] font-medium">
                {currentImageIndex + 1} / {previewImages.length}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ExpensesPage;
