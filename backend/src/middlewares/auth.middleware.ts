import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token.js';
import { prisma } from '../config/database.js';
import { AppError } from './error.middleware.js';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  roleId: string;
  role: string;
  department?: string | null;
  status: string;
  avatarUrl?: string | null;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    // Check Authorization header, cookies, or query parameter
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.query && req.query.token) {
      token = String(req.query.token);
    }

    if (!token) {
      throw new AppError('يرجى تسجيل الدخول للوصول إلى هذا المورد', 401, 'UNAUTHORIZED');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('انتهت صلاحية جلسة الدخول (Token Expired)', 401, 'TOKEN_EXPIRED');
      }
      throw new AppError('رمز الدخول غير صالح (Invalid Token)', 401, 'INVALID_TOKEN');
    }

    // Retrieve user from DB with Role and Permissions
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new AppError('المستخدم صاحب هذا الحساب لم يعد موجوداً في النظام', 401, 'USER_NOT_FOUND');
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('تم تعطيل هذا الحساب. يرجى مراجعة مدير النظام', 403, 'ACCOUNT_INACTIVE');
    }

    const permissions = user.role.rolePermissions.map((rp) => rp.permission.key);

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      roleId: user.roleId,
      role: user.role.name,
      department: user.department,
      status: user.status,
      avatarUrl: user.avatarUrl,
      permissions
    };

    next();
  } catch (error) {
    next(error);
  }
};