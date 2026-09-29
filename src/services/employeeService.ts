import { apiClient } from './apiClient';
import { Employee } from '../types';

export const employeeService = {
  getEmployees: async (): Promise<Employee[]> => {
    const data = await apiClient.get<any>('/users');
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.users)) return data.users;
    if (data && Array.isArray(data.employees)) return data.employees;
    return [];
  },

  getEmployeeById: async (id: string): Promise<Employee> => {
    return apiClient.get<Employee>(`/users/${id}`);
  },

  createEmployee: async (data: Partial<Employee>): Promise<Employee> => {
    return apiClient.post<Employee>('/users', data);
  },

  updateEmployee: async (id: string, updates: Partial<Employee>): Promise<Employee> => {
    return apiClient.patch<Employee>(`/users/${id}`, updates);
  },

  deleteEmployee: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  saveDistributionSettings: async (employees: { id: string; assignedMinistries: string[]; isAutoAssignEnabled: boolean }[]): Promise<any> => {
    return apiClient.put('/users/distribution', { employees });
  }
};