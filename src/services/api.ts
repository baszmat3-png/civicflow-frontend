import {
  RequestItem,
  Customer,
  Ministry,
  Employee,
  Role,
  NotificationItem,
  AuditLog,
  SystemSettings,
  RequestStatus,
  RequestPriority,
  FinalResponse,
  RequestAttachment
} from '../types';
import { requestService } from './requestService';
import { customerService } from './customerService';
import { ministryService } from './ministryService';
import { employeeService } from './employeeService';
import { roleService } from './roleService';
import { notificationService } from './notificationService';
import { settingsService } from './settingsService';
import { auditService } from './auditService';
import { reportService } from './reportService';
import { publicService } from './publicService';
import { cityService } from './cityService';
import { requestTypeService } from './requestTypeService';

// Activity Logger - backend automatically records audit logs on operations
export const logActivity = async (
  _action: AuditLog['action'],
  _details: string,
  _requestNumber?: string
): Promise<void> => {
  // Handled directly server-side in PostgreSQL
};

// Notification creator helper
export const createNotification = async (
  title: string,
  message: string,
  type: NotificationItem['type'],
  requestId?: string,
  requestNumber?: string
): Promise<NotificationItem> => {
  return notificationService.createNotification(title, message, type, requestId, requestNumber);
};

// Calculate expected completion date based on SLA days & Priority
export const calculateExpectedDate = (
  receiveDateStr: string,
  slaDays = 7,
  priority: RequestPriority = 'عادي'
): string => {
  let days = slaDays || 7;
  if (priority === 'عاجل') days = Math.max(2, Math.floor(days / 2));
  else if (priority === 'مهم') days = Math.max(3, Math.floor(days * 0.75));

  const baseDate = new Date(receiveDateStr || new Date());
  baseDate.setDate(baseDate.getDate() + days);
  return baseDate.toISOString().split('T')[0];
};

// ==========================================
// REQUESTS API
// ==========================================

export const getRequests = async (filters?: {
  search?: string;
  status?: string;
  ministryId?: string;
  employeeId?: string;
  priority?: string;
  isOverdue?: boolean;
  fromDate?: string;
  toDate?: string;
}): Promise<RequestItem[]> => {
  return requestService.getRequests(filters);
};

export const getRequestById = async (id: string): Promise<RequestItem | null> => {
  return requestService.getRequestById(id);
};

export const createRequest = async (data: Partial<RequestItem>): Promise<RequestItem> => {
  return requestService.createRequest(data);
};

export const updateRequest = async (id: string, updates: Partial<RequestItem>): Promise<RequestItem> => {
  return requestService.updateRequest(id, updates);
};

export const changeRequestStatus = async (
  id: string,
  newStatus: RequestStatus,
  note?: string,
  file?: File,
  rejectionReason?: string
): Promise<RequestItem> => {
  return requestService.changeStatus(id, newStatus, note, file, rejectionReason);
};

export const addRequestAttachment = async (
  requestId: string,
  attachment: Omit<RequestAttachment, 'id' | 'uploadedAt'> & { file?: File }
): Promise<RequestItem> => {
  await requestService.addAttachment(requestId, attachment);
  return requestService.getRequestById(requestId);
};

export const addFinalResponse = async (
  requestId: string,
  response: Omit<FinalResponse, 'id' | 'issuedAt'> & { file?: File }
): Promise<RequestItem> => {
  await requestService.addFinalResponse(requestId, response);
  return requestService.getRequestById(requestId);
};

export const deleteRequest = async (id: string): Promise<boolean> => {
  await requestService.deleteRequest(id);
  return true;
};

// ==========================================
// CUSTOMERS API
// ==========================================

export const getCustomers = async (search?: string): Promise<Customer[]> => {
  return customerService.getCustomers(search);
};

export const getCustomerById = async (id: string): Promise<Customer | null> => {
  return customerService.getCustomerById(id);
};

export const createCustomer = async (data: Partial<Customer>): Promise<Customer> => {
  return customerService.createCustomer(data);
};

export const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<Customer> => {
  return customerService.updateCustomer(id, updates);
};

// ==========================================
// MINISTRIES API
// ==========================================

export const getMinistries = async (): Promise<Ministry[]> => {
  return ministryService.getMinistries();
};

export const getMinistryById = async (id: string): Promise<Ministry | null> => {
  return ministryService.getMinistryById(id);
};

export const createMinistry = async (data: Partial<Ministry>): Promise<Ministry> => {
  return ministryService.createMinistry(data);
};

export const updateMinistry = async (id: string, updates: Partial<Ministry>): Promise<Ministry> => {
  return ministryService.updateMinistry(id, updates);
};

// ==========================================
// EMPLOYEES & ROLES API
// ==========================================

export const getEmployees = async (): Promise<Employee[]> => {
  return employeeService.getEmployees();
};

export const getEmployeeById = async (id: string): Promise<Employee | null> => {
  return employeeService.getEmployeeById(id);
};

export const createEmployee = async (data: Partial<Employee>): Promise<Employee> => {
  return employeeService.createEmployee(data);
};

export const updateEmployee = async (id: string, updates: Partial<Employee>): Promise<Employee> => {
  return employeeService.updateEmployee(id, updates);
};

export const deleteEmployee = async (id: string): Promise<void> => {
  return employeeService.deleteEmployee(id);
};

export const getRoles = async (): Promise<Role[]> => {
  return roleService.getRoles();
};

export const getRoleById = async (id: string): Promise<Role | null> => {
  return roleService.getRoleById(id);
};

export const createRole = async (roleData: { name: string; description?: string; permissions?: any[]; extraPermissions?: any }): Promise<Role> => {
  return roleService.createRole(roleData);
};

export const updateRole = async (id: string, updates: Partial<Role>): Promise<Role> => {
  return roleService.updateRole(id, updates);
};

export const deleteRole = async (id: string): Promise<void> => {
  return roleService.deleteRole(id);
};

// ==========================================
// NOTIFICATIONS API
// ==========================================

export const getNotifications = async (): Promise<NotificationItem[]> => {
  return notificationService.getNotifications();
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
  await notificationService.markAsRead(id);
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await notificationService.markAllAsRead();
};

// ==========================================
// AUDIT LOGS API
// ==========================================

export const getAuditLogs = async (filters?: {
  user?: string;
  action?: string;
  date?: string;
  search?: string;
}): Promise<AuditLog[]> => {
  return auditService.getAuditLogs(filters);
};

// ==========================================
// SETTINGS API
// ==========================================

export const getSystemSettings = async (): Promise<SystemSettings> => {
  return settingsService.getSystemSettings();
};

export const updateSystemSettings = async (updates: Partial<SystemSettings>): Promise<SystemSettings> => {
  return settingsService.updateSystemSettings(updates);
};

// ==========================================
// CSV / EXCEL EXPORT (EXCELJS STREAM)
// ==========================================

export const exportRequestsToCsv = (_requests: RequestItem[], _filename = 'تقرير_المعاملات_CivicFlow.xlsx') => {
  reportService.exportRequestsExcel();
};

export { publicService, cityService, requestTypeService };