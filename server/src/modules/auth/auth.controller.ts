import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { successResponse, errorResponse } from '../../utils/response';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const changePasswordSchema = z.object({
  newPassword: z.string().min(6),
});

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const validated = loginSchema.parse(req.body);
      const data = await AuthService.login(validated.email, validated.password);
      return res.status(200).json(successResponse(data, 'Login successful'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message || 'Login failed'));
    }
  }

  static async me(req: Request, res: Response) {
    try {
      if (!req.user) throw new Error('Not authenticated');
      return res.status(200).json(successResponse(req.user));
    } catch (err: any) {
      return res.status(401).json(errorResponse(err.message));
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      if (req.token) {
        await AuthService.logout(req.token);
      }
      return res.status(200).json(successResponse(null, 'Logged out successfully'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      const validated = changePasswordSchema.parse(req.body);
      if (!req.user) throw new Error('Not authenticated');
      await AuthService.updatePassword(req.user.id, validated.newPassword);
      return res.status(200).json(successResponse(null, 'Password updated successfully'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      if (!req.user) throw new Error('Not authenticated');
      const payload = req.body;
      await AuthService.updateProfile(req.user.id, payload);
      return res.status(200).json(successResponse(null, 'Profile updated successfully'));
    } catch (err: any) {
      return res.status(400).json(errorResponse(err.message));
    }
  }
}
