import { supabaseService } from '../../config/supabase';

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
}
