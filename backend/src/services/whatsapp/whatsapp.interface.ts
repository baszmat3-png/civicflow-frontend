export interface WhatsAppDocumentAttachment {
  url?: string;
  filename: string;
  localPath?: string;
  mimetype?: string;
  base64?: string;
  isImage?: boolean;
}

export interface SendWhatsAppOptions {
  to: string;
  message: string;
  templateKey?: string;
  requestId?: string;
  document?: WhatsAppDocumentAttachment;
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  status: 'SENT' | 'FAILED' | 'MOCK_DISPATCHED';
  errorMessage?: string;
}

export interface IWhatsAppProvider {
  sendMessage(options: SendWhatsAppOptions): Promise<SendWhatsAppResult>;
}