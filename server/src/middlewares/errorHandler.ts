import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { errorResponse } from '../utils/response';

export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Unhandled error:', err);

  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  res.status(status).json(errorResponse(message, code));
};
