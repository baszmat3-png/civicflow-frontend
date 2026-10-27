import { Router } from 'express';
import {
  login,
  refreshToken,
  logout,
  getMe,
  updateProfile,
  changePassword,
  requestPasswordResetOTP,
  verifyResetOTP,
  resetPasswordWithOTP,
  sendVerificationOTP,
  verifyEmailOTP,
  sendPhoneVerificationOTP,
  verifyPhoneOTP,
  twoFactorSetup,
  twoFactorEnable,
  twoFactorDisable
} from '../controllers/auth.controller.js';
import { sendOtp, verifyOtp, resendOtp } from '../controllers/otp.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authLimiter, refreshLimiter } from '../middlewares/rateLimit.middleware.js';

export const authRouter = Router();

authRouter.post('/login', authLimiter, login);
authRouter.post('/refresh', refreshLimiter, refreshToken);
authRouter.post('/logout', logout);
authRouter.post('/forgot-password-otp', authLimiter, requestPasswordResetOTP);
authRouter.post('/verify-reset-otp', authLimiter, verifyResetOTP);
authRouter.post('/reset-password-otp', authLimiter, resetPasswordWithOTP);
authRouter.post('/send-verification-otp', authLimiter, sendVerificationOTP);
authRouter.post('/verify-email-otp', authLimiter, verifyEmailOTP);
authRouter.post('/send-phone-otp', authLimiter, sendPhoneVerificationOTP);
authRouter.post('/verify-phone-otp', authLimiter, verifyPhoneOTP);

// Secure email-OTP verification flow
authRouter.post('/send-otp', authLimiter, sendOtp);
authRouter.post('/verify-otp', authLimiter, verifyOtp);
authRouter.post('/resend-otp', authLimiter, resendOtp);

// Protected routes
authRouter.get('/me', authenticate, getMe);
authRouter.patch('/profile', authenticate, updateProfile);
authRouter.post('/change-password', authenticate, changePassword);
authRouter.post('/2fa/setup', authenticate, twoFactorSetup);
authRouter.post('/2fa/enable', authenticate, authLimiter, twoFactorEnable);
authRouter.post('/2fa/disable', authenticate, authLimiter, twoFactorDisable);
