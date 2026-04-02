import React from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { useEmployees, useCreateEmployee, useUpdateEmployeeStatus } from '../../hooks/queries/useHR';
import { useRoleSalaries } from '../../hooks/queries/usePriceSettings';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { Users, Plus, X, UserPlus, Mail, Lock, Phone, ShieldCheck, ChevronRight, Loader2, Power, PowerOff } from 'lucide-react';
import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CreatableSearchableSelect } from '../../components/ui/CreatableSearchableSelect';
import { useUpsertRoleSalary } from '../../hooks/queries/usePriceSettings';

const EmployeesPage: React.FC = () => {
  const { data: employees, isLoading, isError, refetch } = useEmployees();
  const { data: roles } = useRoleSalaries();
  const createMutation = useCreateEmployee();
  const updateStatusMutation = useUpdateEmployeeStatus();
  const upsertRoleMutation = useUpsertRoleSalary();

  const roleOptions = useMemo(() => 
    roles?.map(r => ({ value: r.role_key, label: r.role_name })) || [], 
    [roles]
  );

  const [isAdding, setIsAdding] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'staff'
  });

  const handleOpenAdd = () => {
    setFormData({ email: '', password: '', full_name: '', phone: '', role: 'staff' });
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
    if (!formData.email || !formData.password || !formData.full_name) return;
    createMutation.mutate(formData, {
      onSuccess: () => handleCloseAdd()
    });
  };

  const toggleStatus = (id: string, currentStatus: boolean) => {
    updateStatusMutation.mutate({ id, is_active: !currentStatus });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
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
      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col flex-1 min-h-0">
        {isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={6} columns={4} /></div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !employees?.length ? (
          <EmptyState title="Chưa có nhân viên" />
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left rounded-tl-2xl">Họ tên</th>
                  <th className="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Email</th>
                  <th className="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">SDT</th>
                  <th className="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Vai trò</th>
                  <th className="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-center rounded-tr-2xl">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {employees.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-foreground line-clamp-1">{e.full_name}</span>
                        <span className="text-[10px] text-muted-foreground/60 md:hidden">{e.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell">{e.email || '-'}</td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">{e.phone || '-'}</td>
                    <td className="px-4 py-3 text-left">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                        {roles?.find(r => r.role_key === e.role)?.role_name || e.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleStatus(e.id, e.is_active)}
                        disabled={updateStatusMutation.isPending}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                          e.is_active 
                            ? 'text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100' 
                            : 'text-red-500 bg-red-50 border border-red-100 hover:bg-red-100'
                        }`}
                      >
                        {updateStatusMutation.isPending && updateStatusMutation.variables?.id === e.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : e.is_active ? (
                          <Power size={12} />
                        ) : (
                          <PowerOff size={12} />
                        )}
                        {e.is_active ? 'Hoạt động' : 'Ngừng'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                    <label className="text-[13px] font-bold text-foreground">Email đăng nhập <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={16} />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="VD: nhanvien@gmail.com"
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
                    <label className="text-[13px] font-bold text-foreground">Số điện thoại</label>
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
                disabled={createMutation.isPending || !formData.email || !formData.password || !formData.full_name}
                className={`flex items-center gap-2 px-8 py-2 rounded-xl text-[13px] font-bold shadow-lg transition-all active:scale-95 group ${
                  createMutation.isPending || !formData.email || !formData.password || !formData.full_name
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
    </div>
  );
};

export default EmployeesPage;
