import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { rolesApi } from '../../api/rolesApi';

export const rolesKeys = {
  all: ['roles'] as const,
  permissions: () => [...rolesKeys.all, 'permissions'] as const,
  list: () => [...rolesKeys.all, 'list'] as const,
  userRoles: (userId: string) => [...rolesKeys.all, 'user-roles', userId] as const,
  myPermissions: () => [...rolesKeys.all, 'my-permissions'] as const,
};

export function useAppPermissions() {
  return useQuery({
    queryKey: rolesKeys.permissions(),
    queryFn: rolesApi.getPermissions,
  });
}

export function useAppRoles() {
  return useQuery({
    queryKey: rolesKeys.list(),
    queryFn: rolesApi.getRoles,
  });
}

export function useCreateAppRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rolesApi.createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.list() });
      toast.success('Tạo quyền thành công');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Không thể tạo quyền'),
  });
}

export function useDeleteAppRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rolesApi.deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.list() });
      toast.success('Xóa quyền thành công');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Không thể xóa quyền'),
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, pagePaths }: { roleId: string; pagePaths: string[] }) =>
      rolesApi.updateRolePermissions(roleId, pagePaths),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.list() });
      toast.success('Đã cập nhật quyền truy cập trang');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Không thể cập nhật quyền'),
  });
}

export function useUserRoles(userId: string, enabled = true) {
  return useQuery({
    queryKey: rolesKeys.userRoles(userId),
    queryFn: () => rolesApi.getUserRoles(userId),
    enabled: enabled && !!userId,
  });
}

export function useAssignUserRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
      rolesApi.assignUserRoles(userId, roleIds),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.userRoles(variables.userId) });
      toast.success('Đã cập nhật quyền cho nhân sự');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Không thể cập nhật quyền nhân sự'),
  });
}

export function useMyPermissions(enabled = true) {
  return useQuery({
    queryKey: rolesKeys.myPermissions(),
    queryFn: rolesApi.getMyPermissions,
    enabled,
  });
}
