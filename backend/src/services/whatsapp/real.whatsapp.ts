import { IWhatsAppProvider, SendWhatsAppOptions, SendWhatsAppResult } from './whatsapp.interface.js';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';

export class RealWhatsAppProvider implements IWhatsAppProvider {
  /**
   * Normalizes phone number into international standard (digits only without leading zeros or +)
   */
  private formatPhoneNumber(rawPhone: string): string {
    if (!rawPhone) return '';

    // 1. Convert Arabic-Indic (٠-٩) and Persian (۰-۹) digits to standard Latin digits (0-9)
    let cleaned = rawPhone
      .replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString())
      .replace(/[۰-۹]/g, (d) => (d.charCodeAt(0) - 1776).toString())
      .replace(/[^\d+]/g, '');

    // 2. Remove leading + or 00
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    } else if (cleaned.startsWith('00')) {
      cleaned = cleaned.substring(2);
    }

    // 3. Normalize specific country prefixes:

    // Iraq formats:
    // 96407... -> 9647...
    if (cleaned.startsWith('96407')) {
      cleaned = '964' + cleaned.substring(4);
    }
    // 07... (11 digits, e.g. 07801234567, 0770..., 0750...) -> 9647...
    else if (cleaned.startsWith('07') && cleaned.length === 11) {
      cleaned = '964' + cleaned.substring(1);
    }
    // 7... (10 digits, Iraq mobile prefix without 0) -> 9647...
    else if (/^7[3-9]\d{8}$/.test(cleaned)) {
      cleaned = '964' + cleaned;
    }

    // Egypt formats:
    // 2001... -> 201... (accidental leading 0 after country code)
    else if (cleaned.startsWith('2001') && cleaned.length === 13) {
      cleaned = '20' + cleaned.substring(3);
    }
    // 010..., 011..., 012..., 015... (11 digits) -> 2010...
    else if (/^01[0125]\d{8}$/.test(cleaned)) {
      cleaned = '2' + cleaned;
    }

    // Saudi Arabia formats:
    // 96605... -> 9665...
    else if (cleaned.startsWith('96605') && cleaned.length === 13) {
      cleaned = '966' + cleaned.substring(4);
    }
    // 05... (10 digits) -> 9665...
    else if (cleaned.startsWith('05') && cleaned.length === 10) {
      cleaned = '966' + cleaned.substring(1);
    }
    // 5... (9 digits) -> 9665...
    else if (/^5\d{8}$/.test(cleaned)) {
      cleaned = '966' + cleaned;
    }

    return cleaned;
  }

  async sendMessage(options: SendWhatsAppOptions): Promise<SendWhatsAppResult> {
    const formattedPhone = this.formatPhoneNumber(options.to);
    const apiKey = (process.env.WHATSAPP_API_KEY || (env as any).WHATSAPP_API_KEY || 'wps_7b5db2a829ff4377ad0c6c42ea7fe4af991c191992305e70eab136c8bb89f7d2').trim();
    const apiUrl = (process.env.WHATSAPP_API_URL || (env as any).WHATSAPP_API_URL || 'https://backendapi.wpsenderx.com/api/messages/send').trim();
    const senderPhone = this.formatPhoneNumber(process.env.WHATSAPP_SENDER_PHONE || (env as any).WHATSAPP_SENDER_PHONE || '201206895603');

    // 1. استخدام WPSender الرسمي في حال توفر المفتاح
    if (apiKey && apiKey.startsWith('wps_')) {
      console.log(`📡 [WP SENDER DISPATCH] Sending WhatsApp message from ${senderPhone} to: ${formattedPhone} via ${apiUrl}`);
      try {
        const payload = {
          api_key: apiKey,
          to: formattedPhone,
          phone: formattedPhone,
          number: formattedPhone,
          recipient: formattedPhone,
          sender: senderPhone,
          from: senderPhone,
          account: senderPhone,
          sender_phone: senderPhone,
          message: options.message
        };

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify(payload)
        });

        const responseData = await response.json().catch(() => ({}));
        const isSuccess =
          response.ok &&
          (responseData.status === 'success' ||
            responseData.success === true ||
            responseData.data?.success === true ||
            responseData.status === 'sent');

        const messageId =
          responseData.data?.messageLogId ? String(responseData.data.messageLogId) :
          responseData.messageLogId ? String(responseData.messageLogId) :
          responseData.messageId ||
          `wps-${Date.now()}`;
        const status: 'SENT' | 'FAILED' = isSuccess ? 'SENT' : (response.ok ? 'SENT' : 'FAILED');
        const errorMessage = !isSuccess ? (responseData.message || responseData.error || `HTTP ${response.status}`) : undefined;

        await prisma.whatsAppMessageLog.create({
          data: {
            phoneNumber: formattedPhone,
            templateKey: options.templateKey || null,
            messageContent: options.message,
            status: status,
            errorMessage: errorMessage || null,
            requestId: options.requestId || null
          }
        }).catch(() => {});

        if (isSuccess || response.ok) {
          console.log(`✅ [WP SENDER SUCCESS] Message dispatched: ${messageId}`);
          return { success: true, messageId, status: 'SENT' };
        } else {
          console.warn(`⚠️ [WP SENDER WARNING] API response:`, responseData);
        }
      } catch (wpsErr: any) {
        console.error(`💥 [WP SENDER ERROR] Failed:`, wpsErr?.message || wpsErr);
      }
    }

    // 2. تجربة UltraMsg كـ Fallback في حال توفره
    const ultraInstance = (process.env.ULTRAMSG_INSTANCE_ID || (env as any).ULTRAMSG_INSTANCE_ID || '').trim();
    const ultraToken = (process.env.ULTRAMSG_TOKEN || (env as any).ULTRAMSG_TOKEN || '').trim();

    if (ultraInstance && ultraToken) {
      const ultraUrl = `https://api.ultramsg.com/${ultraInstance}/messages/chat`;
      console.log(`📡 [ULTRAMSG DISPATCH] Fallback WhatsApp message to: ${formattedPhone} via ${ultraUrl}`);

      try {
        const response = await fetch(ultraUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            token: ultraToken,
            to: formattedPhone,
            body: options.message
          }).toString()
        });

        const data: any = await response.json().catch(() => ({}));
        const isSuccess = response.ok && (data.sent === 'true' || data.sent === true || data.message === 'ok' || Boolean(data.id));
        const messageId = data?.id ? String(data.id) : `ultra-${Date.now()}`;
        const status: 'SENT' | 'FAILED' = isSuccess ? 'SENT' : 'FAILED';
        const errorMessage = !isSuccess ? (data?.error || data?.message || `HTTP ${response.status}`) : undefined;

        await prisma.whatsAppMessageLog.create({
          data: {
            phoneNumber: formattedPhone,
            templateKey: options.templateKey || null,
            messageContent: options.message,
            status,
            errorMessage: errorMessage || null,
            requestId: options.requestId || null
          }
        }).catch(() => {});

        if (isSuccess) {
          console.log(`✅ [ULTRAMSG SUCCESS] Message dispatched: ${messageId}`);
          return { success: true, messageId, status: 'SENT' };
        }
      } catch (ultraErr: any) {
        console.error(`💥 [ULTRAMSG ERROR] Failed:`, ultraErr?.message || ultraErr);
      }
    }

    return {
      success: false,
      status: 'FAILED',
      errorMessage: 'تعذر إرسال رسالة الواتساب عبر جميع المزودين'
    };
  }
}