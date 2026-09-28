import { apiClient } from './apiClient';
import { RequestItem, City, RequestTypeEntity, Ministry } from '../types';

export interface PublicFormDataResponse {
  ministries: Ministry[];
  cities: City[];
  requestTypes: RequestTypeEntity[];
}

export interface PublicSubmissionResult {
  requestId: string;
  requestNumber: string;
  trackingToken: string;
  trackingUrl: string;
  customerNumber: string;
  status: string;
  createdAt: string;
}

export interface OtpRequestResult {
  requestNumber: string;
  customerName: string;
  maskedPhone: string;
  expiresInMinutes: number;
}

export interface AppointmentSlotItem {
  date: string;
  dayName: string;
  targetPerson: string;
  slots: string[];
}

export interface TransparencyStats {
  totalRequests: number;
  completedTotal: number;
  completedThisMonth: number;
  inProgressTotal: number;
  completionRate: number;
  averageSlaDays: number;
  citizenSatisfactionScore: number;
  totalRatingsCount: number;
  ministryStats: Array<{
    id: string;
    name: string;
    code: string;
    slaDays: number;
    totalRequests: number;
    completedRequests: number;
    completionRate: number;
  }>;
}

export const publicService = {
  // Get active dropdown data for public submission
  getFormData: async (): Promise<PublicFormDataResponse> => {
    return apiClient.get<PublicFormDataResponse>('/public/form-data', { skipAuth: true });
  },

  // Submit public citizen request
  submitRequest: async (formData: FormData): Promise<PublicSubmissionResult> => {
    return apiClient.post<PublicSubmissionResult>('/public/submit-request', formData, {
      skipAuth: true
    });
  },

  // Track request publicly by requestNumber or trackingToken
  trackRequest: async (tokenOrNumber: string): Promise<any> => {
    return apiClient.get<any>(
      `/public/track/${encodeURIComponent(tokenOrNumber)}`,
      { skipAuth: true }
    );
  },

  // Secure OTP Flow for Citizen Tracking
  requestTrackingOtp: async (tokenOrNumber: string): Promise<OtpRequestResult> => {
    return apiClient.post<OtpRequestResult>(
      '/public/track/request-otp',
      { tokenOrNumber },
      { skipAuth: true }
    );
  },

  verifyTrackingOtp: async (tokenOrNumber: string, otp: string): Promise<any> => {
    return apiClient.post<any>(
      '/public/track/verify-otp',
      { tokenOrNumber, otp },
      { skipAuth: true }
    );
  },

  // Appointments (Public Booking)
  getAppointmentSlots: async (targetPerson: string = 'DEPUTY'): Promise<{ targetPerson: string; targetPersonTitle: string; availableDates: AppointmentSlotItem[] }> => {
    return apiClient.get<{ targetPerson: string; targetPersonTitle: string; availableDates: AppointmentSlotItem[] }>(
      `/appointments/public/slots?targetPerson=${targetPerson}`,
      { skipAuth: true }
    );
  },

  bookAppointment: async (data: {
    customerName: string;
    customerPhone: string;
    customerNationalId?: string;
    targetPerson: string;
    appointmentDate: string;
    timeSlot: string;
    purpose: string;
    notes?: string;
  }): Promise<any> => {
    return apiClient.post<any>('/appointments/public/book', data, { skipAuth: true });
  },

  // Citizen Ratings (Public)
  getRatings: async (): Promise<{ averageScore: number; totalRatings: number; ratings: any[] }> => {
    return apiClient.get<{ averageScore: number; totalRatings: number; ratings: any[] }>('/ratings/public', {
      skipAuth: true
    });
  },

  submitRating: async (data: {
    requestNumber?: string;
    rating: number;
    comment?: string;
    customerName?: string;
    customerPhone?: string;
  }): Promise<any> => {
    return apiClient.post<any>('/ratings/public/submit', data, { skipAuth: true });
  },

  // Transparency Portal (Public Stats)
  getTransparencyStats: async (): Promise<TransparencyStats> => {
    return apiClient.get<TransparencyStats>('/transparency/public', { skipAuth: true });
  },

  downloadAttachmentUrl: (attachmentId: string): string => {
    const isBrowser = typeof window !== 'undefined';
    const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const baseUrl =
      (import.meta as any).env?.VITE_API_BASE_URL ||
      (import.meta as any).env?.VITE_API_URL ||
      (isLocalhost ? 'http://localhost:5000/api' : 'https://civicflow-backend-1u3o.onrender.com/api');
    return `${baseUrl}/public/attachments/${attachmentId}/download`;
  }
};