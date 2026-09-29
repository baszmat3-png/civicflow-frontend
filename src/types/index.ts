export type RequestStatus = 
  | 'استلام الطلب'
  | 'قيد المراجعة'
  | 'تم إرسال الطلب للجهة'
  | 'قيد المعالجة'
  | 'مطلوب مستندات'
  | 'موافقة'
  | 'مرفوض'
  | 'الإجابة جاهزة'
  | 'تم إشعار المراجع'
  | 'تم التسليم'
  | 'مغلق';

export type RequestPriority = 'عادي' | 'مهم' | 'عاجل';

export type RequestType = 
  | 'إصدار تصريح'
  | 'تجديد رخصة'
  | 'طلب شهادة رسمية'
  | 'شكوى وتظلم'
  | 'استعلام إداري'
  | 'طلب إعفاء'
  | 'معاملة توثيق'
  | 'أخرى'
  | string;

export interface City {
  id: string;
  name: string;
  code?: string;
  isActive: boolean;
  customersCount?: number;
  requestsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RequestTypeEntity {
  id: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  requestsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type DeadlineStatus = 'ضمن المدة' | 'اقترب الموعد' | 'متأخر';

export type DocumentType =
  | 'INTERNAL'
  | 'IDENTITY'
  | 'REQUEST_DOCUMENT'
  | 'SENDING_DOCUMENT'
  | 'APPROVAL_DOCUMENT'
  | 'REJECTION_DOCUMENT'
  | 'FINAL_RESPONSE'
  | 'DELIVERY_PROOF'
  | 'GENERAL';

export interface RequestAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: string;
  uploadedBy: string;
  url?: string;
  documentType?: DocumentType | string;
  isPublic?: boolean;
  isIdentity?: boolean;
  stage?: string;
}

export interface RequestTimelineEvent {
  id: string;
  status: RequestStatus;
  date: string;
  time: string;
  employeeName: string;
  note: string;
  completed: boolean;
}

export interface FinalResponse {
  id: string;
  decision: 'موافقة' | 'رفض' | 'إنجاز المعاملة' | 'إحالة لجهة أخرى';
  summary: string;
  documentNumber?: string;
  issuedAt: string;
  issuedBy: string;
  attachmentName?: string;
  deliveredToCustomer: boolean;
  deliveryDate?: string;
}

export type OccupationType = 'موظف حكومي' | 'كاسب' | 'طالب' | 'عاطل عن العمل' | 'قطاع خاص' | 'أخرى' | string;

export interface RequestItem {
  id: string;
  requestNumber: string; // e.g. REQ-1025
  customerId: string;
  customerNumber?: string;
  customerName: string;
  customerPhone: string;
  customerAltPhone?: string;
  nationalId?: string;
  customerOccupation?: OccupationType;
  customerBirthYear?: string;
  customerAddress?: string;
  cityId?: string;
  cityName?: string;
  title: string;
  details: string;
  requestType: RequestType;
  requestTypeId?: string;
  ministryId: string;
  ministryName: string;
  status: RequestStatus;
  priority: RequestPriority;
  rejectionReason?: string;
  assignedEmployeeId: string;
  assignedEmployeeName: string;
  receiveDate: string; // YYYY-MM-DD
  expectedCompletionDate: string; // YYYY-MM-DD
  completedDate?: string;
  deadlineStatus: DeadlineStatus;
  daysRemainingOrOverdue: number; // positive = days left, negative = days overdue
  attachments: RequestAttachment[];
  timeline: RequestTimelineEvent[];
  finalResponse?: FinalResponse;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  customerNumber?: string;
  name: string;
  phone: string;
  altPhone?: string;
  nationalId?: string;
  occupation?: OccupationType;
  birthYear?: string;
  birthDate?: string;
  cityId?: string;
  cityName?: string;
  email?: string;
  address: string;
  notes?: string;
  requestsCount: number;
  lastRequestDate: string;
  createdAt: string;
  status: 'نشط' | 'محظور';
}

export interface Ministry {
  id: string;
  name: string;
  code: string;
  slaDays: number;
  activeRequestsCount: number;
  completedRequestsCount: number;
  overdueRequestsCount: number;
  status: 'نشط' | 'غير نشط';
  notes?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleId: string;
  role: string;
  department: string;
  assignedRequestsCount: number;
  status: 'نشط' | 'غير نشط';
  emailVerified?: boolean;
  lastLogin: string;
  avatarUrl?: string;
  permissions?: string[];
  assignedMinistries?: string[];
  isAutoAssignEnabled?: boolean;
}

export interface RolePermissionMatrix {
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  usersCount: number;
  permissions: RolePermissionMatrix[];
  extraPermissions: {
    changeStatus: boolean;
    uploadAttachments: boolean;
    exportExcel: boolean;
    sendNotifications: boolean;
    manageWhatsapp: boolean;
    viewAuditLogs: boolean;
  };
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  requestId?: string;
  requestNumber?: string;
  type: 'status_change' | 'overdue' | 'final_response' | 'docs_required' | 'system' | 'whatsapp';
  read: boolean;
  createdAt: string;
  timeAgo: string;
  link?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: 'إضافة طلب' | 'تعديل طلب' | 'تغيير حالة' | 'حذف طلب' | 'إضافة مراجع' | 'تعديل مراجع' | 'إضافة مرفق' | 'إضافة إجابة نهائية' | 'إرسال إشعار' | 'تعديل إعدادات';
  requestNumber?: string;
  details: string;
  ipAddress: string;
  date: string;
  time: string;
}

export interface GeneralSettings {
  systemName: string;
  systemSubName: string;
  officePhone: string;
  officeAddress: string;
  officeEmail: string;
  taxNumber?: string;
  workingDays: string[];
  workingHours: string;
  logoUrl?: string;
}

export interface StatusConfig {
  id: string;
  name: RequestStatus;
  color: string;
  order: number;
  isActive: boolean;
  isInitial?: boolean;
  isTerminal?: boolean;
  requiresNotes?: boolean;
}

export interface SlaConfig {
  id: string;
  ministryId: string;
  ministryName: string;
  defaultDays: number;
  urgentDays: number;
  importantDays: number;
  autoAlertBeforeDays: number;
}

export interface WhatsAppTrigger {
  id: string;
  event: string;
  title: string;
  enabled: boolean;
  templateId: string;
}

export interface WhatsAppTemplate {
  id: string;
  key: string;
  title: string;
  content: string;
  variables: string[];
  lastUpdated: string;
}

export interface WhatsAppSettings {
  isConnected: boolean;
  phoneNumber: string;
  instanceName: string;
  lastSync: string;
  triggers: WhatsAppTrigger[];
}

export interface SystemSettings {
  general: GeneralSettings;
  statuses: StatusConfig[];
  sla: SlaConfig[];
  whatsapp: WhatsAppSettings;
  whatsappTemplates: WhatsAppTemplate[];
  notificationPreferences: {
    enableInApp: boolean;
    enableOverdueAlerts: boolean;
    enableStatusAlerts: boolean;
    enableWhatsApp: boolean;
    autoNotifyCustomerOnStatusChange: boolean;
  };
}
