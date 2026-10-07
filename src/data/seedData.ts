import {
  Customer,
  Ministry,
  Employee,
  Role,
  RequestItem,
  NotificationItem,
  AuditLog,
  SystemSettings,
  City
} from '../types';

export const initialMinistries: Ministry[] = [
  {
    id: 'min-1',
    name: 'وزارة الصحة',
    code: 'MOH',
    slaDays: 7,
    activeRequestsCount: 0,
    completedRequestsCount: 0,
    overdueRequestsCount: 0,
    status: 'نشط',
    notes: 'معاملات التراخيص الطبية، التقارير والشهادات الصحية، والعلاج على نفقة الدولة.',
    contactPerson: 'د. عبد العزيز الشمري',
    contactPhone: '+966 11 212 5555',
    contactEmail: 'contact@moh.gov.sa'
  },
  {
    id: 'min-2',
    name: 'وزارة الداخلية',
    code: 'MOI',
    slaDays: 5,
    activeRequestsCount: 0,
    completedRequestsCount: 0,
    overdueRequestsCount: 0,
    status: 'نشط',
    notes: 'معاملات الأحوال المدنية، تصاريح الإقامة، التأشيرات والوثائق الأمنية.',
    contactPerson: 'العقيد فيصل القحطاني',
    contactPhone: '+966 11 401 1111',
    contactEmail: 'support@moi.gov.sa'
  },
  {
    id: 'min-3',
    name: 'وزارة العدل',
    code: 'MOJ',
    slaDays: 10,
    activeRequestsCount: 0,
    completedRequestsCount: 0,
    overdueRequestsCount: 0,
    status: 'نشط',
    notes: 'حجج الاستحكام، الوكالات الشرعية، تصديق العقود وتوثيق المعاملات.',
    contactPerson: 'الشيخ إبراهيم الدوسري',
    contactPhone: '+966 11 405 7777',
    contactEmail: 'info@moj.gov.sa'
  },
  {
    id: 'min-4',
    name: 'وزارة الخارجية',
    code: 'MOFA',
    slaDays: 8,
    activeRequestsCount: 0,
    completedRequestsCount: 0,
    overdueRequestsCount: 0,
    status: 'نشط',
    notes: 'تصديق الوثائق الدولية، التأشيرات الدبلوماسية، ومعاملات الجاليات.',
    contactPerson: 'أ. طارق الماجد',
    contactPhone: '+966 11 406 7777',
    contactEmail: 'consular@mofa.gov.sa'
  },
  {
    id: 'min-5',
    name: 'وزارة التعليم',
    code: 'MOE',
    slaDays: 6,
    activeRequestsCount: 0,
    completedRequestsCount: 0,
    overdueRequestsCount: 0,
    status: 'نشط',
    notes: 'معادلة الشهادات الأكاديمية، تراخيص المدارس الأهلية، والابتعاث الخارجي.',
    contactPerson: 'د. منيرة العتيبي',
    contactPhone: '+966 11 475 3000',
    contactEmail: 'relations@moe.gov.sa'
  },
  {
    id: 'min-6',
    name: 'وزارة التضامن الاجتماعي',
    code: 'MOSD',
    slaDays: 12,
    activeRequestsCount: 0,
    completedRequestsCount: 0,
    overdueRequestsCount: 0,
    status: 'نشط',
    notes: 'الإعانات الاجتماعية، دعم الأسر المنتجة، وتراخيص الجمعيات الخيرية.',
    contactPerson: 'أ. سامي الجبير',
    contactPhone: '+966 11 477 8888',
    contactEmail: 'social@mosd.gov.sa'
  }
];

export const initialCustomers: Customer[] = [];

