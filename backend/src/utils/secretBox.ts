import crypto from 'crypto';
import { env } from '../config/env.js';

/**
 * AES-256-GCM helpers for encrypting backups at rest.
 * Key = BACKUP_ENCRYPTION_KEY (recommended) else derived from the JWT access secret.
 */

const getKey = (): Buffer => {
  const material = process.env.BACKUP_ENCRYPTION_KEY || env.JWT_ACCESS_SECRET;
  return crypto.scryptSync(material, 'civicflow-backup-v1', 32);
};

export interface EncryptedEnvelope {
  encrypted: true;
  alg: 'aes-256-gcm';
  iv: string;
  tag: string;
  ciphertext: string;
}

export const encryptText = (plain: string): EncryptedEnvelope => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return {
    encrypted: true,
    alg: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64')
  };
};

export const isEncryptedEnvelope = (v: any): v is EncryptedEnvelope =>
  Boolean(v && v.encrypted === true && v.alg === 'aes-256-gcm' && v.iv && v.tag && v.ciphertext);

export const decryptEnvelope = (env_: EncryptedEnvelope): string => {
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(env_.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(env_.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(env_.ciphertext, 'base64')), decipher.final()]).toString('utf8');
};
