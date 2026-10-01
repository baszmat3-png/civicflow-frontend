import { apiClient } from './apiClient';
import { Customer } from '../types';

export interface CustomerFilters {
  search?: string;
  status?: string;
  cityId?: string;
}

export const customerService = {
  getCustomers: async (filters?: string | CustomerFilters, status?: string): Promise<Customer[]> => {
    let params: any = {};
    if (typeof filters === 'string') {
      params = { search: filters, status };
    } else if (filters) {
      params = { ...filters };
    }

    const data = await apiClient.get<any>('/customers', {
      params
    });
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.customers)) return data.customers;
    return [];
  },

  getCustomerById: async (id: string): Promise<Customer> => {
    return apiClient.get<Customer>(`/customers/${id}`);
  },

  createCustomer: async (customerData: Partial<Customer>): Promise<Customer> => {
    return apiClient.post<Customer>('/customers', customerData);
  },

  updateCustomer: async (id: string, updates: Partial<Customer>): Promise<Customer> => {
    return apiClient.patch<Customer>(`/customers/${id}`, updates);
  },

  deleteCustomer: async (id: string, force?: boolean): Promise<void> => {
    await apiClient.delete(`/customers/${id}`, {
      params: force ? { force: 'true' } : undefined
    });
  },

  bulkDeleteCustomers: async (ids: string[], force?: boolean): Promise<{ deletedCount: number; blockedCount: number; total: number }> => {
    return apiClient.post('/customers/bulk-delete', { ids, force });
  },

  bulkImport: async (rows: any[]): Promise<{ successCount: number; failCount: number; errors: string[] }> => {
    return apiClient.post('/customers/bulk-import', { rows });
  }
};