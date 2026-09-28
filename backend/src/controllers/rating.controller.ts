import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../utils/apiResponse.js';

// -------------------------------------------------------------
// PUBLIC: Get approved public citizen reviews
// -------------------------------------------------------------
export const getPublicRatings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ratings = await prisma.citizenRating.findMany({
      where: {
        isApproved: true,
        isPublic: true,
        isDeleted: false
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        customerName: true,
        rating: true,
        comment: true,
        createdAt: true,
        requestNumber: true
      }
    });

    // Calculate aggregate score
    const allApproved = await prisma.citizenRating.findMany({
      where: { isApproved: true, isDeleted: false },
      select: { rating: true }
    });

    const count = allApproved.length;
    const average = count > 0 ? (allApproved.reduce((acc, curr) => acc + curr.rating, 0) / count).toFixed(1) : '5.0';

    return sendSuccess(res, {
      averageScore: Number(average),
      totalRatings: count,
      ratings
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// PUBLIC: Submit a citizen rating & review
// -------------------------------------------------------------
export const submitCitizenRating = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requestNumber, rating, comment, customerName, customerPhone } = req.body;

    const parsedRating = Number(rating);
    if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
      throw new AppError('يرجى تحديد التقييم بين 1 إلى 5 نجوم', 400, 'INVALID_RATING');
    }

    let resolvedRequestId: string | null = null;
    let resolvedCustomerName = customerName || 'مراجع كريم';
    let resolvedCustomerPhone = customerPhone || null;

    if (requestNumber) {
      const cleanNum = String(requestNumber).replace(/^#/, '').trim();
      const reqRecord = await prisma.request.findFirst({
        where: {
          OR: [
            { requestNumber: cleanNum },
            { requestNumber: `REQ-${cleanNum}` },
            { publicTrackingToken: cleanNum }
          ]
        },
        include: { customer: true }
      });

      if (reqRecord) {
        resolvedRequestId = reqRecord.id;
        if (!customerName && reqRecord.customer?.name) {
          resolvedCustomerName = reqRecord.customer.name;
        }
        if (!customerPhone && reqRecord.customer?.phone) {
          resolvedCustomerPhone = reqRecord.customer.phone;
        }
      }
    }

    const newRating = await prisma.citizenRating.create({
      data: {
        requestId: resolvedRequestId,
        requestNumber: requestNumber ? String(requestNumber).trim() : null,
        customerName: resolvedCustomerName,
        customerPhone: resolvedCustomerPhone,
        rating: parsedRating,
        comment: comment ? String(comment).trim() : null,
        isApproved: true, // Approved by default unless abusive
        isPublic: true,
        isDeleted: false
      }
    });

    return sendSuccess(res, newRating, 'شكراً لتقييمك! رأيك يسهم في تطوير خدماتنا', 201);
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// ADMIN: List all ratings with moderation controls
// -------------------------------------------------------------
export const getAdminRatings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, rating, status } = req.query;

    const where: any = {};
    if (rating && rating !== 'ALL') where.rating = Number(rating);
    if (status === 'APPROVED') where.isApproved = true;
    if (status === 'HIDDEN') where.isPublic = false;
    if (status === 'DELETED') where.isDeleted = true;
    else where.isDeleted = false; // By default don't show deleted

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { customerName: { contains: q, mode: 'insensitive' } },
        { comment: { contains: q, mode: 'insensitive' } },
        { requestNumber: { contains: q, mode: 'insensitive' } }
      ];
    }

    const ratings = await prisma.citizenRating.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, ratings);
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// ADMIN: Moderate rating (toggle approval, visibility, delete abusive)
// -------------------------------------------------------------
export const moderateRating = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isApproved, isPublic, isDeleted, adminNote } = req.body;

    const existing = await prisma.citizenRating.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('التقييم غير موجود', 404, 'RATING_NOT_FOUND');
    }

    const updated = await prisma.citizenRating.update({
      where: { id },
      data: {
        ...(isApproved !== undefined ? { isApproved } : {}),
        ...(isPublic !== undefined ? { isPublic } : {}),
        ...(isDeleted !== undefined ? { isDeleted } : {}),
        ...(adminNote !== undefined ? { adminNote } : {})
      }
    });

    return sendSuccess(res, updated, 'تم تحديث حالة التقييم بنجاح');
  } catch (error) {
    next(error);
  }
};
