import { Request, Response, NextFunction } from 'express';
import { Role } from '../types';
import { errorResponse } from '../utils/response';

export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json(errorResponse('Authentication required', 'UNAUTHORIZED'));
    }

    if (req.user.role !== 'admin' && !roles.includes(req.user.role)) {
      return res.status(403).json(errorResponse('Permission denied', 'FORBIDDEN'));
    }

    next();
  };
};
