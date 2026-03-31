import { Request, Response, NextFunction } from 'express';
import { supabaseService } from '../config/supabase';
import { errorResponse } from '../utils/response';
import { UserPayload, Role } from '../types';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json(errorResponse('No token provided', 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await (supabaseService.auth as any).getUser(token);

    if (error || !user) {
      return res.status(401).json(errorResponse('Invalid or expired token', 'UNAUTHORIZED'));
    }

    // Fetch user profile to get role and other metadata
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json(errorResponse('User profile not found', 'UNAUTHORIZED'));
    }

    req.user = {
      id: user.id,
      email: user.email!,
      role: profile.role as Role,
      full_name: profile.full_name,
    };
    req.token = token;

    next();
  } catch (err: any) {
    console.error('Auth error:', err);
    return res.status(500).json(errorResponse('Internal server error during authentication', 'ERROR'));
  }
};
