import {
  initialCustomers,
  initialMinistries,
  initialEmployees,
  initialRoles,
  initialRequests,
  initialNotifications,
  initialAuditLogs,
  initialSystemSettings
} from '../data/seedData';
import {
  Customer,
  Ministry,
  Employee,
  Role,
  RequestItem,
  NotificationItem,
  AuditLog,
  SystemSettings
} from '../types';

const STORAGE_KEYS = {
  REQUESTS: 'civicflow_requests',
  CUSTOMERS: 'civicflow_customers',
  MINISTRIES: 'civicflow_ministries',
  EMPLOYEES: 'civicflow_employees',
  ROLES: 'civicflow_roles',
  NOTIFICATIONS: 'civicflow_notifications',
  AUDIT_LOGS: 'civicflow_audit_logs',
  SETTINGS: 'civicflow_settings',
  INITIALIZED: 'civicflow_initialized_v6'
};

export const initStorage = () => {
  if (typeof window === 'undefined') return;

  const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (!isInitialized) {
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(initialRequests));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(initialCustomers));
    localStorage.setItem(STORAGE_KEYS.MINISTRIES, JSON.stringify(initialMinistries));
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(initialEmployees));
    localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(initialRoles));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(initialNotifications));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(initialAuditLogs));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialSystemSettings));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }
};

export const resetToDefaults = () => {
  localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(initialRequests));
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(initialCustomers));
  localStorage.setItem(STORAGE_KEYS.MINISTRIES, JSON.stringify(initialMinistries));
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(initialEmployees));
  localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(initialRoles));
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(initialNotifications));
  localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(initialAuditLogs));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialSystemSettings));
  window.dispatchEvent(new Event('civicflow_data_updated'));
};

export const getStoredData = <T>(key: string, defaultValue: T): T => {
  try {
    initStorage();
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

export const setStoredData = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('civicflow_data_updated'));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
};

export { STORAGE_KEYS };
