import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { customerRouter } from './customer.routes.js';
import { ministryRouter } from './ministry.routes.js';
import { requestRouter } from './request.routes.js';
import { userRouter } from './user.routes.js';
import { roleRouter } from './role.routes.js';
import { notificationRouter } from './notification.routes.js';
import { reportRouter } from './report.routes.js';
import { auditRouter } from './audit.routes.js';
import { settingRouter } from './setting.routes.js';
import { whatsAppRouter } from './whatsapp.routes.js';
import { publicRouter } from './public.routes.js';
import { cityRouter } from './city.routes.js';
import { requestTypeRouter } from './requestType.routes.js';
import { backupRouter } from './backup.routes.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const apiRouter = Router();

// Public routes
apiRouter.use('/public', publicRouter);

// Core Modules
apiRouter.use('/auth', authRouter);
apiRouter.use('/customers', customerRouter);
apiRouter.use('/ministries', ministryRouter);
apiRouter.use('/cities', cityRouter);
apiRouter.use('/request-types', requestTypeRouter);
apiRouter.use('/requests', requestRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/roles', roleRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/reports', reportRouter);
apiRouter.use('/audit-logs', auditRouter);
apiRouter.use('/settings', settingRouter);
apiRouter.use('/whatsapp', whatsAppRouter);
apiRouter.use('/backup', backupRouter);

// Test RBAC routes for verification
apiRouter.get('/test/public', (req, res) => {
  return sendSuccess(res, { access: 'public' }, 'Public access granted');
});

apiRouter.get('/test/protected', authenticate, (req, res) => {
  return sendSuccess(res, { user: req.user }, 'Authenticated access granted');
});

apiRouter.get(
  '/test/permission-requests-create',
  authenticate,
  requirePermission('requests.create'),
  (req, res) => {
    return sendSuccess(
      res,
      { permission: 'requests.create', user: req.user },
      'Permission requests.create verified'
    );
  }
);

apiRouter.get(
  '/test/permission-settings-manage',
  authenticate,
  requirePermission('settings.manage'),
  (req, res) => {
    return sendSuccess(
      res,
      { permission: 'settings.manage', user: req.user },
      'Permission settings.manage verified'
    );
  }
);