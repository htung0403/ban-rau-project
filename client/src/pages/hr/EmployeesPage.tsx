import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import { useEmployees, useCreateEmployee, useDeleteEmployee } from '../../hooks/queries/useHR';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import DraggableFAB from '../../components/shared/DraggableFAB';
import { Users, Plus, X, UserPlus, Mail, Lock, Phone, ShieldCheck, ChevronRight, Loader2, Trash2, AlertTriangle, UserCog, Pencil, PhoneCall, MessageCircle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { MultiSearchableSelect } from '../../components/ui/MultiSearchableSelect';
import { useAppRoles, useAssignUserRoles, useUserRoles } from '../../hooks/queries/useRoles';
import { useRoleSalaries } from '../../hooks/queries/usePriceSettings';
import { useAuth } from '../../context/AuthContext';

const getRoleDisplayName = (roleName: string, roleKey?: string) => {
  if (roleKey === 'customer' || roleName.trim().toLowerCase() === 'customer') {
    return 'Khách hàng';
  }
  return roleName;
};

const normalizeText = (value?: string | null) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const DRIVER_HEAVY_ROLE_KEYS = ['tai_xe_xe_tai_lon', 'tai_xe_tai_lon'];
const DRIVER_LIGHT_ROLE_KEYS = ['tai_xe_xe_tai_nho', 'tai_xe_tai_nho'];
const DRIVER_HEAVY_ROLE_NAMES = ['tai xe xe tai lon', 'tai xe tai lon'];
const DRIVER_LIGHT_ROLE_NAMES = ['tai xe xe tai nho', 'tai xe tai nho'];

const isHeavyDriverRole = (roleKey?: string, roleName?: string) => {
  const normalizedKey = normalizeText(roleKey).replace(/\s+/g, '_');
  const normalizedName = normalizeText(roleName);
  return (
    DRIVER_HEAVY_ROLE_KEYS.some((key) => normalizedKey.includes(key)) ||
    DRIVER_HEAVY_ROLE_NAMES.some((name) => normalizedName.includes(name))
  );
};

const isLightDriverRole = (roleKey?: string, roleName?: string) => {
  const normalizedKey = normalizeText(roleKey).replace(/\s+/g, '_');
  const normalizedName = normalizeText(roleName);
  return (
    DRIVER_LIGHT_ROLE_KEYS.some((key) => normalizedKey.includes(key)) ||
    DRIVER_LIGHT_ROLE_NAMES.some((name) => normalizedName.includes(name))
  );
};

const inferSystemRole = (roleKeyOrName?: string): 'admin' | 'manager' | 'staff' | 'driver' => {
  const normalized = normalizeText(roleKeyOrName).replace(/\s+/g, '_');
  if (normalized.includes('admin')) return 'admin';
  if (normalized.includes('manager') || normalized.includes('quan_ly')) return 'manager';
  if (normalized.includes('driver') || normalized.includes('tai_xe')) return 'driver';
  return 'staff';
};

const extractPhoneDigits = (phone?: string | null) => (phone || '').replace(/\D/g, '');

const toWhatsappPhone = (digits: string) => {
  if (!digits) return '';
  if (digits.startsWith('84')) return digits;
  if (digits.startsWith('0')) return `84${digits.slice(1)}`;
  return digits;
};

const EmployeesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: employees, isLoading, isError, refetch } = useEmployees();
  const { data: appRoles } = useAppRoles();
  const { data: salaryRoles } = useRoleSalaries();
  const createMutation = useCreateEmployee();
  const deleteMutation = useDeleteEmployee();
  const assignUserRolesMutation = useAssignUserRoles();
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [assignRoleModal, setAssignRoleModal] = useState<{ id: string; name: string } | null>(null);
  const [callDialog, setCallDialog] = useState<{ name: string; phone: string } | null>(null);
  const [assignRoleIds, setAssignRoleIds] = useState<string[]>([]);
  const [isAssignRoleDirty, setIsAssignRoleDirty] = useState(false);

  const { data: userRolesData } = useUserRoles(assignRoleModal?.id || '', !!assignRoleModal);

  const currentAssignRoleIds = useMemo(
    () => (isAssignRoleDirty ? assignRoleIds : userRolesData?.role_ids || []),
    [isAssignRoleDirty, assignRoleIds, userRolesData]
  );

  const roleOptions = useMemo(() =>
    appRoles?.map((role) => ({ value: role.id, label: getRoleDisplayName(role.role_name, role.role_key) })) || [],
    [appRoles]
  );

  const salaryLevelOptions = useMemo(
    () => (salaryRoles || []).map((role) => ({ value: role.role_key, label: role.role_name })),
    [salaryRoles]
  );

  const driverRoleOptions = useMemo(() => {
    return (appRoles || [])
      .filter((role) => isHeavyDriverRole(role.role_key, role.role_name) || isLightDriverRole(role.role_key, role.role_name))
      .map((role) => ({ value: role.id, label: getRoleDisplayName(role.role_name, role.role_key) }));
  }, [appRoles]);

  const roleNameByKey = useMemo(() => {
    const map: Record<string, string> = {};
    (appRoles || []).forEach((role) => {
      map[role.role_key] = getRoleDisplayName(role.role_name, role.role_key);
    });
    (salaryRoles || []).forEach((role) => {
      map[role.role_key] = role.role_name;
    });
    return map;
  }, [appRoles, salaryRoles]);

  const [isAdding, setIsAdding] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    full_name: '',
    phone: '',
    levelRole: '',
    roleIds: [] as string[]
  });

  const activeRoleOptions = useMemo(() => {
    if (inferSystemRole(formData.levelRole) === 'driver' && driverRoleOptions.length > 0) {
      return driverRoleOptions;
    }
    return roleOptions;
  }, [formData.levelRole, driverRoleOptions, roleOptions]);

  const handleOpenAdd = () => {
    setFormData({ password: '', full_name: '', phone: '', levelRole: salaryLevelOptions[0]?.value || '', roleIds: [] });
    setIsAdding(true);
    setIsClosing(false);
  };

  const handleCloseAdd = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsAdding(false);
      setIsClosing(false);
    }, 300);
  };

  const handleCreate = () => {
    if (!formData.phone || !formData.password || !formData.full_name || !formData.levelRole) return;

    createMutation.mutate(
      {
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone,
        role: formData.levelRole,
      },
      {
        onSuccess: (createdUser) => {
          if (formData.roleIds.length > 0) {
            assignUserRolesMutation.mutate(
              { userId: createdUser.id, roleIds: formData.roleIds },
              { onSuccess: () => handleCloseAdd() }
            );
            return;
          }
          handleCloseAdd();
        },
      }
    );
  };

  const handleOpenAssignRoles = (id: string, name: string) => {
    setAssignRoleModal({ id, name });
    setAssignRoleIds([]);
    setIsAssignRoleDirty(false);
  };

  const handleSaveAssignedRoles = () => {
    if (!assignRoleModal) return;
    assignUserRolesMutation.mutate(
      { userId: assignRoleModal.id, roleIds: currentAssignRoleIds },
      {
        onSuccess: () => {
          setAssignRoleModal(null);
          setAssignRoleIds([]);
          setIsAssignRoleDirty(false);
        },
      }
    );
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

  const handleOpenCallDialog = (name: string, phone?: string) => {
    const digits = extractPhoneDigits(phone);
    if (!digits) return;
    setCallDialog({ name, phone: digits });
  };

  const handleCallViaZalo = () => {
    if (!callDialog) return;
    window.open(`https://zalo.me/${callDialog.phone}`, '_blank', 'noopener,noreferrer');
    setCallDialog(null);
  };

  const handleCallViaWhatsApp = () => {
    if (!callDialog) return;
    const whatsappPhone = toWhatsappPhone(callDialog.phone);
    if (!whatsappPhone) return;
    window.open(`https://wa.me/${whatsappPhone}`, '_blank', 'noopener,noreferrer');
    setCallDialog(null);
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
                <div
                  key={e.id}
                  onClick={isAdmin ? () => navigate(`/hanh-chinh-nhan-su/nhan-su/${e.id}`) : undefined}
                  className={`${isAdmin ? 'cursor-pointer hover:shadow-md hover:border-primary/30' : 'cursor-default'} bg-white rounded-2xl border border-border shadow-sm transition-all duration-300 overflow-hidden flex flex-col md:flex-row items-center group relative p-4 pl-6`}
                >
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
                        {roleNameByKey[e.role] || e.role}
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
                  <div className="flex items-center gap-2 shrink-0 w-full md:w-auto md:gap-3 md:justify-end pt-4 md:pt-0 border-t md:border-t-0 border-border/50 text-[13px]">
                    {isAdmin && (
                      <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            navigate(`/hanh-chinh-nhan-su/nhan-su/${e.id}`);
                          }}
                          aria-label="Cập nhật hồ sơ"
                          title="Cập nhật hồ sơ"
                          className="flex-1 md:flex-none h-9 text-[12px] font-bold px-3 rounded-lg transition-all text-blue-600 hover:bg-blue-50 border border-border/50 hover:border-blue-200 flex items-center justify-center gap-1.5 whitespace-nowrap"
                        >
                          <Pencil size={13} />
                          <span className="hidden md:inline">Cập nhật hồ sơ</span>
                      </button>
                    )}
                    {isAdmin && (
                      <button
                          onClick={(ev) => { ev.stopPropagation(); handleOpenAssignRoles(e.id, e.full_name); }}
                          aria-label="Phân quyền"
                          title="Phân quyền"
                          className="flex-1 md:flex-none h-9 text-[12px] font-bold px-3 rounded-lg transition-all text-primary hover:bg-primary/10 border border-border/50 hover:border-primary/30 flex items-center justify-center gap-1.5 whitespace-nowrap"
                        >
                          <UserCog size={13} />
                          <span className="hidden md:inline">Phân quyền</span>
                      </button>
                    )}
                    <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          handleOpenCallDialog(e.full_name, e.phone);
                        }}
                        aria-label="Gọi"
                        title="Gọi"
                        disabled={!extractPhoneDigits(e.phone)}
                        className={`flex-1 md:flex-none h-9 text-[12px] font-bold px-3 rounded-lg transition-all border border-border/50 flex items-center justify-center gap-1.5 whitespace-nowrap ${
                          extractPhoneDigits(e.phone)
                            ? 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200'
                            : 'text-muted-foreground cursor-not-allowed opacity-60'
                        }`}
                      >
                        <PhoneCall size={13} />
                        <span className="hidden md:inline">Gọi</span>
                    </button>
                    {isAdmin && (
                      <button
                          onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id, e.full_name); }}
                          aria-label="Xóa"
                          title="Xóa"
                          className="flex-1 md:flex-none h-9 text-[12px] font-bold px-3 rounded-lg transition-all text-red-600 hover:bg-red-50 border border-border/50 hover:border-red-200 flex items-center justify-center gap-1.5 whitespace-nowrap"
                        >
                          <Trash2 size={13} />
                          <span className="hidden md:inline">Xóa</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Side Panel - Add Employee */}
      {(isAdding || isClosing) && createPortal(
        <div className="fixed inset-0 z-9999 flex justify-end overflow-hidden">
          <div 
            className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in'}`} 
            onClick={handleCloseAdd} 
          />
          
          <div className={`relative w-full max-w-125 bg-[#f8fafc] shadow-2xl flex flex-col h-screen border-l border-border transition-transform duration-300 ${isClosing ? 'translate-x-full' : 'translate-x-0 animate-in slide-in-from-right'}`}>
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
                    <label className="text-[13px] font-bold text-foreground">Số điện thoại <span className="text-red-500">*</span></label>
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
                    <label className="text-[13px] font-bold text-foreground">Cấp bậc nhân sự (tính lương)</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 z-10" size={16} />
                      <SearchableSelect
                        options={salaryLevelOptions}
                        value={formData.levelRole}
                        onValueChange={(val) => setFormData({ ...formData, levelRole: val || '' })}
                        placeholder="Chọn cấp bậc"
                        className="pl-10"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Cấp bậc này dùng cho chấm công, bảng lương và nghiệp vụ nhân sự.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-foreground">Quyền được cấp</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 z-10" size={16} />
                      <MultiSearchableSelect
                        options={activeRoleOptions}
                        value={formData.roleIds}
                        onValueChange={(val) =>
                          setFormData({
                            ...formData,
                            roleIds: inferSystemRole(formData.levelRole) === 'driver' ? val.slice(-1) : val,
                          })
                        }
                        placeholder="Chọn một hoặc nhiều quyền"
                        className="pl-10"
                      />
                      {inferSystemRole(formData.levelRole) === 'driver' && (
                        <p className="text-[11px] text-muted-foreground">Tài xế chỉ nên gán 1 trong 2 quyền: Tài xế xe tải lớn hoặc Tài xế xe tải nhỏ.</p>
                      )}
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
                disabled={createMutation.isPending || !formData.phone || !formData.password || !formData.full_name || !formData.levelRole}
                className={`flex items-center gap-2 px-8 py-2 rounded-xl text-[13px] font-bold shadow-lg transition-all active:scale-95 group ${
                  createMutation.isPending || assignUserRolesMutation.isPending || !formData.phone || !formData.password || !formData.full_name || !formData.levelRole
                    ? "bg-primary/50 text-white/60 cursor-not-allowed"
                    : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
                }`}
              >
                {createMutation.isPending || assignUserRolesMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={18} />}
                Thêm nhân sự
                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Role Assignment Dialog */}
      {assignRoleModal && createPortal(
        <div className="fixed inset-0 z-99999 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => !assignUserRolesMutation.isPending && setAssignRoleModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-border w-full max-w-130 mx-4 animate-in zoom-in-95 fade-in duration-200">
            <div className="p-6 border-b border-border">
              <h3 className="text-[17px] font-bold text-foreground">Cài đặt quyền nhân sự</h3>
              <p className="text-[13px] text-muted-foreground mt-1">Nhân sự: <span className="font-bold text-foreground">{assignRoleModal.name}</span></p>
            </div>

            <div className="p-6">
              <label className="text-[13px] font-bold text-foreground">Danh sách quyền</label>
              <div className="mt-2">
                <MultiSearchableSelect
                  options={roleOptions}
                  value={currentAssignRoleIds}
                  onValueChange={(val) => {
                    setAssignRoleIds(val);
                    setIsAssignRoleDirty(true);
                  }}
                  placeholder="Chọn quyền cho nhân sự"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 px-6 pb-6">
              <button
                onClick={() => setAssignRoleModal(null)}
                disabled={assignUserRolesMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground text-[13px] font-bold transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveAssignedRoles}
                disabled={assignUserRolesMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                {assignUserRolesMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <UserCog size={16} />}
                Lưu quyền
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Call Options Dialog */}
      {callDialog && createPortal(
        <div className="fixed inset-0 z-99999 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => setCallDialog(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-border w-full max-w-95 mx-4 animate-in zoom-in-95 fade-in duration-200">
            <div className="p-6 border-b border-border">
              <h3 className="text-[17px] font-bold text-foreground">Chọn cách gọi</h3>
              <p className="text-[13px] text-muted-foreground mt-1">
                Nhân sự: <span className="font-bold text-foreground">{callDialog.name}</span>
              </p>
              <p className="text-[13px] text-muted-foreground mt-1">
                Số điện thoại: <span className="font-bold text-foreground">{callDialog.phone}</span>
              </p>
            </div>

            <div className="p-6 grid grid-cols-1 gap-3">
              <button
                onClick={handleCallViaZalo}
                className="w-full px-4 py-3 rounded-xl bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 transition-all shadow-md flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} />
                Gọi qua Zalo
              </button>
              <button
                onClick={handleCallViaWhatsApp}
                className="w-full px-4 py-3 rounded-xl bg-emerald-600 text-white text-[13px] font-bold hover:bg-emerald-700 transition-all shadow-md flex items-center justify-center gap-2"
              >
                <PhoneCall size={16} />
                Gọi qua WhatsApp
              </button>
              <button
                onClick={() => setCallDialog(null)}
                className="w-full px-4 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground text-[13px] font-bold transition-all"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && createPortal(
        <div className="fixed inset-0 z-99999 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => !deleteMutation.isPending && setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-border w-full max-w-100 mx-4 animate-in zoom-in-95 fade-in duration-200">
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
