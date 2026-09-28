import { apiClient } from './apiClient';

export interface AppointmentItem {
  id: string;
  appointmentNumber: string;
  customerName: string;
  customerPhone: string;
  customerNationalId?: string;
  targetPerson: 'DEPUTY' | 'OFFICE_DIRECTOR' | string;
  appointmentDate: string;
  timeSlot: string;
  purpose: string;
  notes?: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  adminNotes?: string;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentScheduleItem {
  id: string;
  targetPerson: string;
  dayOfWeek: number;
  dayName: string;
  isWorkingDay: boolean;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  maxPerSlot: number;
}

export const appointmentService = {
  getAppointments: async (params?: {
    status?: string;
    targetPerson?: string;
    search?: string;
    date?: string;
  }): Promise<AppointmentItem[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.targetPerson) query.append('targetPerson', params.targetPerson);
    if (params?.search) query.append('search', params.search);
    if (params?.date) query.append('date', params.date);

    return apiClient.get<AppointmentItem[]>(`/appointments?${query.toString()}`);
  },

  updateStatus: async (
    id: string,
    data: { status: string; adminNotes?: string }
  ): Promise<AppointmentItem> => {
    return apiClient.patch<AppointmentItem>(`/appointments/${id}/status`, data);
  },

  getSchedules: async (targetPerson: string = 'DEPUTY'): Promise<AppointmentScheduleItem[]> => {
    return apiClient.get<AppointmentScheduleItem[]>(`/appointments/settings/schedules?targetPerson=${targetPerson}`);
  },

  saveSchedules: async (
    targetPerson: string,
    schedules: Partial<AppointmentScheduleItem>[]
  ): Promise<AppointmentScheduleItem[]> => {
    return apiClient.post<AppointmentScheduleItem[]>('/appointments/settings/schedules', {
      targetPerson,
      schedules
    });
  }
};
