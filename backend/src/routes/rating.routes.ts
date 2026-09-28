import { Router } from 'express';
import {
  getPublicRatings,
  submitCitizenRating,
  getAdminRatings,
  moderateRating
} from '../controllers/rating.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';

export const ratingRouter = Router();

// Public routes (Citizen portal)
ratingRouter.get('/public', getPublicRatings);
ratingRouter.post('/public/submit', submitCitizenRating);

// Admin routes (Dashboard & Settings)
ratingRouter.get('/admin', authenticate, requirePermission('settings.manage'), getAdminRatings);
ratingRouter.patch('/admin/:id', authenticate, requirePermission('settings.manage'), moderateRating);
