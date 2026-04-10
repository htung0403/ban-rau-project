import React, { useMemo, useState } from 'react';
import { Loader2, Plus, Save } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import {
  useAppPermissions,
  useAppRoles,
  useCreateAppRole,
  useUpdateRolePermissions,
} from '../../hooks/queries/useRoles';

const getRoleDisplayName = (roleName: string, roleKey?: string) => {
  if (roleKey === 'customer' || roleName.trim().toLowerCase() === 'customer') {
    return 'Khách hàng';
  }
  if (roleKey === 'driver' || roleName.trim().toLowerCase() === 'driver') {
    return 'Tài xế';
  }
  if (roleKey === 'manager' || roleName.trim().toLowerCase() === 'manager') {
    return 'Quản lý';
  }
  if (roleKey === 'staff' || roleName.trim().toLowerCase() === 'staff') {
    return 'Nhân viên';
  }
  return roleName;
};

const RolePermissionsPage: React.FC = () => {
  const { data: permissions, isLoading: permissionsLoading, isError: permissionsError, refetch: refetchPermissions } = useAppPermissions();
  const { data: roles, isLoading: rolesLoading, isError: rolesError, refetch: refetchRoles } = useAppRoles();
  const createRoleMutation = useCreateAppRole();
  const updateRolePermissionsMutation = useUpdateRolePermissions();

  const [newRoleName, setNewRoleName] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<string[]>([]);

  const groupedPermissions = useMemo(() => {
    const source = permissions || [];
    return source.reduce<Record<string, typeof source>>((acc, item) => {
      const key = item.module_name || 'Khac';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [permissions]);

  const effectiveRoleId = selectedRoleId || roles?.[0]?.id || '';
  const currentRole = useMemo(() => (roles || []).find((role) => role.id === effectiveRoleId), [roles, effectiveRoleId]);

  const handleSelectRole = (roleId: string) => {
    setSelectedRoleId(roleId);
    const role = (roles || []).find((item) => item.id === roleId);
    setSelectedPermissionKeys(role?.permission_keys || []);
  };

  const handleTogglePermission = (permissionKey: string) => {
    setSelectedPermissionKeys((prev) =>
      prev.includes(permissionKey)
        ? prev.filter((key) => key !== permissionKey)
        : [...prev, permissionKey]
    );
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;

    createRoleMutation.mutate(
      { role_name: newRoleName.trim() },
      {
        onSuccess: (created) => {
          setNewRoleName('');
          setSelectedRoleId(created.id);
          setSelectedPermissionKeys([]);
        },
      }
    );
  };

  const handleSavePermissions = () => {
    if (!effectiveRoleId) return;
    updateRolePermissionsMutation.mutate({
      roleId: effectiveRoleId,
      permissionKeys: selectedPermissionKeys,
    });
  };

  const isLoading = permissionsLoading || rolesLoading;
  const isError = permissionsError || rolesError;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <PageHeader title="Phân quyền" description="Tạo quyền và cấp quyền truy cập + thao tác theo từng trang trong hệ thống" backPath="/hanh-chinh-nhan-su" />

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 flex-1">
          <LoadingSkeleton rows={8} columns={3} />
        </div>
      ) : isError ? (
        <div className="bg-white rounded-2xl border border-border shadow-sm flex-1">
          <ErrorState onRetry={() => { refetchPermissions(); refetchRoles(); }} />
        </div>
      ) : !permissions?.length ? (
        <div className="bg-white rounded-2xl border border-border shadow-sm flex-1">
          <EmptyState title="Chưa có dữ liệu trang hệ thống" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto custom-scrollbar pb-6 px-1">
          <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-4 h-fit">
              <h2 className="text-[14px] font-bold text-foreground">Danh sách quyền</h2>

              <div className="space-y-2">
                <label className="text-[12px] font-bold text-muted-foreground uppercase">Tạo tên quyền mới</label>
                <div className="flex items-center gap-2">
                  <input
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="VD: Kế toán trưởng"
                    className="flex-1 px-3 py-2 rounded-xl border border-border bg-muted/10 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/10"
                  />
                  <button
                    onClick={handleCreateRole}
                    disabled={createRoleMutation.isPending || !newRoleName.trim()}
                    className="px-3 py-2 rounded-xl bg-primary text-white text-[12px] font-bold hover:bg-primary/90 disabled:opacity-60 inline-flex items-center gap-1.5"
                  >
                    {createRoleMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Tạo
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {(roles || []).map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleSelectRole(role.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      effectiveRoleId === role.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40 bg-white'
                    }`}
                  >
                    <div className="text-[13px] font-bold text-foreground">{getRoleDisplayName(role.role_name, role.role_key)}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">{role.permission_keys?.length || 0} trang đã cấp</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-sm p-4 md:p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-bold text-foreground">Cấp quyền sử dụng trang</h2>
                  <p className="text-[12px] text-muted-foreground mt-1">
                    Vai trò đang chọn: <span className="font-bold text-foreground">{currentRole ? getRoleDisplayName(currentRole.role_name, currentRole.role_key) : 'Chưa chọn'}</span>
                  </p>
                </div>
                <button
                  onClick={handleSavePermissions}
                  disabled={!effectiveRoleId || updateRolePermissionsMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {updateRolePermissionsMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Lưu phân quyền
                </button>
              </div>

              <div className="space-y-4">
                {Object.entries(groupedPermissions).map(([moduleName, items]) => (
                  <div key={moduleName} className="rounded-xl border border-border/80 overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/10 border-b border-border text-[12px] font-bold uppercase tracking-wide text-primary">
                      {moduleName}
                    </div>
                    <div className="divide-y divide-border/60">
                      {items.map((permission) => {
                        const checked = selectedPermissionKeys.includes(permission.permission_key);
                        return (
                          <label key={permission.id} className="flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/5">
                            <div>
                              <div className="text-[13px] font-semibold text-foreground">{permission.page_name}</div>
                              <div className="text-[11px] text-muted-foreground">{permission.page_path}</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleTogglePermission(permission.permission_key)}
                              className="w-4 h-4 accent-primary"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolePermissionsPage;