export const initialEmployees: Employee[] = [
  {
    id: 'emp-1',
    name: 'أحمد (مدير النظام)',
    email: 'alzmat66@gmail.com',
    phone: '07700000001',
    roleId: 'role-1',
    role: 'مدير النظام',
    department: 'الإدارة العامة والمتابعة',
    assignedRequestsCount: 0,
    status: 'نشط',
    lastLogin: 'الآن',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'emp-2',
    name: 'مدير النظام المساعد',
    email: 'alzmat99@gmail.com',
    phone: '07700000002',
    roleId: 'role-1',
    role: 'مدير النظام',
    department: 'الإدارة العامة والمتابعة',
    assignedRequestsCount: 0,
    status: 'نشط',
    lastLogin: 'الآن'
  },
  {
    id: 'emp-3',
    name: 'مشرف النظام',
    email: 'baszmat3@gmail.com',
    phone: '07700000003',
    roleId: 'role-2',
    role: 'مشرف',
    department: 'قسم الاتصال والتنسيق الحكومي',
    assignedRequestsCount: 0,
    status: 'نشط',
    lastLogin: 'الآن'
  },
  {
    id: 'emp-4',
    name: 'مشرف المتابعة',
    email: 'mbas89077@gmail.com',
    phone: '07700000004',
    roleId: 'role-2',
    role: 'مشرف',
    department: 'إدارة متابعة المعاملات والسجلات',
    assignedRequestsCount: 0,
    status: 'نشط',
    lastLogin: 'الآن'
  }
];

export const initialRoles: Role[] = [
  {
    id: 'role-1',
    name: 'مدير النظام',
    description: 'صلاحيات كاملة وغير محدودة لإدارة كافة المعاملات والمستخدمين والإعدادات والتقارير.',
    usersCount: 2,
    permissions: [
      { module: 'الطلبات', view: true, create: true, edit: true, delete: true },
      { module: 'المراجعون', view: true, create: true, edit: true, delete: true },
      { module: 'الوزارات', view: true, create: true, edit: true, delete: true },
      { module: 'الموظفون', view: true, create: true, edit: true, delete: true },
      { module: 'التقارير', view: true, create: true, edit: true, delete: true },
      { module: 'الإشعارات', view: true, create: true, edit: true, delete: true },
      { module: 'الإعدادات', view: true, create: true, edit: true, delete: true },
      { module: 'سجل العمليات', view: true, create: true, edit: true, delete: true }
    ],
    extraPermissions: {
      changeStatus: true,
      uploadAttachments: true,
      exportExcel: true,
      sendNotifications: true,
      manageWhatsapp: true,
      viewAuditLogs: true
    }
  },
  {
    id: 'role-2',
    name: 'مشرف',
    description: 'متابعة سير العمل واعتماد الإجابات النهائية والتواصل مع ممثلي الوزارات والجهات.',
    usersCount: 2,
    permissions: [
      { module: 'الطلبات', view: true, create: true, edit: true, delete: false },
      { module: 'المراجعون', view: true, create: true, edit: true, delete: false },
      { module: 'الوزارات', view: true, create: true, edit: true, delete: false },
      { module: 'الموظفون', view: true, create: false, edit: false, delete: false },
      { module: 'التقارير', view: true, create: true, edit: true, delete: false },
      { module: 'الإشعارات', view: true, create: true, edit: true, delete: false },
      { module: 'الإعدادات', view: true, create: false, edit: false, delete: false },
      { module: 'سجل العمليات', view: true, create: false, edit: false, delete: false }
    ],
    extraPermissions: {
      changeStatus: true,
      uploadAttachments: true,
      exportExcel: true,
      sendNotifications: true,
      manageWhatsapp: false,
      viewAuditLogs: true
    }
  },
  {
    id: 'role-3',
    name: 'موظف متابعة',
    description: 'تحديث حالات الطلبات، وإرفاق الوثائق، ومتابعة مدد الإنجاز (SLA) والتنبيه بالمتأخرات.',
    usersCount: 0,
    permissions: [
      { module: 'الطلبات', view: true, create: true, edit: true, delete: false },
      { module: 'المراجعون', view: true, create: true, edit: true, delete: false },
      { module: 'الوزارات', view: true, create: false, edit: false, delete: false },
      { module: 'الموظفون', view: false, create: false, edit: false, delete: false },
      { module: 'التقارير', view: true, create: false, edit: false, delete: false },
      { module: 'الإشعارات', view: true, create: true, edit: false, delete: false },
      { module: 'الإعدادات', view: false, create: false, edit: false, delete: false },
      { module: 'سجل العمليات', view: false, create: false, edit: false, delete: false }
    ],
    extraPermissions: {
      changeStatus: true,
      uploadAttachments: true,
      exportExcel: true,
      sendNotifications: true,
      manageWhatsapp: false,
      viewAuditLogs: false
    }
  },
  {
    id: 'role-4',
    name: 'موظف استقبال',
    description: 'استلام المعاملات من المراجعين، وتسجيل بياناتهم، وفتح طلبات جديدة وإصدار إيصالات الاستلام.',
    usersCount: 0,
    permissions: [
      { module: 'الطلبات', view: true, create: true, edit: false, delete: false },
      { module: 'المراجعون', view: true, create: true, edit: true, delete: false },
      { module: 'الوزارات', view: true, create: false, edit: false, delete: false },
      { module: 'الموظفون', view: false, create: false, edit: false, delete: false },
      { module: 'التقارير', view: false, create: false, edit: false, delete: false },
      { module: 'الإشعارات', view: true, create: false, edit: false, delete: false },
      { module: 'الإعدادات', view: false, create: false, edit: false, delete: false },
      { module: 'سجل العمليات', view: false, create: false, edit: false, delete: false }
    ],
    extraPermissions: {
      changeStatus: false,
      uploadAttachments: true,
      exportExcel: false,
      sendNotifications: true,
      manageWhatsapp: false,
      viewAuditLogs: false
    }
  }
];

