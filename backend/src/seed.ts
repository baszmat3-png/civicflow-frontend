import { PrismaClient, Prisma, PriorityLevel, UserStatus, CustomerStatus, DocumentType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log('🌱 Starting CivicFlow database seeding with product upgrade...');

  // 1. Check if database already contains real data to prevent duplicate demo seeding
  const existingReqsCount = await prisma.request.count();
  const existingUsersCount = await prisma.user.count();
  if (existingReqsCount > 0 || existingUsersCount > 0) {
    console.log('✅ Real database records already exist. Preserving user data and skipping demo seeding.');
    return;
  }

  // 2. Seed Permissions
  const permissionsData = [
    // Requests
    { key: 'requests.view', module: 'الطلبات', description: 'عرض قائمة وتفاصيل الطلبات والمعاملات' },
    { key: 'requests.create', module: 'الطلبات', description: 'تسجيل معاملة جديدة في النظام' },
    { key: 'requests.update', module: 'الطلبات', description: 'تعديل بيانات المعاملات' },
    { key: 'requests.delete', module: 'الطلبات', description: 'حذف المعاملات من النظام' },
    { key: 'requests.change_status', module: 'الطلبات', description: 'تغيير وتحديث حالة المعاملة' },
    { key: 'requests.attachments', module: 'الطلبات', description: 'إرفاق وتحميل المستندات والملفات' },
    { key: 'requests.final_response', module: 'الطلبات', description: 'اعتماد وتسجيل الإجابة والقرار النهائي' },
    // Customers
    { key: 'customers.view', module: 'المراجعون', description: 'عرض قائمة وسجلات المراجعين' },
    { key: 'customers.create', module: 'المراجعون', description: 'إضافة مراجع جديد' },
    { key: 'customers.update', module: 'المراجعون', description: 'تعديل بيانات مراجع' },
    { key: 'customers.delete', module: 'المراجعون', description: 'حذف مراجع' },
    // Ministries
    { key: 'ministries.view', module: 'الوزارات', description: 'عرض الوزارات والجهات الحكومية' },
    { key: 'ministries.create', module: 'الوزارات', description: 'إضافة وزارة أو جهة جديدة' },
    { key: 'ministries.update', module: 'الوزارات', description: 'تعديل بيانات ومدد إنجاز الوزارات' },
    { key: 'ministries.delete', module: 'الوزارات', description: 'حذف جهة أو وزارة' },
    // Cities
    { key: 'cities.view', module: 'المدن', description: 'عرض قائمة المدن والمناطق' },
    { key: 'cities.create', module: 'المدن', description: 'إضافة مدينة جديدة' },
    { key: 'cities.update', module: 'المدن', description: 'تعديل بيانات وتفعيل/تعطيل المدن' },
    { key: 'cities.delete', module: 'المدن', description: 'حذف مدينة من النظام' },
    // Request Types
    { key: 'request_types.view', module: 'أنواع الطلبات', description: 'عرض أنواع وتصنيفات المعاملات' },
    { key: 'request_types.create', module: 'أنواع الطلبات', description: 'إضافة نوع معاملة جديد' },
    { key: 'request_types.update', module: 'أنواع الطلبات', description: 'تعديل وتفعيل/تعطيل نوع المعاملة' },
    { key: 'request_types.delete', module: 'أنواع الطلبات', description: 'حذف نوع معاملة' },
    // Users
    { key: 'users.view', module: 'الموظفون', description: 'عرض قائمة الموظفين والمستخدمين' },
    { key: 'users.create', module: 'الموظفون', description: 'إضافة موظف جديد' },
    { key: 'users.update', module: 'الموظفون', description: 'تعديل بيانات وصلاحيات الموظف' },
    { key: 'users.delete', module: 'الموظفون', description: 'تعطيل أو حذف حساب موظف' },
    // Reports & Exports
    { key: 'reports.view', module: 'التقارير', description: 'عرض لوحة مؤشرات الأداء والتقارير' },
    { key: 'reports.export', module: 'التقارير', description: 'تصدير التقارير إلى Excel' },
    { key: 'reports.export_pdf', module: 'التقارير', description: 'تصدير التقارير إلى PDF' },
    // Notifications
    { key: 'notifications.view', module: 'الإشعارات', description: 'استقبال وعرض إشعارات النظام' },
    // WhatsApp
    { key: 'whatsapp.view', module: 'واتساب', description: 'عرض قوالب وسجلات رسائل WhatsApp' },
    { key: 'whatsapp.manage', module: 'واتساب', description: 'إدارة إعدادات وتكامل WhatsApp' },
    { key: 'whatsapp.send', module: 'واتساب', description: 'إرسال إشعارات عبر WhatsApp' },
    // Settings & Audit
    { key: 'settings.manage', module: 'الإعدادات', description: 'تعديل إعدادات النظام العامة والمدد والحالات' },
    { key: 'audit_logs.view', module: 'سجل العمليات', description: 'عرض سجل تدقيق العمليات الأمنية والإدارية' },
    { key: 'audit_logs.export_pdf', module: 'سجل العمليات', description: 'تصدير سجل العمليات إلى PDF' }
  ];

  const createdPermissions: Record<string, string> = {};
  for (const perm of permissionsData) {
    const p = await prisma.permission.create({ data: perm });
    createdPermissions[perm.key] = p.id;
  }
  console.log(`✅ Seeded ${permissionsData.length} permissions.`);

  // 3. Seed Roles
  const adminRole = await prisma.role.create({
    data: {
      name: 'مدير النظام',
      description: 'صلاحيات كاملة وغير محدودة لإدارة كافة المعاملات والمستخدمين والإعدادات والتقارير.'
    }
  });

  const supervisorRole = await prisma.role.create({
    data: {
      name: 'مشرف',
      description: 'متابعة سير العمل واعتماد الإجابات النهائية والتواصل مع ممثلي الوزارات والجهات.'
    }
  });

  const followUpRole = await prisma.role.create({
    data: {
      name: 'موظف متابعة',
      description: 'تحديث حالات الطلبات، وإرفاق الوثائق، ومتابعة مدد الإنجاز (SLA) والتنبيه بالمتأخرات.'
    }
  });

  const receptionistRole = await prisma.role.create({
    data: {
      name: 'موظف استقبال',
      description: 'استلام المعاملات من المراجعين، وتسجيل بياناتهم، وفتح طلبات جديدة وإصدار إيصالات الاستلام.'
    }
  });

  // Admin -> All permissions
  for (const permId of Object.values(createdPermissions)) {
    await prisma.rolePermission.create({
      data: { roleId: adminRole.id, permissionId: permId }
    });
  }

  // Supervisor permissions
  const supervisorPermKeys = [
    'requests.view', 'requests.create', 'requests.update', 'requests.change_status', 'requests.attachments', 'requests.final_response',
    'customers.view', 'customers.create', 'customers.update',
    'ministries.view', 'ministries.create', 'ministries.update',
    'cities.view', 'cities.create', 'cities.update',
    'request_types.view', 'request_types.create', 'request_types.update',
    'users.view', 'users.create', 'users.update', 'users.delete',
    'reports.view', 'reports.export', 'reports.export_pdf',
    'notifications.view',
    'whatsapp.view', 'whatsapp.send',
    'audit_logs.view', 'audit_logs.export_pdf'
  ];
  for (const key of supervisorPermKeys) {
    if (createdPermissions[key]) {
      await prisma.rolePermission.create({
        data: { roleId: supervisorRole.id, permissionId: createdPermissions[key] }
      });
    }
  }

  // Follow-up permissions
  const followUpPermKeys = [
    'requests.view', 'requests.create', 'requests.update', 'requests.change_status', 'requests.attachments',
    'customers.view', 'customers.create', 'customers.update',
    'ministries.view',
    'cities.view',
    'request_types.view',
    'reports.view', 'reports.export', 'reports.export_pdf',
    'notifications.view'
  ];
  for (const key of followUpPermKeys) {
    if (createdPermissions[key]) {
      await prisma.rolePermission.create({
        data: { roleId: followUpRole.id, permissionId: createdPermissions[key] }
      });
    }
  }

  // Receptionist permissions
  const receptionistPermKeys = [
    'requests.view', 'requests.create',
    'customers.view', 'customers.create', 'customers.update',
    'ministries.view',
    'cities.view',
    'request_types.view',
    'notifications.view'
  ];
  for (const key of receptionistPermKeys) {
    if (createdPermissions[key]) {
      await prisma.rolePermission.create({
        data: { roleId: receptionistRole.id, permissionId: createdPermissions[key] }
      });
    }
  }
  console.log('✅ Seeded 4 Roles with RBAC permissions.');

  // 4. Seed Users
  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash(process.env.INITIAL_ADMIN_PASSWORD || 'CivicFlow@2026!', saltRounds);
  const defaultPasswordHash = adminPasswordHash;

  const adminUser = await prisma.user.create({
    data: {
      name: 'أحمد (مدير النظام)',
      email: 'alzmat66@gmail.com',
      phone: '07700000001',
      passwordHash: adminPasswordHash,
      roleId: adminRole.id,
      department: 'الإدارة العامة والمتابعة',
      status: UserStatus.ACTIVE,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      lastLogin: new Date()
    }
  });
  const clientAdminUser = adminUser;

  const supervisorUser = await prisma.user.create({
    data: {
      name: 'مدير النظام المساعد',
      email: 'alzmat99@gmail.com',
      phone: '07700000002',
      passwordHash: defaultPasswordHash,
      roleId: adminRole.id,
      department: 'الإدارة العامة والمتابعة',
      status: UserStatus.ACTIVE,
      lastLogin: new Date()
    }
  });

  const followUpUser = await prisma.user.create({
    data: {
      name: 'مشرف النظام',
      email: 'baszmat3@gmail.com',
      phone: '07700000003',
      passwordHash: defaultPasswordHash,
      roleId: supervisorRole.id,
      department: 'قسم الاتصال والتنسيق الحكومي',
      status: UserStatus.ACTIVE,
      lastLogin: new Date()
    }
  });

  const receptionistUser = await prisma.user.create({
    data: {
      name: 'مشرف المتابعة',
      email: 'mbas89077@gmail.com',
      phone: '07700000004',
      passwordHash: defaultPasswordHash,
      roleId: supervisorRole.id,
      department: 'إدارة متابعة المعاملات والسجلات',
      status: UserStatus.ACTIVE,
      lastLogin: new Date()
    }
  });
  console.log('✅ Seeded real verified accounts requested by user (alzmat66, alzmat99, baszmat3, mbas89077).');

  // 5. Seed Cities (محافظات العراق الـ 19 من الشمال إلى الجنوب)
  const citiesData = [
    'دهوك',
    'نينوى',
    'أربيل',
    'كركوك',
    'السليمانية',
    'صلاح الدين',
    'الأنبار',
    'ديالى',
    'بغداد',
    'واسط',
    'بابل',
    'كربلاء',
    'النجف',
    'القادسية',
    'ميسان',
    'ذي قار',
    'المثنى',
    'البصرة',
    'حلبجة'
  ];
  const createdCities: Record<string, string> = {};
  for (const cityName of citiesData) {
    const c = await prisma.city.create({
      data: { name: cityName, status: UserStatus.ACTIVE }
    });
    createdCities[cityName] = c.id;
  }
  console.log(`✅ Seeded ${citiesData.length} Iraqi governorates.`);

  // 6. Seed Request Types (أنواع الطلبات)
  const requestTypesData = [
    'إصدار تصريح', 'تجديد رخصة', 'طلب شهادة رسمية', 'شكوى وتظلم',
    'استعلام إداري', 'طلب إعفاء', 'معاملة توثيق', 'طلب موافقة', 'طلب نقل'
  ];
  const createdRequestTypes: Record<string, string> = {};
  for (const typeName of requestTypesData) {
    const rt = await prisma.requestType.create({
      data: { name: typeName, status: UserStatus.ACTIVE }
    });
    createdRequestTypes[typeName] = rt.id;
  }
  console.log(`✅ Seeded ${requestTypesData.length} request types.`);

  // 7. Seed Request Statuses
  const statusesData = [
    { name: 'استلام الطلب', color: 'blue', order: 1, isInitial: true, isActive: true },
    { name: 'قيد المراجعة', color: 'amber', order: 2, isActive: true },
    { name: 'تم إرسال الطلب للجهة', color: 'indigo', order: 3, isActive: true },
    { name: 'قيد المعالجة', color: 'purple', order: 4, isActive: true },
    { name: 'مطلوب مستندات', color: 'rose', order: 5, requiresNotes: true, isActive: true },
    { name: 'موافقة', color: 'emerald', order: 6, isActive: true },
    { name: 'مرفوض', color: 'rose', order: 7, requiresNotes: true, isTerminal: true, isActive: true },
    { name: 'الإجابة جاهزة', color: 'cyan', order: 8, isActive: true },
    { name: 'تم إشعار المراجع', color: 'teal', order: 9, isActive: true },
    { name: 'تم التسليم', color: 'emerald', order: 10, isTerminal: true, isActive: true },
    { name: 'مغلق', color: 'slate', order: 11, isTerminal: true, isActive: true }
  ];

  for (const s of statusesData) {
    await prisma.requestStatus.create({ data: s });
  }
  console.log(`✅ Seeded ${statusesData.length} request statuses.`);

  // 8. Seed Ministries & SLA
  const ministriesData = [
    {
      name: 'وزارة الصحة',
      code: 'MOH',
      slaDays: 7,
      status: UserStatus.ACTIVE,
      notes: 'معاملات التراخيص الطبية، التقارير والشهادات الصحية، والعلاج على نفقة الدولة.',
      contactPerson: 'د. عبد العزيز الشمري',
      contactPhone: '+966 11 212 5555',
      contactEmail: 'contact@moh.gov.sa',
      sla: { defaultDays: 7, urgentDays: 3, importantDays: 5, autoAlertBeforeDays: 2 }
    },
    {
      name: 'وزارة الداخلية',
      code: 'MOI',
      slaDays: 5,
      status: UserStatus.ACTIVE,
      notes: 'معاملات الأحوال المدنية، تصاريح الإقامة، التأشيرات والوثائق الأمنية.',
      contactPerson: 'العقيد فيصل القحطاني',
      contactPhone: '+966 11 401 1111',
      contactEmail: 'support@moi.gov.sa',
      sla: { defaultDays: 5, urgentDays: 2, importantDays: 3, autoAlertBeforeDays: 1 }
    },
    {
      name: 'وزارة العدل',
      code: 'MOJ',
      slaDays: 10,
      status: UserStatus.ACTIVE,
      notes: 'حجج الاستحكام، الوكالات الشرعية، تصديق العقود وتوثيق المعاملات.',
      contactPerson: 'الشيخ إبراهيم الدوسري',
      contactPhone: '+966 11 405 7777',
      contactEmail: 'info@moj.gov.sa',
      sla: { defaultDays: 10, urgentDays: 4, importantDays: 7, autoAlertBeforeDays: 2 }
    },
    {
      name: 'وزارة الخارجية',
      code: 'MOFA',
      slaDays: 8,
      status: UserStatus.ACTIVE,
      notes: 'تصديق الوثائق الدولية، التأشيرات الدبلوماسية، ومعاملات الجاليات.',
      contactPerson: 'أ. طارق الماجد',
      contactPhone: '+966 11 406 7777',
      contactEmail: 'consular@mofa.gov.sa',
      sla: { defaultDays: 8, urgentDays: 3, importantDays: 5, autoAlertBeforeDays: 2 }
    },
    {
      name: 'وزارة التعليم',
      code: 'MOE',
      slaDays: 6,
      status: UserStatus.ACTIVE,
      notes: 'معادلة الشهادات الأكاديمية، تراخيص المدارس الأهلية، والابتعاث الخارجي.',
      contactPerson: 'د. منيرة العتيبي',
      contactPhone: '+966 11 475 3000',
      contactEmail: 'relations@moe.gov.sa',
      sla: { defaultDays: 6, urgentDays: 2, importantDays: 4, autoAlertBeforeDays: 2 }
    },
    {
      name: 'وزارة التضامن الاجتماعي',
      code: 'MOSD',
      slaDays: 12,
      status: UserStatus.ACTIVE,
      notes: 'الإعانات الاجتماعية، دعم الأسر المنتجة، وتراخيص الجمعيات الخيرية.',
      contactPerson: 'أ. سامي الجبير',
      contactPhone: '+966 11 477 8888',
      contactEmail: 'social@mosd.gov.sa',
      sla: { defaultDays: 12, urgentDays: 5, importantDays: 8, autoAlertBeforeDays: 3 }
    }
  ];

  const createdMinistries: Record<string, string> = {};
  for (const m of ministriesData) {
    const { sla, ...minDetails } = m;
    const min = await prisma.ministry.create({ data: minDetails });
    createdMinistries[min.code] = min.id;
    await prisma.sLASetting.create({
      data: {
        ministryId: min.id,
        ...sla
      }
    });
  }
  console.log(`✅ Seeded ${ministriesData.length} ministries with SLA configurations.`);

  // 9. Seed Customers with explicit customerNumber (رقم المراجع) & nationalId
  const customersData = [
    {
      customerNumber: 'CUST-1001',
      name: 'محمد أحمد علي',
      phone: '07701234567',
      altPhone: '07809876543',
      nationalId: '1092837465',
      email: 'mohammed.ali@example.com',
      cityId: createdCities['بغداد'],
      address: 'بغداد - الكرادة - قرب ساحة الفردوس',
      notes: 'مراجع دائم لمعاملات وزارة الصحة والترخيص المهني الطبي.',
      status: CustomerStatus.ACTIVE
    },
    {
      customerNumber: 'CUST-1002',
      name: 'أحمد محمود حسن',
      phone: '07712345678',
      altPhone: '07812345678',
      nationalId: '1083746592',
      email: 'ahmed.m@example.com',
      cityId: createdCities['أربيل'],
      address: 'أربيل - طريق المطار - حي الإسكان',
      notes: 'يرغب في استلام الإشعارات وتحديثات المعاملات عبر WhatsApp فقط.',
      status: CustomerStatus.ACTIVE
    },
    {
      customerNumber: 'CUST-1003',
      name: 'سارة محمد عبدالله',
      phone: '07501234567',
      nationalId: '1074658392',
      email: 'sara.abdullah@example.com',
      cityId: createdCities['البصرة'],
      address: 'البصرة - العشار - شارع الاستقلال',
      notes: 'معاملة تجديد رخصة وتصديق شهادات أكاديمية.',
      status: CustomerStatus.ACTIVE
    },
    {
      customerNumber: 'CUST-1004',
      name: 'خالد عبدالله',
      phone: '07709876543',
      altPhone: '07809876543',
      nationalId: '1065748392',
      email: 'khaled.ab@example.com',
      cityId: createdCities['النجف'],
      address: 'النجف - حي السعد',
      notes: 'معاملة إفراغ عقاري وتوثيق وكالة في وزارة العدل.',
      status: CustomerStatus.ACTIVE
    },
    {
      customerNumber: 'CUST-1005',
      name: 'محمود السيد',
      phone: '07519876543',
      nationalId: '1056847392',
      email: 'mahmoud.sayed@example.com',
      cityId: createdCities['نينوى'],
      address: 'نينوى - الموصل - حي الزهور',
      notes: 'طلب إعفاء وتظلم إداري بوزارة التضامن الاجتماعي.',
      status: CustomerStatus.ACTIVE
    },
    {
      customerNumber: 'CUST-1006',
      name: 'نور أحمد',
      phone: '07723456789',
      altPhone: '07823456789',
      nationalId: '1047958392',
      email: 'nour.ahmed@example.com',
      cityId: createdCities['السليمانية'],
      address: 'السليمانية - شارع سالم',
      notes: 'معاملات تصديق قنصلي بوزارة الخارجية.',
      status: CustomerStatus.ACTIVE
    }
  ];

  const createdCustomers: any[] = [];
  for (const c of customersData) {
    const cust = await prisma.customer.create({ data: c });
    createdCustomers.push(cust);
  }
  console.log(`✅ Seeded ${customersData.length} customers with unique customer numbers.`);

  // 10. Seed Requests with status history, attachments, documentType, isPublic
  const req1 = await prisma.request.create({
    data: {
      requestNumber: 'REQ-1025',
      customerId: createdCustomers[0].id,
      ministryId: createdMinistries['MOH'],
      cityId: createdCities['بغداد'],
      requestTypeId: createdRequestTypes['إصدار تصريح'],
      assignedEmployeeId: followUpUser.id,
      title: 'طلب ترخيص منشأة صحية خاصة وتجديد السجل الطبي',
      details: 'المعاملة تتضمن مراجعة المخططات الهندسية للمركز الطبي واعتماد الكادر التمريضي والأجهزة المعتمدة طبقاً للاشتراطات التنظيمية.',
      requestType: 'إصدار تصريح',
      status: 'قيد المعالجة',
      priority: PriorityLevel.URGENT,
      receiveDate: new Date('2026-08-28'),
      expectedCompletionDate: new Date('2026-09-04'),
      deadlineStatus: 'اقترب الموعد',
      daysRemainingOrOverdue: 1,
      internalNotes: 'المراجع استفسر هاتفياً اليوم وتم إبلاغه أن المعاملة قيد الاعتماد النهائي وستصدر خلال 24 ساعة.',
      statusHistory: {
        create: [
          {
            oldStatus: null,
            newStatus: 'استلام الطلب',
            changedById: receptionistUser.id,
            employeeName: 'خالد إبراهيم',
            note: 'تم استقبال المراجع وتسجيل الطلب وإرفاق المستندات الأولية.',
            createdAt: new Date('2026-08-28T10:15:00Z')
          },
          {
            oldStatus: 'استلام الطلب',
            newStatus: 'قيد المراجعة',
            changedById: supervisorUser.id,
            employeeName: 'محمد حسن',
            note: 'تم فحص المرفقات والتأكد من مطابقة شروط التقديم المبدئية.',
            createdAt: new Date('2026-08-28T11:30:00Z')
          },
          {
            oldStatus: 'قيد المراجعة',
            newStatus: 'تم إرسال الطلب للجهة',
            changedById: followUpUser.id,
            employeeName: 'سارة محمود',
            note: 'تم تصدير المعاملة رسمياً إلى الإدارة العامة للتراخيص بوزارة الصحة برقم صادر 440912.',
            documentName: 'مستند_الإرسال_الصادر_440912.pdf',
            documentPath: 'uploads/demo_sending_letter.pdf',
            isPublicDoc: true,
            createdAt: new Date('2026-08-29T09:00:00Z')
          },
          {
            oldStatus: 'تم إرسال الطلب للجهة',
            newStatus: 'قيد المعالجة',
            changedById: followUpUser.id,
            employeeName: 'سارة محمود',
            note: 'المعاملة قيد الدراسة لدى اللجنة الفنية بوزارة الصحة.',
            createdAt: new Date('2026-08-30T13:45:00Z')
          }
        ]
      },
      attachments: {
        create: [
          {
            name: 'صورة_الهوية_الوطنية.jpg',
            filePath: 'uploads/demo_national_id.jpg',
            fileSize: '1.1 MB',
            fileType: 'Image',
            mimeType: 'image/jpeg',
            documentType: DocumentType.IDENTITY,
            isPublic: false,
            isIdentity: true,
            uploadedBy: 'خالد إبراهيم',
            uploadedAt: new Date('2026-08-28T10:14:00Z')
          },
          {
            name: 'مستند_الإرسال_الصادر_440912.pdf',
            filePath: 'uploads/demo_sending_letter.pdf',
            fileSize: '2.4 MB',
            fileType: 'PDF',
            mimeType: 'application/pdf',
            documentType: DocumentType.SENDING_DOCUMENT,
            isPublic: true,
            isIdentity: false,
            uploadedBy: 'سارة محمود',
            uploadedAt: new Date('2026-08-29T09:00:00Z')
          },
          {
            name: 'المخطط_الهندسي_للمنشأة.pdf',
            filePath: 'uploads/demo_engineering_plan.pdf',
            fileSize: '8.1 MB',
            fileType: 'PDF',
            mimeType: 'application/pdf',
            documentType: DocumentType.REQUEST_DOCUMENT,
            isPublic: false,
            uploadedBy: 'خالد إبراهيم',
            uploadedAt: new Date('2026-08-28T10:16:00Z')
          }
        ]
      }
    }
  });

  const req2 = await prisma.request.create({
    data: {
      requestNumber: 'REQ-1042',
      customerId: createdCustomers[1].id,
      ministryId: createdMinistries['MOI'],
      cityId: createdCities['جدة'],
      requestTypeId: createdRequestTypes['تجديد رخصة'],
      assignedEmployeeId: supervisorUser.id,
      title: 'تجديد تصريح إقامة استثنائية ونقل كفالة مهنية',
      details: 'طلب نقل خدمات وتجديد الإقامة مع تقديم استثناء لظروف العمل والتنقل.',
      requestType: 'تجديد رخصة',
      status: 'قيد المعالجة',
      priority: PriorityLevel.URGENT,
      receiveDate: new Date('2026-08-22'),
      expectedCompletionDate: new Date('2026-08-27'),
      deadlineStatus: 'متأخر',
      daysRemainingOrOverdue: -7,
      internalNotes: 'تم إرسال تذكير عاجل لمنسق وزارة الداخلية للاستعجال بالرد.',
      statusHistory: {
        create: [
          {
            oldStatus: null,
            newStatus: 'استلام الطلب',
            changedById: receptionistUser.id,
            employeeName: 'خالد إبراهيم',
            note: 'تم استلام المعاملة ورفع الوثائق.',
            createdAt: new Date('2026-08-22T08:30:00Z')
          },
          {
            oldStatus: 'استلام الطلب',
            newStatus: 'قيد المعالجة',
            changedById: supervisorUser.id,
            employeeName: 'محمد حسن',
            note: 'قيد المتابعة لدى الجوازات.',
            createdAt: new Date('2026-08-24T10:00:00Z')
          }
        ]
      }
    }
  });

  const req3 = await prisma.request.create({
    data: {
      requestNumber: 'REQ-1088',
      customerId: createdCustomers[2].id,
      ministryId: createdMinistries['MOE'],
      cityId: createdCities['الدمام'],
      requestTypeId: createdRequestTypes['طلب شهادة رسمية'],
      assignedEmployeeId: adminUser.id,
      title: 'معادلة شهادة ماجستير صادرة من جامعة دولية',
      details: 'طلب معادلة الدرجة العلمية في هندسة البرمجيات مصدقة من سفارة المملكة والمكتب الثقافي.',
      requestType: 'طلب شهادة رسمية',
      status: 'الإجابة جاهزة',
      priority: PriorityLevel.IMPORTANT,
      receiveDate: new Date('2026-08-15'),
      expectedCompletionDate: new Date('2026-08-23'),
      completedDate: new Date('2026-08-22'),
      deadlineStatus: 'ضمن المدة',
      daysRemainingOrOverdue: 0,
      internalNotes: 'صدر قرار المعادلة الإيجابي وتم حفظ نسخة في الأرشيف المركزي.',
      statusHistory: {
        create: [
          {
            oldStatus: null,
            newStatus: 'استلام الطلب',
            changedById: receptionistUser.id,
            employeeName: 'خالد إبراهيم',
            note: 'استلام أصول الشهادات والسجل الأكاديمي.',
            createdAt: new Date('2026-08-15T09:00:00Z')
          },
          {
            oldStatus: 'استلام الطلب',
            newStatus: 'الإجابة جاهزة',
            changedById: adminUser.id,
            employeeName: 'أحمد علي',
            note: 'تم اعتماد قرار المعادلة وإصدار الشهادة الرسمية.',
            documentName: 'وثيقة_المعادلة_النهائية.pdf',
            documentPath: 'uploads/demo_final_response.pdf',
            isPublicDoc: true,
            createdAt: new Date('2026-08-22T14:00:00Z')
          }
        ]
      },
      attachments: {
        create: [
          {
            name: 'وثيقة_المعادلة_النهائية.pdf',
            filePath: 'uploads/demo_final_response.pdf',
            fileSize: '3.2 MB',
            fileType: 'PDF',
            mimeType: 'application/pdf',
            documentType: DocumentType.FINAL_RESPONSE,
            isPublic: true,
            isIdentity: false,
            uploadedBy: 'أحمد علي',
            uploadedAt: new Date('2026-08-22T14:00:00Z')
          }
        ]
      },
      finalResponse: {
        create: {
          decision: 'موافقة',
          summary: 'تمت معادلة درجة الماجستير بنجاح بمثيلاتها في الجامعات السعودية مع منح الدرجة الأكاديمية المستحقة.',
          documentNumber: 'MOE-EQ-2026-4491',
          issuedAt: new Date('2026-08-22T14:00:00Z'),
          issuedBy: 'أحمد علي',
          attachmentName: 'وثيقة_المعادلة_النهائية.pdf',
          attachmentPath: 'uploads/demo_final_response.pdf',
          deliveredToCustomer: false
        }
      }
    }
  });

  console.log('✅ Seeded 3 detailed requests with status histories and public/private documents.');

  // 11. Seed WhatsApp Templates
  const waTemplates = [
    {
      key: 'receive_request',
      title: 'استلام الطلب',
      content: 'عزيزي المراجع {{customer_name}}، تم استلام طلبك رقم {{request_number}} بنجاح لدى {{ministry}}. الموعد المتوقع للإنجاز: {{expected_date}}. يمكنك متابعة الطلب عبر الرابط: {{tracking_link}}',
      variables: ['customer_name', 'request_number', 'ministry', 'expected_date', 'tracking_link']
    },
    {
      key: 'status_changed',
      title: 'تغيير الحالة',
      content: 'مرحباً {{customer_name}}، نود إحاطتك بأن حالة طلبك رقم {{request_number}} أصبحت الآن: ({{status}}) لدى {{ministry}}. الرابط: {{tracking_link}}',
      variables: ['customer_name', 'request_number', 'status', 'ministry', 'tracking_link']
    },
    {
      key: 'docs_required',
      title: 'طلب مستندات',
      content: 'عزيزي المراجع {{customer_name}}، يلزم استكمال بعض المستندات للطلب {{request_number}} لدى {{ministry}}. يرجى مراجعة المنصة أو زيارة الفرع في أقرب وقت. الرابط: {{tracking_link}}',
      variables: ['customer_name', 'request_number', 'ministry', 'tracking_link']
    },
    {
      key: 'approved',
      title: 'الموافقة',
      content: 'بشرى سارة {{customer_name}}، تمت الموافقة على طلبك رقم {{request_number}} من قبل {{ministry}}. جاري إعداد الوثائق النهائية. الرابط: {{tracking_link}}',
      variables: ['customer_name', 'request_number', 'ministry', 'tracking_link']
    },
    {
      key: 'ready_for_pickup',
      title: 'الإجابة جاهزة',
      content: 'عزيزي المراجع {{customer_name}}، الإجابة والوثائق الرسمية للطلب رقم {{request_number}} جاهزة للاستلام. يمكنك مراجعتنا أو تحميلها مباشرة عبر: {{tracking_link}}',
      variables: ['customer_name', 'request_number', 'tracking_link']
    }
  ];

  for (const t of waTemplates) {
    await prisma.whatsAppTemplate.create({ data: t });
  }
  console.log(`✅ Seeded ${waTemplates.length} WhatsApp templates.`);

  // 12. Seed System Settings
  await prisma.systemSetting.create({
    data: {
      key: 'general',
      value: {
        systemName: 'CivicFlow',
        systemSubName: 'منظومة إدارة وتتبع معاملات المراجعين الحكومية',
        officePhone: '+966 11 800 2000',
        officeAddress: 'المملكة العربية السعودية - الرياض - طريق الملك فهد',
        officeEmail: 'support@civicflow.gov.sa',
        taxNumber: '300998877660003',
        workingDays: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
        workingHours: '08:00 ص - 04:00 م'
      }
    }
  });

  await prisma.systemSetting.create({
    data: {
      key: 'notificationPreferences',
      value: {
        enableInApp: true,
        enableOverdueAlerts: true,
        enableStatusAlerts: true,
        enableWhatsApp: true,
        autoNotifyCustomerOnStatusChange: true
      }
    }
  });

  await prisma.systemSetting.create({
    data: {
      key: 'whatsapp',
      value: {
        isConnected: true,
        phoneNumber: '+966 50 123 9988',
        instanceName: 'CivicFlow-Gov-Gateway-01',
        lastSync: '2026-09-03 20:00',
        triggers: [
          { id: 'trg-1', event: 'on_created', title: 'عند استلام الطلب', enabled: true, templateId: 'tpl-1' },
          { id: 'trg-2', event: 'on_status_change', title: 'عند تغيير الحالة', enabled: true, templateId: 'tpl-2' },
          { id: 'trg-3', event: 'on_docs_needed', title: 'عند طلب مستندات إضافية', enabled: true, templateId: 'tpl-3' },
          { id: 'trg-4', event: 'on_approved', title: 'عند الموافقة', enabled: true, templateId: 'tpl-4' },
          { id: 'trg-5', event: 'on_ready', title: 'عند جاهزية الإجابة', enabled: true, templateId: 'tpl-6' }
        ]
      }
    }
  });

  // 13. Seed Notifications & Audit Logs
  await prisma.notification.create({
    data: {
      userId: adminUser.id,
      title: 'استلام طلب جديد',
      message: 'تم تسجيل الطلب #REQ-1025 بنجاح لدى وزارة الصحة',
      requestId: req1.id,
      requestNumber: 'REQ-1025',
      type: 'system',
      read: false,
      link: `/requests/${req1.id}`
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      userName: 'أحمد علي',
      userRole: 'مدير النظام',
      action: 'إضافة طلب',
      requestNumber: 'REQ-1025',
      entity: 'Request',
      entityId: req1.id,
      details: 'إنشاء طلب جديد رقم REQ-1025 للمراجع محمد أحمد علي',
      beforeValue: Prisma.DbNull,
      afterValue: { status: 'استلام الطلب', priority: 'URGENT', ministry: 'MOH' },
      ipAddress: '127.0.0.1'
    }
  });

  console.log('🎉 Database seeding successfully completed with all upgrades!');
}

// Execute if executed directly as a script
if (process.argv[1] && (process.argv[1].endsWith('seed.js') || process.argv[1].endsWith('seed.ts'))) {
  seedDatabase()
    .catch((e) => {
      console.error('❌ Seeding failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
