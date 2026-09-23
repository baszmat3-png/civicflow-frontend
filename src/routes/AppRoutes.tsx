import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { PERMISSIONS } from '../utils/permissions';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { ProfilePage } from '../pages/auth/ProfilePage';
import { OtpVerifyPage } from '../pages/auth/OtpVerifyPage';

// Dashboard Page
import { DashboardPage } from '../pages/dashboard/DashboardPage';

// Requests Pages
import { RequestsListPage } from '../pages/requests/RequestsListPage';
import { CreateRequestPage } from '../pages/requests/CreateRequestPage';
import { EditRequestPage } from '../pages/requests/EditRequestPage';
import { RequestDetailsPage } from '../pages/requests/RequestDetailsPage';

// Customers Pages
import { CustomersListPage } from '../pages/customers/CustomersListPage';
import { CreateCustomerPage } from '../pages/customers/CreateCustomerPage';
import { EditCustomerPage } from '../pages/customers/EditCustomerPage';
import { CustomerDetailsPage } from '../pages/customers/CustomerDetailsPage';

// Ministries Pages
import { MinistriesListPage } from '../pages/ministries/MinistriesListPage';
import { CreateMinistryPage } from '../pages/ministries/CreateMinistryPage';
import { EditMinistryPage } from '../pages/ministries/EditMinistryPage';
import { MinistryDetailsPage } from '../pages/ministries/MinistryDetailsPage';

// Employees Pages
import { EmployeesListPage } from '../pages/employees/EmployeesListPage';
import { CreateEmployeePage } from '../pages/employees/CreateEmployeePage';
import { EditEmployeePage } from '../pages/employees/EditEmployeePage';
import { EmployeeDetailsPage } from '../pages/employees/EmployeeDetailsPage';

// Roles Pages
import { RolesListPage } from '../pages/roles/RolesListPage';
import { RolePermissionsPage } from '../pages/roles/RolePermissionsPage';

// Notifications Pages
import { NotificationsListPage } from '../pages/notifications/NotificationsListPage';
import { NotificationDetailsPage } from '../pages/notifications/NotificationDetailsPage';

// Reports & Audit Pages
import { ReportsDashboardPage } from '../pages/reports/ReportsDashboardPage';
import { ReportResultsPage } from '../pages/reports/ReportResultsPage';
import { AuditLogsPage } from '../pages/audit/AuditLogsPage';

// Settings Pages
import { SettingsOverviewPage } from '../pages/settings/SettingsOverviewPage';
import { GeneralSettingsPage } from '../pages/settings/GeneralSettingsPage';
import { CitiesSettingsPage } from '../pages/settings/CitiesSettingsPage';
import { RequestTypesSettingsPage } from '../pages/settings/RequestTypesSettingsPage';
import { StatusesSettingsPage } from '../pages/settings/StatusesSettingsPage';
import { SlaSettingsPage } from '../pages/settings/SlaSettingsPage';
import { NotificationSettingsPage } from '../pages/settings/NotificationSettingsPage';
import { WhatsAppSettingsPage } from '../pages/settings/WhatsAppSettingsPage';
import { WhatsAppTemplatesPage } from '../pages/settings/WhatsAppTemplatesPage';
import { BackupSettingsPage } from '../pages/settings/BackupSettingsPage';

// Public Pages
import { PublicTrackPage } from '../pages/public/PublicTrackPage';
import { PublicTrackResultPage } from '../pages/public/PublicTrackResultPage';
import { PublicSubmitRequestPage } from '../pages/public/PublicSubmitRequestPage';
import { NotFoundPage } from '../pages/public/NotFoundPage';
import { MaintenancePage } from '../pages/public/MaintenancePage';
import { useMaintenance } from '../context/MaintenanceContext';

