import { Request, Response, NextFunction } from 'express';
import { supabaseService } from '../config/supabase';
import { errorResponse } from '../utils/response';
import { UserPayload, Role } from '../types';

// Simple in-memory cache for profiles to reduce DB round-trips
// Key: userId, Value: { profile: any, timestamp: number }
const profileCache = new Map<string, { profile: any; timestamp: number }>();
// Cache for token validation to skip Supabase Auth HTTP requests
const tokenCache = new Map<string, { user: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json(errorResponse('No token provided', 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];
  const start = Date.now();

  try {
    // 1. Verify token & get user - Use Cache to avoid HTTP roundtrip
    const authStart = Date.now();
    let user: any = null;
    const cachedToken = tokenCache.get(token);
    const now = Date.now();

    if (cachedToken && (now - cachedToken.timestamp < CACHE_TTL)) {
      user = cachedToken.user;
    } else {
      const { data: authData, error } = await (supabaseService.auth as any).getUser(token);
      if (error || !authData?.user) {
        return res.status(401).json(errorResponse('Invalid or expired token', 'UNAUTHORIZED'));
      }
      user = authData.user;
      tokenCache.set(token, { user, timestamp: now });
    }
    const authEnd = Date.now();
    
    const userId = user.id;
    const email = user.email;

    // 2. Get profile - Check cache first to save a DB round-trip
    let profile: any = null;
    const cachedProfile = profileCache.get(userId);

    if (cachedProfile && (now - cachedProfile.timestamp < CACHE_TTL)) {
      profile = cachedProfile.profile;
    } else {
      const profileStart = Date.now();
      const { data, error: profileError } = await supabaseService
        .from('profiles')
        .select('role, full_name')
        .eq('id', userId)
        .single();
      const profileEnd = Date.now();
      
      if (profileError || !data) {
        return res.status(401).json(errorResponse('User profile not found', 'UNAUTHORIZED'));
      }
      
      profile = data;
      profileCache.set(userId, { profile: data, timestamp: now });
      
      const dbTime = profileEnd - profileStart;
      if (dbTime > 500) {
        console.warn(`[PERF] Profile DB query was slow: ${dbTime}ms`);
      }
    }

    req.user = {
      id: userId,
      email: email || '',
      role: profile.role as Role,
      full_name: profile.full_name,
    };
    req.token = token;

    const totalTime = Date.now() - start;
    if (totalTime > 200) {
      console.warn(`[PERF WARNING] authMiddleware took ${totalTime}ms (auth local/fetch: ${authEnd - authStart}ms, profile: ${cachedProfile ? 'CACHED' : 'FETCHED'})`);
    }

    next();
  } catch (err: any) {
    console.error('Auth error:', err);
    return res.status(500).json(errorResponse('Internal server error during authentication', 'ERROR'));
  }
};
