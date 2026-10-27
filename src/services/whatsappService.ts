import { apiClient } from './apiClient';
import { WhatsAppTemplate, WhatsAppSettings } from '../types';

export interface WhatsAppGatewayView {
  enabled: boolean;
  provider: 'wpsender' | 'ultramsg';
  apiUrl: string;
  apiKeyMasked: string;
  hasApiKey: boolean;
  senderPhone: string;
  ultraInstanceId: string;
  ultraTokenMasked: string;
  hasUltraToken: boolean;
  configured: boolean;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestMessage: string | null;
}

export interface WhatsAppGatewayUpdate {
  enabled?: boolean;
  provider?: 'wpsender' | 'ultramsg';
  apiUrl?: string;
  apiKey?: string;
  senderPhone?: string;
  ultraInstanceId?: string;
  ultraToken?: string;
}

export const whatsappService = {
  getGateway: async (): Promise<WhatsAppGatewayView> => apiClient.get<WhatsAppGatewayView>('/whatsapp/gateway'),

  updateGateway: async (data: WhatsAppGatewayUpdate): Promise<WhatsAppGatewayView> =>
    apiClient.put<WhatsAppGatewayView>('/whatsapp/gateway', data),

  testGateway: async (phoneNumber: string): Promise<WhatsAppGatewayView & { success: boolean; message: string }> =>
    apiClient.post('/whatsapp/gateway/test', { phoneNumber }, { timeoutMs: 60000 }),

  getQueue: async (): Promise<any> => apiClient.get('/whatsapp/queue'),
  retryQueue: async (): Promise<{ count: number }> => apiClient.post('/whatsapp/queue/retry', {}),

  getTemplates: async (): Promise<WhatsAppTemplate[]> => {
    return apiClient.get<WhatsAppTemplate[]>('/whatsapp/templates');
  },

  createTemplate: async (data: Partial<WhatsAppTemplate>): Promise<WhatsAppTemplate> => {
    return apiClient.post<WhatsAppTemplate>('/whatsapp/templates', data);
  },

  updateTemplate: async (id: string, updates: Partial<WhatsAppTemplate>): Promise<WhatsAppTemplate> => {
    return apiClient.patch<WhatsAppTemplate>(`/whatsapp/templates/${id}`, updates);
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/whatsapp/templates/${id}`);
  },

  getLogs: async (): Promise<any[]> => {
    return apiClient.get<any[]>('/whatsapp/logs');
  },

  sendWhatsApp: async (
    phoneNumber: string,
    message: string,
    templateKey?: string,
    requestId?: string,
    document?: File | null,
    delaySeconds?: number
  ) => {
    if (document) {
      const fd = new FormData();
      fd.append('phoneNumber', phoneNumber);
      fd.append('message', message);
      if (templateKey) fd.append('templateKey', templateKey);
      if (requestId) fd.append('requestId', requestId);
      fd.append('document', document);
      return apiClient.post('/whatsapp/send', fd, { timeoutMs: 180000 });
    }
    return apiClient.post('/whatsapp/send', {
      phoneNumber,
      message,
      templateKey,
      requestId,
      delaySeconds
    }, { timeoutMs: 60000 });
  },

  sendBulkWhatsApp: async (
    recipients: Array<{
      phoneNumber: string;
      customerName?: string;
      requestNumber?: string;
      ministry?: string;
      ministryName?: string;
      title?: string;
      trackingLink?: string;
      requestId?: string;
      id?: string;
    }>,
    message: string,
    templateKey?: string,
    document?: File | null
  ): Promise<{ successCount: number; failCount: number; total: number; errors: string[] }> => {
    if (document) {
      const fd = new FormData();
      fd.append('recipients', JSON.stringify(recipients));
      fd.append('message', message);
      if (templateKey) fd.append('templateKey', templateKey);
      if (document) fd.append('document', document);
      return apiClient.post('/whatsapp/send-bulk', fd, { timeoutMs: 180000 });
    }
    return apiClient.post('/whatsapp/send-bulk', {
      recipients,
      message,
      templateKey
    }, { timeoutMs: 60000 });
  }
};