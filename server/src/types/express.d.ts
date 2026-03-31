import 'express';

declare module 'express' {
  export interface Request {
    user?: import('./index').UserPayload;
    token?: string;
  }
}
