import { prisma } from '../config/database.js';

interface DuplicateCheckParams {
  phone?: string;
  nationalId?: string;
  customerId?: string;
  ministryId?: string;
  requestType?: string;
  title?: string;
  daysWindow?: number;
}

export async function checkDuplicateRequest(params: DuplicateCheckParams) {
  const { phone, nationalId, customerId, ministryId, requestType, daysWindow = 30 } = params;

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - daysWindow);

  // Find customer IDs matching phone / nationalId / customerId
  let targetCustomerIds: string[] = [];

  if (customerId) {
    targetCustomerIds.push(customerId);
  }

  if (phone || nationalId) {
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          ...(phone ? [{ phone: { contains: phone.replace(/[^0-9]/g, '') } }] : []),
          ...(phone ? [{ altPhone: { contains: phone.replace(/[^0-9]/g, '') } }] : []),
          ...(nationalId ? [{ nationalId: { equals: nationalId } }] : [])
        ]
      },
      select: { id: true, name: true, phone: true }
    });

    targetCustomerIds.push(...customers.map((c) => c.id));
  }

  targetCustomerIds = Array.from(new Set(targetCustomerIds));

  if (targetCustomerIds.length === 0) {
    return {
      isDuplicate: false,
      duplicates: []
    };
  }

  // Search recent requests by these customers
  const matchingRequests = await prisma.request.findMany({
    where: {
      customerId: { in: targetCustomerIds },
      createdAt: { gte: sinceDate },
      ...(ministryId ? { ministryId } : {}),
      ...(requestType ? { requestType: { equals: requestType, mode: 'insensitive' } } : {})
    },
    include: {
      customer: { select: { name: true, phone: true } },
      ministry: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  const isDuplicate = matchingRequests.length > 0;

  return {
    isDuplicate,
    count: matchingRequests.length,
    message: isDuplicate
      ? `تنبيه: تم العثور على ${matchingRequests.length} معاملة سابقة لنفس المراجع خلال آخر ${daysWindow} يوماً`
      : null,
    duplicates: matchingRequests.map((r) => ({
      id: r.id,
      requestNumber: r.requestNumber,
      title: r.title,
      ministryName: r.ministry.name,
      status: r.status,
      customerName: r.customer.name,
      createdAt: r.createdAt.toISOString().split('T')[0]
    }))
  };
}
