import { Request, Response, NextFunction } from 'express';
import { Role } from '../types';
import { errorResponse } from '../utils/response';
import { supabaseService } from '../config/supabase';

const normalizePagePath = (rawPath?: string): string => {
  if (!rawPath) return '';

  try {
    const decoded = decodeURIComponent(rawPath).trim();
    if (!decoded) return '';

    // Accept either full URL or pathname.
    const candidate = decoded.startsWith('http') ? new URL(decoded).pathname : decoded;
    if (!candidate.startsWith('/')) return '';

    return candidate.replace(/\/+$/, '') || '/';
  } catch {
    return '';
  }
};

const hasPagePermission = async (userId: string, pagePath: string): Promise<boolean> => {
  const { data: userRoles, error: userRolesError } = await supabaseService
    .from('app_user_roles')
    .select('role_id')
    .eq('user_id', userId);

  if (userRolesError || !userRoles?.length) return false;

  const roleIds = userRoles.map((item) => item.role_id).filter(Boolean);
  if (!roleIds.length) return false;

  const { data: rolePermissions, error: rolePermissionsError } = await supabaseService
    .from('app_role_permissions')
    .select('role_id, app_permissions!inner(page_path)')
    .in('role_id', roleIds)
    .eq('app_permissions.page_path', pagePath)
    .limit(1);

  if (rolePermissionsError) return false;
  return !!rolePermissions?.length;
};

export const requireRole = (...roles: Role[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json(errorResponse('Authentication required', 'UNAUTHORIZED'));
    }

    if (req.user.role === 'admin' || roles.includes(req.user.role)) {
      return next();
    }

    // RBAC fallback: allow operations if user has permission for current page.
    const pagePath = normalizePagePath(req.header('x-page-path') || req.header('referer') || '');
    if (pagePath) {
      const allowedByPagePermission = await hasPagePermission(req.user.id, pagePath);
      if (allowedByPagePermission) {
        return next();
      }
    }

    return res.status(403).json(errorResponse('Bạn chưa có quyền thao tác trên trang này', 'FORBIDDEN'));
  };
};
