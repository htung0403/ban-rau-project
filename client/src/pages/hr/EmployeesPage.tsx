import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import { useEmployees, useCreateEmployee, useDeleteEmployee } from '../../hooks/queries/useHR';
import { useRoleSalaries } from '../../hooks/queries/usePriceSettings';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import DraggableFAB from '../../components/shared/DraggableFAB';
import { Users, Plus, X, UserPlus, Mail, Lock, Phone, ShieldCheck, ChevronRight, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CreatableSearchableSelect } from '../../components/ui/CreatableSearchableSelect';
import { useUpsertRoleSalary } from '../../hooks/queries/usePriceSettings';

const EmployeesPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: employees, isLoading, isError, refetch } = useEmployees();
  const { data: roles } = useRoleSalaries();
  const createMutation = useCreateEmployee();
  const deleteMutation = useDeleteEmployee();
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const upsertRoleMutation = useUpsertRoleSalary();

  const roleOptions = useMemo(() => 
    roles?.map(r => ({ value: r.role_key, label: r.role_name })) || [], 
    [roles]
  );

  const [isAdding, setIsAdding] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    full_name: '',
    phone: '',
    role: 'staff'
  });

  const handleOpenAdd = () => {
    setFormData({ password: '', full_name: '', phone: '', role: 'staff' });
    setIsAdding(true);
    setIsClosing(false);
  };

  const handleCreateRole = (name: string) => {
    const key = name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, '_');

    upsertRoleMutation.mutate({
      role_key: key,
      role_name: name,
      daily_wage: 0,
      description: 'Role mới được tạo từ trang nhân sự'
    } as any, {
      onSuccess: () => {
        setFormData(prev => ({ ...prev, role: key }));
      }
    });
  };

  const handleCloseAdd = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsAdding(false);
      setIsClosing(false);
    }, 300);
  };

  const handleCreate = () => {
    if (!formData.phone || !formData.password || !formData.full_name) return;
    const loginEmail = formData.phone.includes('@') ? formData.phone : `${formData.phone}@vuarau.com`;
    createMutation.mutate({ ...formData, email: loginEmail }, {
      onSuccess: () => handleCloseAdd()
    });
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    deleteMutation.mutate(deleteConfirm.id, {
      onSuccess: () => setDeleteConfirm(null),
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <div className="hidden md:block">
        <PageHeader 
          title="Nhân sự" 
          description="Danh sách nhân viên" 
          backPath="/hanh-chinh-nhan-su" 
          actions={
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              <Plus size={16} />
              Thêm nhân sự
            </button>
          }
        />
      </div>
      <DraggableFAB icon={<Plus size={24} />} onClick={handleOpenAdd} />
      <div className="flex-1 min-h-0 flex flex-col">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-4 flex-1"><LoadingSkeleton rows={6} columns={4} /></div>
        ) : isError ? (
          <div className="bg-white rounded-2xl border border-border shadow-sm flex-1"><ErrorState onRetry={() => refetch()} /></div>
        ) : !employees?.length ? (
          <div className="bg-white rounded-2xl border border-border shadow-sm flex-1"><EmptyState title="Chưa có nhân viên" /></div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar pb-6 px-1">
            <div className="flex flex-col gap-3">
              {employees.map((e) => (
                <div key={e.id} onClick={() => navigate(`/hanh-chinh-nhan-su/nhan-su/${e.id}`)} className="cursor-pointer bg-white rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 overflow-hidden flex flex-col md:flex-row items-center group relative p-4 pl-6">
                  {/* Left accent line */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${e.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  
                  {/* Avatar & Basic Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0 w-full md:w-auto">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-inner">
                      <span className="text-lg font-bold">
                        {e.full_name.trim().split(' ').pop()?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0 md:pr-6 border-none md:border-r border-border/50">
                      <h3 className="text-[16px] font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {e.full_name}
                      </h3>
                      <span className="w-fit mt-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-muted/10 text-muted-foreground border border-border/50 whitespace-nowrap">
                        {roles?.find(r => r.role_key === e.role)?.role_name || e.role}
                      </span>
                    </div>
                  </div>

                  {/* Contact Info (middle) */}
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-6 flex-[1.5] px-0 md:px-6 py-4 md:py-0 w-full md:w-auto">
                    <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                      <div className="w-7 h-7 rounded-lg bg-muted/10 flex items-center justify-center shrink-0">
                        <Mail size={14} className="text-muted-foreground/80" />
                      </div>
                      <span className="truncate font-medium">{e.email || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                      <div className="w-7 h-7 rounded-lg bg-muted/10 flex items-center justify-center shrink-0">
                        <Phone size={14} className="text-muted-foreground/80" />
                      </div>
                      <span className="font-medium">{e.phone || 'Chưa cập nhật'}</span>
                    </div>
                  </div>
                  
                  {/* Action (right) */}
                  <div className="flex items-center gap-4 shrink-0 w-full md:w-auto justify-between md:justify-end pt-4 md:pt-0 border-t md:border-t-0 border-border/50 text-[13px]">
                    <span className={`flex items-center justify-center w-24 gap-1.5 text-[12px] font-bold ${e.is_active ? 'text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg py-1.5' : 'text-red-500 bg-red-50 border border-red-100 rounded-lg py-1.5'}`}>
                      {e.is_active ? (
                        <ShieldCheck size={13} />
                      ) : (
                        <Lock size={13} />
                      )}
                      {e.is_active ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                    <button
                        onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id, e.full_name); }}
                        className="text-[12px] font-bold px-3 py-1.5 rounded-lg transition-all text-red-600 hover:bg-red-50 border border-border/50 hover:border-red-200 flex items-center gap-1.5"
                      >
                        <Trash2 size={13} />
                        Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Side Panel - Add Employee */}
      {(isAdding || isClosing) && createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-end overflow-hidden">
          <div 
            className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in'}`} 
            onClick={handleCloseAdd} 
          />
          
          <div className={`relative w-full max-w-[500px] bg-[#f8fafc] shadow-2xl flex flex-col h-screen border-l border-border transition-transform duration-300 ${isClosing ? 'translate-x-full' : 'translate-x-0 animate-in slide-in-from-right'}`}>
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <UserPlus size={20} />
                </div>
                <h2 className="text-lg font-bold text-foreground">Thêm nhân sự mới</h2>
              </div>
              <button 
                onClick={handleCloseAdd} 
                className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Account Credentials */}
              <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
                  <Lock size={16} className="text-primary" />
                  <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Tài khoản đăng nhập</span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-foreground">Số điện thoại (Tài khoản) <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={16} />
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="VD: 0901234567"
                        className="w-full pl-10 pr-4 py-2.5 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-foreground">Mật khẩu <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={16} />
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="Tối thiểu 6 ký tự"
                        className="w-full pl-10 pr-4 py-2.5 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
                  <Users size={16} className="text-primary" />
                  <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Thông tin cá nhân</span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-foreground">Họ và tên <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      placeholder="Nhập họ và tên nhân viên"
                      className="w-full px-4 py-2.5 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                    />
                  </div>


                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-foreground">Vai trò hệ thống <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 z-10" size={16} />
                      <CreatableSearchableSelect
                        options={roleOptions}
                        value={formData.role}
                        onValueChange={(val) => setFormData({...formData, role: val})}
                        onCreate={handleCreateRole}
                        placeholder="Chọn hoặc nhập vai trò mới..."
                        createMessage="Tạo vai trò"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="bg-white border-t border-border px-6 py-4 flex items-center justify-between shrink-0">
              <button
                onClick={handleCloseAdd}
                className="px-6 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-[13px] font-bold transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending || !formData.phone || !formData.password || !formData.full_name}
                className={`flex items-center gap-2 px-8 py-2 rounded-xl text-[13px] font-bold shadow-lg transition-all active:scale-95 group ${
                  createMutation.isPending || !formData.phone || !formData.password || !formData.full_name
                    ? "bg-primary/50 text-white/60 cursor-not-allowed"
                    : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
                }`}
              >
                {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={18} />}
                Thêm nhân sự
                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => !deleteMutation.isPending && setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-border w-full max-w-[400px] mx-4 animate-in zoom-in-95 fade-in duration-200">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
              <h3 className="text-[17px] font-bold text-foreground mb-2">Xác nhận xóa nhân sự</h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Bạn có chắc muốn <span className="font-bold text-red-600">xóa vĩnh viễn</span> nhân viên{' '}
                <span className="font-bold text-foreground">{deleteConfirm.name}</span>?
                <br />Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex items-center gap-3 px-6 pb-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground text-[13px] font-bold transition-all"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-[13px] font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default EmployeesPage;
