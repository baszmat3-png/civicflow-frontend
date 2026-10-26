import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';

/**
 * WhatsApp gateway configuration managed from the admin portal.
 * Stored in SystemSetting('whatsappGateway'); environment variables are only a fallback,
 * so credentials can be entered/rotated without touching the Render dashboard or redeploying.
 */

export type GatewayProvider = 'wpsender' | 'ultramsg';

export interface GatewayConfig {
  enabled: boolean;
  provider: GatewayProvider;
  apiUrl: string;
  apiKey: string;
  senderPhone: string;
  ultraInstanceId: string;
  ultraToken: string;
  lastTestAt?: string | null;
  lastTestOk?: boolean | null;
  lastTestMessage?: string | null;
}

export const DEFAULT_WPSENDER_URL = 'https://backendapi.wpsenderx.com/api/messages/send';
const SETTING_KEY = 'whatsappGateway';
const CACHE_TTL_MS = 30_000;

let cache: { value: GatewayConfig; at: number } | null = null;

const envFallback = (): GatewayConfig => ({
  enabled: true,
  provider: (env.WHATSAPP_PROVIDER === 'ultramsg' ? 'ultramsg' : 'wpsender') as GatewayProvider,
  apiUrl: (process.env.WHATSAPP_API_URL || env.WHATSAPP_API_URL || DEFAULT_WPSENDER_URL).trim(),
  apiKey: (process.env.WHATSAPP_API_KEY || env.WHATSAPP_API_KEY || '').trim(),
  senderPhone: (process.env.WHATSAPP_SENDER_PHONE || env.WHATSAPP_SENDER_PHONE || '').trim(),
  ultraInstanceId: (process.env.ULTRAMSG_INSTANCE_ID || env.ULTRAMSG_INSTANCE_ID || '').trim(),
  ultraToken: (process.env.ULTRAMSG_TOKEN || env.ULTRAMSG_TOKEN || '').trim()
});

export const invalidateGatewayCache = () => {
  cache = null;
};

/** Effective config: portal values win; empty portal fields fall back to env vars. */
export const getGatewayConfig = async (): Promise<GatewayConfig> => {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;

  const base = envFallback();
  let stored: Partial<GatewayConfig> = {};
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
    stored = ((row?.value as any) || {}) as Partial<GatewayConfig>;
  } catch {
    /* DB hiccup: fall back to env so sending keeps working */
  }

  const pick = (k: keyof GatewayConfig) => {
    const v = stored[k];
    return typeof v === 'string' && v.trim() ? v.trim() : (base as any)[k];
  };

  const value: GatewayConfig = {
    enabled: typeof stored.enabled === 'boolean' ? stored.enabled : base.enabled,
    provider: (stored.provider === 'ultramsg' || stored.provider === 'wpsender' ? stored.provider : base.provider) as GatewayProvider,
    apiUrl: pick('apiUrl'),
    apiKey: pick('apiKey'),
    senderPhone: pick('senderPhone'),
    ultraInstanceId: pick('ultraInstanceId'),
    ultraToken: pick('ultraToken'),
    lastTestAt: stored.lastTestAt ?? null,
    lastTestOk: stored.lastTestOk ?? null,
    lastTestMessage: stored.lastTestMessage ?? null
  };
  cache = { value, at: Date.now() };
  return value;
};

export const maskSecret = (s: string): string => {
  if (!s) return '';
  if (s.length <= 8) return '••••••••';
  return `${s.slice(0, 4)}••••••••${s.slice(-4)}`;
};

/** Safe view for the browser: secrets are masked, never returned in full */
export const toPublicView = (c: GatewayConfig) => ({
  enabled: c.enabled,
  provider: c.provider,
  apiUrl: c.apiUrl,
  apiKeyMasked: maskSecret(c.apiKey),
  hasApiKey: Boolean(c.apiKey),
  senderPhone: c.senderPhone,
  ultraInstanceId: c.ultraInstanceId,
  ultraTokenMasked: maskSecret(c.ultraToken),
  hasUltraToken: Boolean(c.ultraToken),
  configured: c.provider === 'ultramsg' ? Boolean(c.ultraInstanceId && c.ultraToken) : Boolean(c.apiKey),
  lastTestAt: c.lastTestAt ?? null,
  lastTestOk: c.lastTestOk ?? null,
  lastTestMessage: c.lastTestMessage ?? null
});

export interface GatewayUpdate {
  enabled?: boolean;
  provider?: GatewayProvider;
  apiUrl?: string;
  apiKey?: string; // omitted/empty = keep the stored secret
  senderPhone?: string;
  ultraInstanceId?: string;
  ultraToken?: string; // omitted/empty = keep the stored secret
}

export const saveGatewayConfig = async (update: GatewayUpdate) => {
  const row = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
  const current = ((row?.value as any) || {}) as Partial<GatewayConfig>;

  const next: Partial<GatewayConfig> = { ...current };
  if (typeof update.enabled === 'boolean') next.enabled = update.enabled;
  if (update.provider) next.provider = update.provider;
  if (update.apiUrl !== undefined) next.apiUrl = update.apiUrl.trim();
  if (update.senderPhone !== undefined) next.senderPhone = update.senderPhone.trim();
  if (update.ultraInstanceId !== undefined) next.ultraInstanceId = update.ultraInstanceId.trim();
  if (update.apiKey && update.apiKey.trim()) next.apiKey = update.apiKey.trim();
  if (update.ultraToken && update.ultraToken.trim()) next.ultraToken = update.ultraToken.trim();

  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: next as any },
    update: { value: next as any }
  });
  invalidateGatewayCache();
};

export const recordTestResult = async (ok: boolean, message: string) => {
  const row = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
  const current = ((row?.value as any) || {}) as Partial<GatewayConfig>;
  const next = { ...current, lastTestAt: new Date().toISOString(), lastTestOk: ok, lastTestMessage: message.slice(0, 300) };
  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: next as any },
    update: { value: next as any }
  });
  invalidateGatewayCache();
};
