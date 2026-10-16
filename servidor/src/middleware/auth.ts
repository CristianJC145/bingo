import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../services/authStore';

export const JWT_SECRET = process.env.BINGO_JWT_SECRET ?? 'bingo-asodifi-secret-key';
export const TOKEN_TTL = '12h';

export interface TokenPayload {
  id: number;
  username: string;
  role: UserRole;
  fullName: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const signToken = (payload: TokenPayload): string => jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });

export const requireAuth = (request: Request, response: Response, next: NextFunction) => {
  const header = request.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    response.status(401).json({ message: 'Debes iniciar sesión.' });
    return;
  }
  try {
    request.user = jwt.verify(token, JWT_SECRET) as TokenPayload;
    next();
  } catch {
    response.status(401).json({ message: 'Tu sesión expiró. Vuelve a iniciar sesión.' });
  }
};

export const requireAdmin = (request: Request, response: Response, next: NextFunction) => {
  if (request.user?.role !== 'admin') {
    response.status(403).json({ message: 'Solo el administrador puede realizar esta acción.' });
    return;
  }
  next();
};
