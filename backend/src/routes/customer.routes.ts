import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  bulkDeleteCustomers,
  bulkImportCustomers
} from '../controllers/customer.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';

export const customerRouter = Router();

customerRouter.use(authenticate);

customerRouter.get('/', requirePermission('customers.view'), getCustomers);
customerRouter.post('/bulk-import', requirePermission('customers.create'), bulkImportCustomers);
customerRouter.post('/bulk-delete', requirePermission('customers.delete'), bulkDeleteCustomers);
customerRouter.get('/:id', requirePermission('customers.view'), getCustomerById);
customerRouter.post('/', requirePermission('customers.create'), createCustomer);
customerRouter.patch('/:id', requirePermission('customers.update'), updateCustomer);
customerRouter.delete('/:id', requirePermission('customers.delete'), deleteCustomer);