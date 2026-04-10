import { Request, Response } from 'express';
import { z } from 'zod';
import { RolesService } from './roles.service';
import { successResponse, errorResponse } from '../../utils/response';

const createRoleSchema = z.object({
  role_name: z.string().min(1, 'Role name is required'),
  role_key: z.string().optional(),
  description: z.string().optional(),
});

const updateRolePermissionsSchema = z.object({
  permission_keys: z.array(z.string()).default([]),
});

const assignUserRolesSchema = z.object({
  role_ids: z.array(z.string().uuid()).default([]),
});

export class RolesController {
  static async getPermissions(req: Request, res: Response) {
    try {
      const data = await RolesService.getPermissions();
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getRoles(req: Request, res: Response) {
    try {
      const data = await RolesService.getRoles();
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async createRole(req: Request, res: Response) {
    try {
      const validated = createRoleSchema.parse(req.body) as { role_name: string; role_key?: string; description?: string };
      const data = await RolesService.createRole(validated);
      return res.status(201).json(successResponse(data, 'Role created'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async updateRolePermissions(req: Request, res: Response) {
    try {
      const validated = updateRolePermissionsSchema.parse(req.body);
      const data = await RolesService.updateRolePermissions(req.params.roleId as string, validated.permission_keys);
      return res.status(200).json(successResponse(data, 'Role permissions updated'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async getUserRoles(req: Request, res: Response) {
    try {
      const data = await RolesService.getUserRoles(req.params.userId as string);
      return res.status(200).json(successResponse(data));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async assignUserRoles(req: Request, res: Response) {
    try {
      const validated = assignUserRolesSchema.parse(req.body);
      const data = await RolesService.assignUserRoles(req.params.userId as string, validated.role_ids);
      return res.status(200).json(successResponse(data, 'User roles updated'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }
}