export const initialRequests: RequestItem[] = [];

export const initialNotifications: NotificationItem[] = [];

export const initialAuditLogs: AuditLog[] = [];

export const initialSystemSettings: SystemSettings = {
  general: {
    systemName: 'CivicFlow',
    systemSubName: 'منظومة إدارة وتتبع معاملات المراجعين الحكومية',
    officePhone: '',
    officeAddress: 'العراق_بغداد',
    officeEmail: 'support@civicflow.gov.iq',
    taxNumber: '',
    workingDays: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
    workingHours: '08:00 ص - 04:00 م',
    logoUrl: ''
  },
  statuses: [
    { id: 'st-1', name: 'استلام الطلب', color: 'slate', order: 1, isActive: true, isInitial: true },
    { id: 'st-2', name: 'قيد المراجعة', color: 'blue', order: 2, isActive: true },
    { id: 'st-3', name: 'تم إرسال الطلب للجهة', color: 'indigo', order: 3, isActive: true },
    { id: 'st-4', name: 'قيد المعالجة', color: 'amber', order: 4, isActive: true },
    { id: 'st-5', name: 'مطلوب مستندات', color: 'rose', order: 5, isActive: true, requiresNotes: true },
    { id: 'st-6', name: 'موافقة', color: 'emerald', order: 6, isActive: true },
    { id: 'st-7', name: 'مرفوض', color: 'red', order: 7, isActive: true, requiresNotes: true },
    { id: 'st-8', name: 'الإجابة جاهزة', color: 'cyan', order: 8, isActive: true },
    { id: 'st-9', name: 'تم إشعار المراجع', color: 'teal', order: 9, isActive: true },
    { id: 'st-10', name: 'تم التسليم', color: 'emerald', order: 10, isActive: true },
    { id: 'st-11', name: 'مغلق', color: 'zinc', order: 11, isActive: true, isTerminal: true }
  ],
  sla: [
    { id: 'sla-1', ministryId: 'min-1', ministryName: 'وزارة الصحة', defaultDays: 7, urgentDays: 3, importantDays: 5, autoAlertBeforeDays: 2 },
    { id: 'sla-2', ministryId: 'min-2', ministryName: 'وزارة الداخلية', defaultDays: 5, urgentDays: 2, importantDays: 4, autoAlertBeforeDays: 1 },
    { id: 'sla-3', ministryId: 'min-3', ministryName: 'وزارة العدل', defaultDays: 10, urgentDays: 4, importantDays: 7, autoAlertBeforeDays: 2 },
    { id: 'sla-4', ministryId: 'min-4', ministryName: 'وزارة الخارجية', defaultDays: 8, urgentDays: 3, importantDays: 6, autoAlertBeforeDays: 2 },
    { id: 'sla-5', ministryId: 'min-5', ministryName: 'وزارة التعليم', defaultDays: 6, urgentDays: 3, importantDays: 4, autoAlertBeforeDays: 1 },
    { id: 'sla-6', ministryId: 'min-6', ministryName: 'وزارة التضامن الاجتماعي', defaultDays: 12, urgentDays: 5, importantDays: 8, autoAlertBeforeDays: 3 }
  ],
  whatsapp: {
    isConnected: true,
    phoneNumber: '+966 50 123 9988',
    instanceName: 'CivicFlow-Gov-Gateway-01',
    lastSync: '2026-09-03 20:00',
    triggers: [
      { id: 'trg-1', event: 'on_created', title: 'عند استلام الطلب', enabled: true, templateId: 'tpl-1' },
      { id: 'trg-2', event: 'on_status_change', title: 'عند تغيير الحالة', enabled: true, templateId: 'tpl-2' },
      { id: 'trg-3', event: 'on_docs_needed', title: 'عند طلب مستندات إضافية', enabled: true, templateId: 'tpl-3' },
      { id: 'trg-4', event: 'on_approved', title: 'عند الموافقة', enabled: true, templateId: 'tpl-4' },
      { id: 'trg-5', event: 'on_rejected', title: 'عند الرفض', enabled: true, templateId: 'tpl-5' },
      { id: 'trg-6', event: 'on_ready', title: 'عند جاهزية الإجابة', enabled: true, templateId: 'tpl-6' },
      { id: 'trg-7', event: 'on_delivered', title: 'عند التسليم', enabled: true, templateId: 'tpl-7' },
      { id: 'trg-8', event: 'on_overdue', title: 'عند التأخر وتجاوز المدة', enabled: true, templateId: 'tpl-8' }
    ]
  },
  whatsappTemplates: [
    {
      id: 'tpl-1',
      key: 'receive_request',
      title: 'استلام الطلب',
      content: 'عزيزي المراجع {{customer_name}}، تم استلام طلبك رقم {{request_number}} بنجاح لدى {{ministry}}. الموعد المتوقع للإنجاز: {{expected_date}}. يمكنك متابعة الطلب عبر الرابط: {{tracking_link}}',
      variables: ['customer_name', 'request_number', 'ministry', 'expected_date', 'tracking_link'],
      lastUpdated: '2026-09-01'
    },
    {
      id: 'tpl-2',
      key: 'status_changed',
      title: 'تغيير الحالة',
      content: 'مرحباً {{customer_name}}، نود إحاطتك بأن حالة طلبك رقم {{request_number}} أصبحت الآن: ({{status}}) لدى {{ministry}}. الرابط: {{tracking_link}}',
      variables: ['customer_name', 'request_number', 'status', 'ministry', 'tracking_link'],
      lastUpdated: '2026-08-25'
    },
    {
      id: 'tpl-3',
      key: 'docs_required',
      title: 'طلب مستندات',
      content: 'عزيزي المراجع {{customer_name}}، يلزم استكمال بعض المستندات للطلب {{request_number}} لدى {{ministry}}. يرجى مراجعة المنصة أو زيارة الفرع في أقرب وقت. الرابط: {{tracking_link}}',
      variables: ['customer_name', 'request_number', 'ministry', 'tracking_link'],
      lastUpdated: '2026-08-20'
    },
    {
      id: 'tpl-4',
      key: 'approved',
      title: 'الموافقة',
      content: 'بشرى سارة {{customer_name}}، تمت الموافقة على طلبك رقم {{request_number}} من قبل {{ministry}}. جاري إعداد الوثائق النهائية. الرابط: {{tracking_link}}',
      variables: ['customer_name', 'request_number', 'ministry', 'tracking_link'],
      lastUpdated: '2026-08-15'
    },
    {
      id: 'tpl-5',
      key: 'rejected',
      title: 'الرفض',
      content: 'عزيزي المراجع {{customer_name}}، نأسف لإبلاغكم برفض الطلب رقم {{request_number}} لدى {{ministry}}. لمعرفة أسباب الرفض وتقديم تظلم: {{tracking_link}}',
      variables: ['customer_name', 'request_number', 'ministry', 'tracking_link'],
      lastUpdated: '2026-08-15'
    },
    {
      id: 'tpl-6',
      key: 'ready_for_pickup',
      title: 'الإجابة جاهزة',
      content: 'عزيزي المراجع {{customer_name}}، الإجابة والوثائق الرسمية للطلب رقم {{request_number}} جاهزة للاستلام. يمكنك مراجعتنا أو تحميلها مباشرة عبر: {{tracking_link}}',
      variables: ['customer_name', 'request_number', 'tracking_link'],
      lastUpdated: '2026-08-10'
    },
    {
      id: 'tpl-7',
      key: 'delivered',
      title: 'التسليم',
      content: 'شكراً لك {{customer_name}}، تم تسليم المعاملة رقم {{request_number}} بنجاح وإغلاق الطلب. يسعدنا تقييمكم لخدمتنا عبر: {{tracking_link}}',
      variables: ['customer_name', 'request_number', 'tracking_link'],
      lastUpdated: '2026-08-05'
    },
    {
      id: 'tpl-8',
      key: 'overdue_alert',
      title: 'التأخر',
      content: 'عزيزي المراجع {{customer_name}}، نعتذر عن التأخير الخارج عن إرادتنا في إنجاز الطلب رقم {{request_number}}. تم تصعيد المعاملة للمشرف ونعمل على إنهائها بأسرع وقت.',
      variables: ['customer_name', 'request_number', 'ministry'],
      lastUpdated: '2026-08-01'
    }
  ],
  notificationPreferences: {
    enableInApp: true,
    enableOverdueAlerts: true,
    enableStatusAlerts: true,
    enableWhatsApp: true,
    autoNotifyCustomerOnStatusChange: true
  }
};

