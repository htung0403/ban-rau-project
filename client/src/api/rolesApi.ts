import axiosClient from './axiosClient';
import type { AppPermission, AppRole } from '../types';

interface UserRolesResponse {
  user_id: string;
  role_ids: string[];
  roles: AppRole[];
}

interface MyPermissionsResponse {
  user_id: string;
  page_paths: string[];
}

export const rolesApi = {
  getPermissions: async () => {
    const { data } = await axiosClient.get<AppPermission[]>('/roles/permissions');
    return data;
  },

  getRoles: async () => {
    const { data } = await axiosClient.get<AppRole[]>('/roles');
    return data;
  },

  createRole: async (payload: { role_name: string; role_key?: string; description?: string }) => {
    const { data } = await axiosClient.post<AppRole>('/roles', payload);
    return data;
  },

  deleteRole: async (roleId: string) => {
    const { data } = await axiosClient.delete(`/roles/${roleId}`);
    return data;
  },

  updateRolePermissions: async (roleId: string, permissionKeys: string[]) => {
    const { data } = await axiosClient.put(`/roles/${roleId}/permissions`, {
      permission_keys: permissionKeys,
    });
    return data;
  },

  getUserRoles: async (userId: string) => {
    const { data } = await axiosClient.get<UserRolesResponse>(`/roles/users/${userId}`);
    return data;
  },

  getMyPermissions: async () => {
    const { data } = await axiosClient.get<MyPermissionsResponse>('/roles/my-permissions');
    return data;
  },

  assignUserRoles: async (userId: string, roleIds: string[]) => {
    const { data } = await axiosClient.put(`/roles/users/${userId}`, {
      role_ids: roleIds,
    });
    return data;
  },
};
