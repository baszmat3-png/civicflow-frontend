import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  saveDistributionSettings
} from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.get('/', requirePermission('users.view'), getUsers);
userRouter.put('/distribution', requirePermission('users.update'), saveDistributionSettings);
userRouter.get('/:id', requirePermission('users.view'), getUserById);
userRouter.post('/', requirePermission('users.create'), createUser);
userRouter.patch('/:id', requirePermission('users.update'), updateUser);
userRouter.delete('/:id', requirePermission('users.delete'), deleteUser);