export const initialCities: City[] = [
  { id: 'city-1', name: 'دهوك', code: 'DHK', isActive: true, requestsCount: 0, customersCount: 0 },
  { id: 'city-2', name: 'نينوى', code: 'NNW', isActive: true, requestsCount: 0, customersCount: 0 },
  { id: 'city-3', name: 'أربيل', code: 'EBL', isActive: true, requestsCount: 0, customersCount: 0 },
  { id: 'city-4', name: 'كركوك', code: 'KRK', isActive: true, requestsCount: 0, customersCount: 0 },
  { id: 'city-5', name: 'السليمانية', code: 'SLM', isActive: true, requestsCount: 0, customersCount: 0 },
  { id: 'city-6', name: 'صلاح الدين', code: 'SLD', isActive: true, requestsCount: 0, customersCount: 0 },
  { id: 'city-7', name: 'الأنبار', code: 'ANB', isActive: true, requestsCount: 0, customersCount: 0 },
  { id: 'city-8', name: 'ديالى', code: 'DYL', isActive: true, requestsCount: 0, customersCount: 0 },
  { id: 'city-9', name: 'بغداد', code: 'BGD', isActive: true, requestsCount: 0, customersCount: 0 },
  { id: 'city-10', name: 'واسط', code: 'WST', isActive: true, requestsCount: 0, customersCount: 0 },
  { id: 'city-11', name: 'بابل', code: 'BBL', isActive: true, requestsCount: 0, customersCount: 0 },
  { id: 'city-12', name: 'كربلاء', code: 'KRB', isActive: true, requestsCount: 0, customersCount: 0 },
  { id: 'city-13', name: 'النجف', code: 'NJF', isActive: true, requestsCount: 0, customersCount: 0 },
  { id: 'city-14', name: 'القادسية', code: 'QAD', isActive: true, requestsCount: 0, customersCount: 0 },
  { id: 'city-15', name: 'ميسان', code: 'MSN', isActive: true, requestsCount: 0, customersCount: 0 },
  { id: 'city-16', name: 'ذي قار', code: 'DQR', isActive: true, requestsCount: 0, customersCount: 0 },
  { id: 'city-17', name: 'المثنى', code: 'MTN', isActive: true, requestsCount: 0, customersCount: 0 },
  { id: 'city-18', name: 'البصرة', code: 'BSR', isActive: true, requestsCount: 0, customersCount: 0 },
  { id: 'city-19', name: 'حلبجة', code: 'HLB', isActive: true, requestsCount: 0, customersCount: 0 }
];
