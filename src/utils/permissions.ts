import { Employee } from '../types';

export const PERMISSIONS = {
  // Requests
  REQUESTS_VIEW: 'requests.view',
  REQUESTS_CREATE: 'requests.create',
  REQUESTS_UPDATE: 'requests.update',
  REQUESTS_DELETE: 'requests.delete',
  REQUESTS_CHANGE_STATUS: 'requests.change_status',
  REQUESTS_ATTACHMENTS: 'requests.attachments',
  REQUESTS_FINAL_RESPONSE: 'requests.final_response',

  // Customers
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_UPDATE: 'customers.update',
  CUSTOMERS_DELETE: 'customers.delete',

  // Ministries
  MINISTRIES_VIEW: 'ministries.view',
  MINISTRIES_CREATE: 'ministries.create',
  MINISTRIES_UPDATE: 'ministries.update',
  MINISTRIES_DELETE: 'ministries.delete',

  // Cities
  CITIES_VIEW: 'cities.view',
  CITIES_CREATE: 'cities.create',
  CITIES_UPDATE: 'cities.update',
  CITIES_DELETE: 'cities.delete',

  // Request Types
  REQUEST_TYPES_VIEW: 'request_types.view',
  REQUEST_TYPES_CREATE: 'request_types.create',
  REQUEST_TYPES_UPDATE: 'request_types.update',
  REQUEST_TYPES_DELETE: 'request_types.delete',

  // Users / Employees
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',

  // Roles
  ROLES_VIEW: 'roles.view',
  ROLES_MANAGE: 'roles.manage',

  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  REPORTS_EXPORT_PDF: 'reports.export_pdf',

  // Notifications
  NOTIFICATIONS_VIEW: 'notifications.view',

  // Audit Logs
  AUDIT_LOGS_VIEW: 'audit_logs.view',
  AUDIT_LOGS_EXPORT_PDF: 'audit_logs.export_pdf',

  // WhatsApp
  WHATSAPP_VIEW: 'whatsapp.view',
  WHATSAPP_SEND: 'whatsapp.send',
  WHATSAPP_MANAGE: 'whatsapp.manage',

  // Appointments
  APPOINTMENTS_VIEW: 'appointments.view',
  APPOINTMENTS_CREATE: 'appointments.create',
  APPOINTMENTS_UPDATE: 'appointments.update',
  APPOINTMENTS_DELETE: 'appointments.delete',

  // Registry (Outgoing & Incoming)
  REGISTRY_VIEW: 'registry.view',
  REGISTRY_CREATE: 'registry.create',
  REGISTRY_UPDATE: 'registry.update',
  REGISTRY_DELETE: 'registry.delete',

  // Settings
  SETTINGS_MANAGE: 'settings.manage'
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS] | string;

// Role name to default permissions fallback
const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  'مدير النظام': [
    'requests.view', 'requests.create', 'requests.update', 'requests.delete', 'requests.change_status', 'requests.attachments', 'requests.final_response',
    'customers.view', 'customers.create', 'customers.update', 'customers.delete',
    'ministries.view', 'ministries.create', 'ministries.update', 'ministries.delete',
    'cities.view', 'cities.create', 'cities.update', 'cities.delete',
    'request_types.view', 'request_types.create', 'request_types.update', 'request_types.delete',
    'users.view', 'users.create', 'users.update', 'users.delete',
    'roles.view', 'roles.manage',
    'appointments.view', 'appointments.create', 'appointments.update', 'appointments.delete',
    'registry.view', 'registry.create', 'registry.update', 'registry.delete',
    'reports.view', 'reports.export', 'reports.export_pdf',
    'notifications.view',
    'whatsapp.view', 'whatsapp.send', 'whatsapp.manage',
    'settings.manage',
    'audit_logs.view', 'audit_logs.export_pdf'
  ],
  'مشرف': [
    'requests.view', 'requests.create', 'requests.update', 'requests.change_status', 'requests.attachments', 'requests.final_response',
    'customers.view', 'customers.create', 'customers.update',
    'ministries.view', 'ministries.create', 'ministries.update',
    'cities.view', 'cities.create', 'cities.update',
    'request_types.view', 'request_types.create', 'request_types.update',
    'users.view', 'users.create', 'users.update', 'users.delete',
    'appointments.view', 'appointments.create', 'appointments.update',
    'registry.view', 'registry.create', 'registry.update',
    'reports.view', 'reports.export', 'reports.export_pdf',
    'notifications.view',
    'whatsapp.view', 'whatsapp.send',
    'audit_logs.view', 'audit_logs.export_pdf'
  ],
  'موظف متابعة': [
    'requests.view', 'requests.create', 'requests.update', 'requests.change_status', 'requests.attachments',
    'customers.view', 'customers.create', 'customers.update',
    'ministries.view',
    'cities.view',
    'request_types.view',
    'appointments.view',
    'registry.view',
    'reports.view', 'reports.export', 'reports.export_pdf',
    'notifications.view'
  ],
  'موظف استقبال': [
    'requests.view', 'requests.create',
    'customers.view', 'customers.create',
    'ministries.view',
    'cities.view',
    'appointments.view', 'appointments.create',
    'registry.view', 'registry.create',
    'notifications.view'
  ]
};

