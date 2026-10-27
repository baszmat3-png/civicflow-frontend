import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Sanitize NODE_ENV safely
const rawNodeEnv = (process.env.NODE_ENV || '').trim().toLowerCase();
const nodeEnv = (rawNodeEnv === 'test' || rawNodeEnv === 'development') ? rawNodeEnv : 'production';

const rawSmtpUser = (process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER || '').trim();
const rawSmtpPass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_PASS || process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD || '').trim().replace(/\s+/g, '');
const rawSmtpHost = (process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com').trim();
const rawSmtpPort = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
const rawSmtpFrom = (process.env.SMTP_FROM || (rawSmtpUser ? `"منظومة CivicFlow" <${rawSmtpUser}>` : '"منظومة CivicFlow" <no-reply@civicflow.gov>')).trim();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  PORT: z.coerce.number().default(5000),
  FRONTEND_URL: z.string().default('https://civicflow-frontend-1-hoy9.onrender.com'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters').optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().default('365d'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters').optional(),
  JWT_REFRESH_EXPIRES_IN: z.string().default('365d'),
  STORAGE_PROVIDER: z.enum(['local', 's3', 'cloudinary']).default('local'),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(50),
  WHATSAPP_PROVIDER: z.string().default('wpsender'),
  WHATSAPP_API_URL: z.string().default('https://backendapi.wpsenderx.com/api/messages/send'),
  WHATSAPP_API_KEY: z.string().default(''),
  WHATSAPP_SENDER_PHONE: z.string().default(''),
  ULTRAMSG_INSTANCE_ID: z.string().default(''),
  ULTRAMSG_TOKEN: z.string().default(''),
  SMTP_HOST: z.string().default(rawSmtpHost),
  SMTP_PORT: z.coerce.number().default(rawSmtpPort),
  SMTP_USER: z.string().default(rawSmtpUser),
  SMTP_PASS: z.string().default(rawSmtpPass),
  SMTP_FROM: z.string().default(rawSmtpFrom),
  BREVO_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAILJS_SERVICE_ID: z.string().default('service_lvsou99'),
  EMAILJS_TEMPLATE_ID: z.string().default('template_sbp4dbc'),
  EMAILJS_PUBLIC_KEY: z.string().default('OwmoePpWQZnCiaCkf'),
  EMAILJS_PRIVATE_KEY: z.string().default('U9uC6g2XpWD4Vr82w15eV'),
  MAINTENANCE_MODE: z
    .union([z.boolean(), z.string()])
    .transform((val) => {
      if (typeof val === 'boolean') return val;
      const str = String(val).trim().toLowerCase();
      return str === 'true' || str === '1' || str === 'yes';
    })
    .default(false)
});

// OTP security settings (safe production defaults enforced)
const otpSchema = z.object({
  OTP_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(5),
  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  OTP_LOCK_MINUTES: z.coerce.number().int().min(1).max(60).default(10),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(30).max(300).default(60),
  OTP_BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(14).default(10)
});

const parsed = envSchema.safeParse({
  ...process.env,
  NODE_ENV: nodeEnv
});

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Environment configuration validation failed');
}

const otpParsed = otpSchema.safeParse(process.env);
if (!otpParsed.success) {
  console.error('❌ Invalid OTP environment variables:', otpParsed.error.format());
  throw new Error('OTP configuration validation failed');
}

// JWT secrets must come from the environment. In production a missing secret is a hard error
// (a default committed to git would let anyone forge tokens); in dev/test a random one is used.
import crypto from 'crypto';
const resolveSecret = (name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET'): string => {
  const v = parsed.data[name];
  if (v) return v;
  if (parsed.data.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production (set it in the Render dashboard)`);
  }
  console.warn(`⚠️ ${name} not set: using a random per-process secret (sessions reset on restart).`);
  return crypto.randomBytes(48).toString('hex');
};

export const env = {
  ...parsed.data,
  ...otpParsed.data,
  JWT_ACCESS_SECRET: resolveSecret('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: resolveSecret('JWT_REFRESH_SECRET')
};
