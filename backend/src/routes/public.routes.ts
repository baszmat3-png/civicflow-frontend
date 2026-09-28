import { Router } from 'express';
import {
  trackPublicRequest,
  submitPublicRequest,
  getPublicFormData,
  downloadPublicAttachment,
  requestTrackingOtp,
  verifyTrackingOtp
} from '../controllers/public.controller.js';
import { publicLimiter } from '../middlewares/rateLimit.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';

export const publicRouter = Router();

// Public metadata for submission form
publicRouter.get('/form-data', getPublicFormData);

// Public Request Submission with identity and request document uploads
publicRouter.post(
  '/submit-request',
  publicLimiter,
  upload.any(),
  submitPublicRequest
);
publicRouter.post(
  '/requests',
  publicLimiter,
  upload.any(),
  submitPublicRequest
);

// Public Citizen Tracking
publicRouter.get('/track/:tokenOrNumber', publicLimiter, trackPublicRequest);

// Secure OTP-based Citizen Tracking
publicRouter.post('/track/request-otp', publicLimiter, requestTrackingOtp);
publicRouter.post('/track/verify-otp', publicLimiter, verifyTrackingOtp);

// Download Publicly Permitted Stage Documents ONLY
publicRouter.get('/attachments/:id/download', publicLimiter, downloadPublicAttachment);