export const hasPermission = (user: Employee | null, permission: PermissionKey): boolean => {
  if (!user) return false;

  // Admin has full unrestricted access
  if (user.role === 'مدير النظام' || user.roleId === 'role-1') {
    return true;
  }

  // Check explicit permissions array from user
  if (user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions.includes(permission);
  }

  // Fallback to role-based default permissions
  const rolePerms = ROLE_DEFAULT_PERMISSIONS[user.role] || [];
  return rolePerms.includes(permission);
};

export const hasAnyPermission = (user: Employee | null, permissions: PermissionKey[]): boolean => {
  if (!user) return false;
  if (user.role === 'مدير النظام' || user.roleId === 'role-1') return true;
  return permissions.some((p) => hasPermission(user, p));
};

export const hasAllPermissions = (user: Employee | null, permissions: PermissionKey[]): boolean => {
  if (!user) return false;
  if (user.role === 'مدير النظام' || user.roleId === 'role-1') return true;
  return permissions.every((p) => hasPermission(user, p));
};

// Module-level permission checker
export const canAccessModule = (user: Employee | null, moduleName: string): boolean => {
  if (!user) return false;
  if (user.role === 'مدير النظام' || user.roleId === 'role-1') return true;

  switch (moduleName) {
    case 'dashboard':
    case 'الرئيسية':
      return true;

    case 'requests':
    case 'الطلبات':
      return hasPermission(user, PERMISSIONS.REQUESTS_VIEW);

    case 'customers':
    case 'المراجعون':
      return hasPermission(user, PERMISSIONS.CUSTOMERS_VIEW);

    case 'ministries':
    case 'الوزارات':
      return hasPermission(user, PERMISSIONS.MINISTRIES_VIEW);

    case 'employees':
    case 'الموظفون':
      return hasPermission(user, PERMISSIONS.USERS_VIEW);

    case 'appointments':
    case 'المواعيد':
    case 'المواعيد والمقابلات':
    case 'إدارة المواعيد':
      return hasPermission(user, PERMISSIONS.APPOINTMENTS_VIEW);

    case 'registry':
    case 'الصادر والوارد':
    case 'السجل الإداري':
    case 'سجل الصادر':
    case 'سجل الوارد':
      return hasPermission(user, PERMISSIONS.REGISTRY_VIEW);

    case 'roles':
    case 'الأدوار':
      return user.role === 'مدير النظام' || hasPermission(user, PERMISSIONS.ROLES_MANAGE);

    case 'reports':
    case 'التقارير':
      return hasPermission(user, PERMISSIONS.REPORTS_VIEW);

    case 'notifications':
    case 'الإشعارات':
      return hasPermission(user, PERMISSIONS.NOTIFICATIONS_VIEW);

    case 'audit-logs':
    case 'سجل العمليات':
      return hasPermission(user, PERMISSIONS.AUDIT_LOGS_VIEW);

    case 'settings':
    case 'الإعدادات':
      return hasPermission(user, PERMISSIONS.SETTINGS_MANAGE);

    case 'whatsapp':
    case 'واتساب':
      return hasPermission(user, PERMISSIONS.WHATSAPP_VIEW);

    default:
      return false;
  }
};
