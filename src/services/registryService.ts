import { apiClient } from './apiClient';

export interface RegistryEntityItem {
  id: string;
  name: string;
  type: string;
  code?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: string;
  createdAt: string;
}

export interface OutgoingLetterItem {
  id: string;
  letterNumber: string;
  issueDate: string;
  subject: string;
  recipientEntityId?: string;
  recipientEntity?: { id: string; name: string };
  recipientName?: string;
  ministryId?: string;
  ministry?: { id: string; name: string };
  citizenName?: string;
  citizenPhone?: string;
  departmentNumber?: string;
  archiveFileNumber?: string;
  summary?: string;
  notes?: string;
  fileName?: string;
  fileSize?: string;
  hasAttachment: boolean;
  status: string;
  createdAt: string;
}

export interface IncomingLetterItem {
  id: string;
  incomingNumber: string;
  externalLetterNumber?: string;
  departmentNumber?: string;
  archiveFileNumber?: string;
  receiveDate: string;
  subject: string;
  senderEntityId?: string;
  senderEntity?: { id: string; name: string };
  senderName?: string;
  ministryId?: string;
  ministry?: { id: string; name: string };
  citizenName?: string;
  citizenPhone?: string;
  summary?: string;
  notes?: string;
  actionRequired?: string;
  priority: string;
  status: string;
  fileName?: string;
  fileSize?: string;
  hasAttachment: boolean;
  createdAt: string;
}

export const registryService = {
  // Entities
  getEntities: async (): Promise<RegistryEntityItem[]> => {
    return apiClient.get<RegistryEntityItem[]>('/registry/entities');
  },

  createEntity: async (data: Partial<RegistryEntityItem>): Promise<RegistryEntityItem> => {
    return apiClient.post<RegistryEntityItem>('/registry/entities', data);
  },

  updateEntity: async (id: string, data: Partial<RegistryEntityItem>): Promise<RegistryEntityItem> => {
    return apiClient.patch<RegistryEntityItem>(`/registry/entities/${id}`, data);
  },

  deleteEntity: async (id: string): Promise<void> => {
    return apiClient.delete(`/registry/entities/${id}`);
  },

  // Outgoing
  getOutgoingLetters: async (params?: {
    search?: string;
    recipientEntityId?: string;
    ministryId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<OutgoingLetterItem[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.recipientEntityId) query.append('recipientEntityId', params.recipientEntityId);
    if (params?.ministryId) query.append('ministryId', params.ministryId);
    if (params?.status) query.append('status', params.status);
    if (params?.fromDate) query.append('fromDate', params.fromDate);
    if (params?.toDate) query.append('toDate', params.toDate);

    return apiClient.get<OutgoingLetterItem[]>(`/registry/outgoing?${query.toString()}`);
  },

  createOutgoingLetter: async (formData: FormData): Promise<OutgoingLetterItem> => {
    return apiClient.post<OutgoingLetterItem>('/registry/outgoing', formData);
  },

  deleteOutgoingLetter: async (id: string): Promise<void> => {
    return apiClient.delete(`/registry/outgoing/${id}`);
  },

  downloadOutgoingLetter: async (id: string, fileName = 'outgoing_document.pdf'): Promise<void> => {
    await apiClient.download(`/registry/outgoing/${id}/download`, fileName);
  },

  getOutgoingDownloadUrl: (id: string): string => {
    const isBrowser = typeof window !== 'undefined';
    const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const baseUrl =
      (import.meta as any).env?.VITE_API_BASE_URL ||
      (import.meta as any).env?.VITE_API_URL ||
      (isLocalhost ? 'http://localhost:5000/api' : 'https://civicflow-backend-1u3o.onrender.com/api');
    const token = isBrowser ? (localStorage.getItem('civicflow_access_token') || '') : '';
    return `${baseUrl}/registry/outgoing/${id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  // Incoming
  getIncomingLetters: async (params?: {
    search?: string;
    senderEntityId?: string;
    ministryId?: string;
    status?: string;
    priority?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<IncomingLetterItem[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.senderEntityId) query.append('senderEntityId', params.senderEntityId);
    if (params?.ministryId) query.append('ministryId', params.ministryId);
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.fromDate) query.append('fromDate', params.fromDate);
    if (params?.toDate) query.append('toDate', params.toDate);

    return apiClient.get<IncomingLetterItem[]>(`/registry/incoming?${query.toString()}`);
  },

  createIncomingLetter: async (formData: FormData): Promise<IncomingLetterItem> => {
    return apiClient.post<IncomingLetterItem>('/registry/incoming', formData);
  },

  deleteIncomingLetter: async (id: string): Promise<void> => {
    return apiClient.delete(`/registry/incoming/${id}`);
  },

  downloadIncomingLetter: async (id: string, fileName = 'incoming_document.pdf'): Promise<void> => {
    await apiClient.download(`/registry/incoming/${id}/download`, fileName);
  },

  getIncomingDownloadUrl: (id: string): string => {
    const isBrowser = typeof window !== 'undefined';
    const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const baseUrl =
      (import.meta as any).env?.VITE_API_BASE_URL ||
      (import.meta as any).env?.VITE_API_URL ||
      (isLocalhost ? 'http://localhost:5000/api' : 'https://civicflow-backend-1u3o.onrender.com/api');
    const token = isBrowser ? (localStorage.getItem('civicflow_access_token') || '') : '';
    return `${baseUrl}/registry/incoming/${id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  }
};
