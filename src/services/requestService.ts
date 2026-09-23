import { apiClient } from './apiClient';
import { RequestItem, RequestStatus, RequestAttachment, FinalResponse } from '../types';
import { calculateFileSha256 } from '../utils/fileChecksum';

export const requestService = {
  getRequests: async (filters?: {
    search?: string;
    status?: string;
    ministryId?: string;
    employeeId?: string;
    priority?: string;
    cityId?: string;
    requestTypeId?: string;
    isOverdue?: boolean;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }): Promise<RequestItem[]> => {
    const data = await apiClient.get<any>('/requests', {
      params: filters
    });
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.requests)) return data.requests;
    return [];
  },

  getRequestById: async (id: string): Promise<RequestItem> => {
    return apiClient.get<RequestItem>(`/requests/${id}`);
  },

  createRequest: async (requestData: Partial<RequestItem>): Promise<RequestItem> => {
    return apiClient.post<RequestItem>('/requests', requestData);
  },

  updateRequest: async (id: string, updates: Partial<RequestItem>): Promise<RequestItem> => {
    return apiClient.patch<RequestItem>(`/requests/${id}`, updates);
  },

  changeStatus: async (
    id: string,
    newStatus: RequestStatus,
    note?: string,
    file?: File,
    rejectionReason?: string
  ): Promise<RequestItem> => {
    if (file) {
      const formData = new FormData();
      formData.append('newStatus', newStatus);
      if (note) formData.append('note', note);
      if (rejectionReason) formData.append('rejectionReason', rejectionReason);
      formData.append('file', file);
      return apiClient.patch<RequestItem>(`/requests/${id}/status`, formData);
    }

    return apiClient.patch<RequestItem>(`/requests/${id}/status`, {
      newStatus,
      note,
      rejectionReason
    });
  },

  assignRequest: async (id: string, assignedEmployeeId: string): Promise<RequestItem> => {
    return apiClient.patch<RequestItem>(`/requests/${id}/assign`, {
      assignedEmployeeId
    });
  },

  deleteRequest: async (id: string): Promise<void> => {
    await apiClient.delete(`/requests/${id}`);
  },

  // Attachments
  addAttachment: async (
    requestId: string,
    attachment: {
      name: string;
      type: string;
      size: string;
      uploadedBy?: string;
      documentType?: string;
      isPublic?: boolean;
      stage?: string;
      file?: File;
    }
  ): Promise<RequestAttachment> => {
    if (attachment.file) {
      const hash = await calculateFileSha256(attachment.file);
      const formData = new FormData();
      formData.append('file', attachment.file);
      formData.append('name', attachment.name);
      formData.append('type', attachment.type);
      formData.append('size', attachment.size);
      formData.append('expectedSize', String(attachment.file.size));
      if (hash) formData.append('checksum', hash);
      if (attachment.uploadedBy) formData.append('uploadedBy', attachment.uploadedBy);
      if (attachment.documentType) formData.append('documentType', attachment.documentType);
      if (attachment.isPublic !== undefined) formData.append('isPublic', String(attachment.isPublic));
      if (attachment.stage) formData.append('stage', attachment.stage);
      return apiClient.post<RequestAttachment>(`/requests/${requestId}/attachments`, formData);
    }

    return apiClient.post<RequestAttachment>(`/requests/${requestId}/attachments`, {
      name: attachment.name,
      type: attachment.type,
      size: attachment.size,
      uploadedBy: attachment.uploadedBy,
      documentType: attachment.documentType,
      isPublic: attachment.isPublic,
      stage: attachment.stage
    });
  },

  downloadAttachment: async (attachmentId: string, filename = 'document') => {
    await apiClient.download(`/requests/attachments/${attachmentId}/download`, filename);
  },

  deleteAttachment: async (requestId: string, attachmentId: string): Promise<void> => {
    await apiClient.delete(`/requests/${requestId}/attachments/${attachmentId}`);
  },

  // Final Response
  addFinalResponse: async (
    requestId: string,
    response: Omit<FinalResponse, 'id' | 'issuedAt'> & { file?: File }
  ): Promise<FinalResponse> => {
    if (response.file) {
      const formData = new FormData();
      formData.append('file', response.file);
      formData.append('decision', response.decision);
      formData.append('summary', response.summary);
      if (response.documentNumber) formData.append('documentNumber', response.documentNumber);
      if (response.issuedBy) formData.append('issuedBy', response.issuedBy);
      if (response.attachmentName) formData.append('attachmentName', response.attachmentName);
      formData.append('deliveredToCustomer', String(response.deliveredToCustomer));
      if (response.deliveryDate) formData.append('deliveryDate', response.deliveryDate);
      return apiClient.post<FinalResponse>(`/requests/${requestId}/final-response`, formData);
    }

    return apiClient.post<FinalResponse>(`/requests/${requestId}/final-response`, response);
  }
};