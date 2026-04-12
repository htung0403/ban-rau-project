import { supabaseService } from '../../config/supabase';
import { Role } from '../../types';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');

export class RolesService {
  private static async getPagePathsByRoleIds(roleIds: string[]) {
    if (!roleIds.length) return [] as string[];

    const { data: rolePermissions, error: rolePermissionsError } = await supabaseService
      .from('app_role_permissions')
      .select('permission_id')
      .in('role_id', roleIds);

    if (rolePermissionsError) throw rolePermissionsError;

    const permissionIds = (rolePermissions || []).map((item) => item.permission_id).filter(Boolean);
    if (!permissionIds.length) return [] as string[];

    const { data: permissions, error: permissionsError } = await supabaseService
      .from('app_permissions')
      .select('page_path')
      .in('id', permissionIds)
      .eq('is_active', true);

    if (permissionsError) throw permissionsError;

    return Array.from(new Set((permissions || []).map((item) => item.page_path).filter(Boolean)));
  }

  private static async getPagePathsByRoleKey(roleKey: Role) {
    const { data: role, error: roleError } = await supabaseService
      .from('app_roles')
      .select('id')
      .eq('role_key', roleKey)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (roleError || !role?.id) {
      return [] as string[];
    }

    return this.getPagePathsByRoleIds([role.id]);
  }

  static async getPermissions() {
    const { data, error } = await supabaseService
      .from('app_permissions')
      .select('*')
      .order('module_name', { ascending: true })
      .order('page_name', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async getRoles() {
    const { data, error } = await supabaseService
      .from('app_roles')
      .select('*, app_role_permissions(permission_id, app_permissions(permission_key, page_path, page_name, module_key, module_name))')
      .eq('is_active', true)
      .order('is_system', { ascending: false })
      .order('role_name', { ascending: true });

    if (error) throw error;

    return (data || []).map((role: any) => ({
      ...role,
      permission_keys: (role.app_role_permissions || [])
        .map((rp: any) => rp.app_permissions?.permission_key)
        .filter(Boolean),
    }));
  }

  static async createRole(payload: { role_name: string; role_key?: string; description?: string }) {
    const roleKey = payload.role_key ? slugify(payload.role_key) : slugify(payload.role_name);
    const { data, error } = await supabaseService
      .from('app_roles')
      .insert({
        role_key: roleKey,
        role_name: payload.role_name,
        description: payload.description,
        is_system: false,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteRole(roleId: string) {
    const { data: role, error: roleError } = await supabaseService
      .from('app_roles')
      .select('id, role_name, is_system, is_active')
      .eq('id', roleId)
      .limit(1)
      .maybeSingle();

    if (roleError) throw roleError;
    if (!role) throw new Error('Không tìm thấy quyền');
    if (!role.is_active) return { id: roleId, deleted: true };

    const { error: userRoleDeleteError } = await supabaseService
      .from('app_user_roles')
      .delete()
      .eq('role_id', roleId);

    if (userRoleDeleteError) throw userRoleDeleteError;

    const { error: rolePermissionDeleteError } = await supabaseService
      .from('app_role_permissions')
      .delete()
      .eq('role_id', roleId);

    if (rolePermissionDeleteError) throw rolePermissionDeleteError;

    const { error: deactivateError } = await supabaseService
      .from('app_roles')
      .update({ is_active: false })
      .eq('id', roleId);

    if (deactivateError) throw deactivateError;

    return { id: roleId, role_name: role.role_name, deleted: true };
  }

  static async updateRolePermissions(roleId: string, permissionKeys: string[]) {
    const { data: permissionRows, error: permissionError } = await supabaseService
      .from('app_permissions')
      .select('id, permission_key')
      .in('permission_key', permissionKeys.length ? permissionKeys : ['__none__']);

    if (permissionError) throw permissionError;

    const permissionIds = (permissionRows || []).map((p) => p.id);

    const { error: deleteError } = await supabaseService
      .from('app_role_permissions')
      .delete()
      .eq('role_id', roleId);

    if (deleteError) throw deleteError;

    if (!permissionIds.length) {
      return { role_id: roleId, permission_keys: [] };
    }

    const rows = permissionIds.map((permissionId) => ({ role_id: roleId, permission_id: permissionId }));
    const { error: insertError } = await supabaseService.from('app_role_permissions').insert(rows);

    if (insertError) throw insertError;

    return { role_id: roleId, permission_keys: permissionKeys };
  }

  static async getUserRoles(userId: string) {
    const { data, error } = await supabaseService
      .from('app_user_roles')
      .select('role_id, app_roles(id, role_key, role_name, description, is_system, is_active)')
      .eq('user_id', userId);

    if (error) throw error;

    return {
      user_id: userId,
      roles: (data || []).map((r: any) => r.app_roles).filter(Boolean),
      role_ids: (data || []).map((r: any) => r.role_id),
    };
  }

  static async assignUserRoles(userId: string, roleIds: string[]) {
    const { error: deleteError } = await supabaseService
      .from('app_user_roles')
      .delete()
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    if (!roleIds.length) {
      return { user_id: userId, role_ids: [] };
    }

    const rows = roleIds.map((roleId) => ({ user_id: userId, role_id: roleId }));
    const { error: insertError } = await supabaseService.from('app_user_roles').insert(rows);

    if (insertError) throw insertError;

    return { user_id: userId, role_ids: roleIds };
  }

  static async getMyPermissions(userId: string, profileRole: Role) {
    const { data: userRoles, error: userRolesError } = await supabaseService
      .from('app_user_roles')
      .select('role_id')
      .eq('user_id', userId);

    if (userRolesError) throw userRolesError;

    const roleIds = (userRoles || []).map((item) => item.role_id).filter(Boolean);

    // Prefer explicit role assignments; fallback to legacy profile role mapping when absent.
    const page_paths = roleIds.length
      ? await this.getPagePathsByRoleIds(roleIds)
      : await this.getPagePathsByRoleKey(profileRole);

    return { user_id: userId, page_paths };
  }
}