export const AppRoutes: React.FC = () => {
  const { isMaintenanceMode } = useMaintenance();

  // If maintenance mode is active, block all routes and render dedicated Maintenance Screen
  if (isMaintenanceMode) {
    return (
      <Routes>
        <Route path="*" element={<MaintenancePage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Public Routes (No Auth Layout) */}
      <Route element={<PublicLayout />}>
        <Route path="/track" element={<PublicTrackPage />} />
        <Route path="/track/:requestNumber" element={<PublicTrackResultPage />} />
        <Route path="/submit-request" element={<PublicSubmitRequestPage />} />
        <Route path="/public/submit-request" element={<PublicSubmitRequestPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Auth Layout Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-otp" element={<OtpVerifyPage />} />
      </Route>

      {/* Authenticated Admin Management Layout */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* Requests */}
        <Route
          path="/requests"
          element={
            <ProtectedRoute permission={PERMISSIONS.REQUESTS_VIEW}>
              <RequestsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/requests/new"
          element={
            <ProtectedRoute permission={PERMISSIONS.REQUESTS_CREATE}>
              <CreateRequestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/requests/:id"
          element={
            <ProtectedRoute permission={PERMISSIONS.REQUESTS_VIEW}>
              <RequestDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/requests/:id/edit"
          element={
            <ProtectedRoute permission={PERMISSIONS.REQUESTS_UPDATE}>
              <EditRequestPage />
            </ProtectedRoute>
          }
        />

        {/* Customers */}
        <Route
          path="/customers"
          element={
            <ProtectedRoute permission={PERMISSIONS.CUSTOMERS_VIEW}>
              <CustomersListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/new"
          element={
            <ProtectedRoute permission={PERMISSIONS.CUSTOMERS_CREATE}>
              <CreateCustomerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:id"
          element={
            <ProtectedRoute permission={PERMISSIONS.CUSTOMERS_VIEW}>
              <CustomerDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:id/edit"
          element={
            <ProtectedRoute permission={PERMISSIONS.CUSTOMERS_UPDATE}>
              <EditCustomerPage />
            </ProtectedRoute>
          }
        />

        {/* Ministries */}
        <Route
          path="/ministries"
          element={
            <ProtectedRoute permission={PERMISSIONS.MINISTRIES_VIEW}>
              <MinistriesListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ministries/new"
          element={
            <ProtectedRoute permission={PERMISSIONS.MINISTRIES_CREATE}>
              <CreateMinistryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ministries/:id"
          element={
            <ProtectedRoute permission={PERMISSIONS.MINISTRIES_VIEW}>
              <MinistryDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ministries/:id/edit"
          element={
            <ProtectedRoute permission={PERMISSIONS.MINISTRIES_UPDATE}>
              <EditMinistryPage />
            </ProtectedRoute>
          }
        />

        {/* Employees */}
        <Route
          path="/employees"
          element={
            <ProtectedRoute permission={PERMISSIONS.USERS_VIEW}>
              <EmployeesListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/new"
          element={
            <ProtectedRoute permission={PERMISSIONS.USERS_CREATE}>
              <CreateEmployeePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:id"
          element={
            <ProtectedRoute permission={PERMISSIONS.USERS_VIEW}>
              <EmployeeDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:id/edit"
          element={
            <ProtectedRoute permission={PERMISSIONS.USERS_UPDATE}>
              <EditEmployeePage />
            </ProtectedRoute>
          }
        />

        {/* Roles & Permissions (Admin Only) */}
        <Route
          path="/roles"
          element={
            <ProtectedRoute adminOnly>
              <RolesListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roles/:id"
          element={
            <ProtectedRoute adminOnly>
              <RolePermissionsPage />
            </ProtectedRoute>
          }
        />

        {/* Notifications */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute permission={PERMISSIONS.NOTIFICATIONS_VIEW}>
              <NotificationsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications/:id"
          element={
            <ProtectedRoute permission={PERMISSIONS.NOTIFICATIONS_VIEW}>
              <NotificationDetailsPage />
            </ProtectedRoute>
          }
        />

        {/* Reports & Audit */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute permission={PERMISSIONS.REPORTS_VIEW}>
              <ReportsDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/results"
          element={
            <ProtectedRoute permission={PERMISSIONS.REPORTS_VIEW}>
              <ReportResultsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute permission={PERMISSIONS.AUDIT_LOGS_VIEW}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />

        {/* Settings (Admin / Settings Manage Only) */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute permission={PERMISSIONS.SETTINGS_MANAGE}>
              <SettingsOverviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/general"
          element={
            <ProtectedRoute permission={PERMISSIONS.SETTINGS_MANAGE}>
              <GeneralSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/cities"
          element={
            <ProtectedRoute permission={PERMISSIONS.SETTINGS_MANAGE}>
              <CitiesSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/request-types"
          element={
            <ProtectedRoute permission={PERMISSIONS.SETTINGS_MANAGE}>
              <RequestTypesSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/statuses"
          element={
            <ProtectedRoute permission={PERMISSIONS.SETTINGS_MANAGE}>
              <StatusesSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/sla"
          element={
            <ProtectedRoute permission={PERMISSIONS.SETTINGS_MANAGE}>
              <SlaSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/notifications"
          element={
            <ProtectedRoute permission={PERMISSIONS.SETTINGS_MANAGE}>
              <NotificationSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/whatsapp"
          element={
            <ProtectedRoute permission={PERMISSIONS.SETTINGS_MANAGE}>
              <WhatsAppSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/whatsapp/templates"
          element={
            <ProtectedRoute permission={PERMISSIONS.SETTINGS_MANAGE}>
              <WhatsAppTemplatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/backup"
          element={
            <ProtectedRoute permission={PERMISSIONS.SETTINGS_MANAGE}>
              <BackupSettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
