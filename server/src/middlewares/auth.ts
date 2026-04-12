import { Request, Response, NextFunction } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { supabaseService } from '../config/supabase';
import { env } from '../config/env';
import { errorResponse } from '../utils/response';
import { UserPayload, Role } from '../types';

const profileCache = new Map<string, { profile: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json(errorResponse('No token provided', 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];
  const start = Date.now();

  try {
    let userId: string;
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      userId = decoded.sub as string;
      if (!userId) {
        return res.status(401).json(errorResponse('Invalid or expired token', 'UNAUTHORIZED'));
      }
    } catch {
      return res.status(401).json(errorResponse('Invalid or expired token', 'UNAUTHORIZED'));
    }

    const now = Date.now();
    let profile: any = null;
    const cachedProfile = profileCache.get(userId);

    if (cachedProfile && now - cachedProfile.timestamp < CACHE_TTL) {
      profile = cachedProfile.profile;
    } else {
      const { data, error: profileError } = await supabaseService
        .from('profiles')
        .select('role, full_name, email, personal_email, avatar_url')
        .eq('id', userId)
        .single();

      if (profileError || !data) {
        return res.status(401).json(errorResponse('User profile not found', 'UNAUTHORIZED'));
      }

      profile = data;
      profileCache.set(userId, { profile: data, timestamp: now });
    }

    const displayEmail = (profile.email || profile.personal_email || '') as string;

    req.user = {
      id: userId,
      email: displayEmail,
      role: profile.role as Role,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url ?? undefined,
    } as UserPayload;
    req.token = token;

    const totalTime = Date.now() - start;
    if (totalTime > 200) {
      console.warn(`[PERF WARNING] authMiddleware took ${totalTime}ms`);
    }

    next();
  } catch (err: any) {
    console.error('Auth error:', err);
    return res.status(500).json(errorResponse('Internal server error during authentication', 'ERROR'));
  }
};
