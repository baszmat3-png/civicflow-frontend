import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  RequestItem,
  Customer,
  Ministry,
  Employee,
  Role,
  NotificationItem,
  AuditLog,
  SystemSettings
} from '../types';
import {
  getRequests,
  getCustomers,
  getMinistries,
  getEmployees,
  getRoles,
  getNotifications,
  getAuditLogs,
  getSystemSettings,
  changeRequestStatus,
  createRequest,
  updateRequest,
  deleteRequest,
  createCustomer,
  updateCustomer,
  createMinistry,
  updateMinistry,
  createEmployee,
  updateEmployee,
  createRole,
  updateRole,
  deleteRole,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  updateSystemSettings
} from '../services/api';
import { realtimeService } from '../services/realtimeService';

interface DataContextType {
  requests: RequestItem[];
  customers: Customer[];
  ministries: Ministry[];
  employees: Employee[];
  roles: Role[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  settings: SystemSettings | null;
  loading: boolean;
  refreshData: () => Promise<void>;
  resetData: () => void;
  // Stats
  unreadNotificationsCount: number;
  overdueRequestsCount: number;
  inProgressRequestsCount: number;
  completedRequestsCount: number;
  totalRequestsCount: number;
  todayRequestsCount: number;
  // Actions
  handleCreateRequest: typeof createRequest;
  handleUpdateRequest: typeof updateRequest;
  handleDeleteRequest: typeof deleteRequest;
  handleChangeStatus: typeof changeRequestStatus;
  handleCreateCustomer: typeof createCustomer;
  handleUpdateCustomer: typeof updateCustomer;
  handleCreateMinistry: typeof createMinistry;
  handleUpdateMinistry: typeof updateMinistry;
  handleCreateEmployee: typeof createEmployee;
  handleUpdateEmployee: typeof updateEmployee;
  handleCreateRole: typeof createRole;
  handleUpdateRole: typeof updateRole;
  handleDeleteRole: typeof deleteRole;
  handleMarkNotificationRead: typeof markNotificationAsRead;
  handleMarkAllNotificationsRead: typeof markAllNotificationsAsRead;
  handleUpdateSettings: typeof updateSystemSettings;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const getInitialCached = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(`civicflow_cache_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const setCached = (key: string, data: any) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`civicflow_cache_${key}`, JSON.stringify(data));
  } catch {}
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [requests, setRequests] = useState<RequestItem[]>(() => getInitialCached('requests', []));
  const [customers, setCustomers] = useState<Customer[]>(() => getInitialCached('customers', []));
  const [ministries, setMinistries] = useState<Ministry[]>(() => getInitialCached('ministries', []));
  const [employees, setEmployees] = useState<Employee[]>(() => getInitialCached('employees', []));
  const [roles, setRoles] = useState<Role[]>(() => getInitialCached('roles', []));
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => getInitialCached('notifications', []));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => getInitialCached('auditLogs', []));
  const [settings, setSettings] = useState<SystemSettings | null>(() => getInitialCached('settings', null));
  const [loading, setLoading] = useState<boolean>(() => {
    const hasCached = typeof window !== 'undefined' && !!localStorage.getItem('civicflow_cache_requests');
    return !hasCached;
  });

  const isRefreshingRef = React.useRef(false);

  const refreshData = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    try {
      const [reqs, custs, mins, emps, rols, notifs, logs, setts] = await Promise.all([
        getRequests().catch(() => []),
        getCustomers().catch(() => []),
        getMinistries().catch(() => []),
        getEmployees().catch(() => []),
        getRoles().catch(() => []),
        getNotifications().catch(() => []),
        getAuditLogs().catch(() => []),
        getSystemSettings().catch(() => null)
      ]);

      const validReqs = Array.isArray(reqs) ? reqs : (reqs as any)?.requests || [];
      const validCusts = Array.isArray(custs) ? custs : (custs as any)?.customers || [];
      const validMins = Array.isArray(mins) ? mins : (mins as any)?.ministries || [];
      const validEmps = Array.isArray(emps) ? emps : (emps as any)?.users || (emps as any)?.employees || [];
      const validRols = Array.isArray(rols) ? rols : (rols as any)?.roles || [];
      const validNotifs = Array.isArray(notifs) ? notifs : (notifs as any)?.notifications || [];
      const validLogs = Array.isArray(logs) ? logs : (logs as any)?.auditLogs || [];
      const validSetts = setts && typeof setts === 'object' ? setts : null;

      setRequests(validReqs);
      setCustomers(validCusts);
      setMinistries(validMins);
      setEmployees(validEmps);
      setRoles(validRols);
      setNotifications(validNotifs);
      setAuditLogs(validLogs);
      setSettings(validSetts);

      setCached('requests', validReqs);
      setCached('customers', validCusts);
      setCached('ministries', validMins);
      setCached('employees', validEmps);
      setCached('roles', validRols);
      setCached('notifications', validNotifs);
      setCached('auditLogs', validLogs);
      if (validSetts) setCached('settings', validSetts);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      isRefreshingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();

    // 1. Subscribe to Real-Time Server-Sent Events (SSE)
    const unsubNewReq = realtimeService.subscribe('new_request', (data) => {
      console.log('⚡ [DataContext] Instant SSE new_request received:', data);
      refreshData();
    });

    const unsubReqUpdate = realtimeService.subscribe('request_updated', () => {
      refreshData();
    });

    const unsubReqDelete = realtimeService.subscribe('request_deleted', () => {
      refreshData();
    });

    const unsubNewApt = realtimeService.subscribe('new_appointment', () => {
      refreshData();
    });

    const unsubAptUpdate = realtimeService.subscribe('appointment_updated', () => {
      refreshData();
    });

    const unsubRating = realtimeService.subscribe('new_rating', () => {
      refreshData();
    });

    // 2. Window Custom Events fallback
    const handleStorageUpdate = () => {
      refreshData();
    };

    window.addEventListener('civicflow_data_updated', handleStorageUpdate);
    window.addEventListener('civicflow_auth_login', handleStorageUpdate);

    // 3. Gentle background polling interval (every 20s) as secondary safety net when page is active
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !document.hidden) {
        refreshData();
      }
    }, 20000);

    return () => {
      unsubNewReq();
      unsubReqUpdate();
      unsubReqDelete();
      unsubNewApt();
      unsubAptUpdate();
      unsubRating();
      clearInterval(pollInterval);
      window.removeEventListener('civicflow_data_updated', handleStorageUpdate);
      window.removeEventListener('civicflow_auth_login', handleStorageUpdate);
    };
  }, [refreshData]);

  const resetData = () => {
    refreshData();
  };

  // Derived metrics
  const unreadNotificationsCount = Array.isArray(notifications) ? notifications.filter((n) => n && !n.read).length : 0;
  const overdueRequestsCount = Array.isArray(requests) ? requests.filter((r) => r && r.deadlineStatus === 'متأخر').length : 0;
  const inProgressRequestsCount = Array.isArray(requests)
    ? requests.filter(
        (r) => r && (r.status === 'قيد المعالجة' || r.status === 'قيد المراجعة' || r.status === 'تم إرسال الطلب للجهة')
      ).length
    : 0;
  const completedRequestsCount = Array.isArray(requests)
    ? requests.filter((r) => r && (r.status === 'تم التسليم' || r.status === 'مغلق' || r.status === 'الإجابة جاهزة')).length
    : 0;
  const totalRequestsCount = Array.isArray(requests) ? requests.length : 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRequestsCount = Array.isArray(requests) ? requests.filter((r) => r && r.receiveDate === todayStr).length : 0;

  // Wrapped actions with auto-refresh
  const handleCreateRequest: typeof createRequest = async (data) => {
    const res = await createRequest(data);
    await refreshData();
    return res;
  };

  const handleUpdateRequest: typeof updateRequest = async (id, data) => {
    const res = await updateRequest(id, data);
    await refreshData();
    return res;
  };

  const handleDeleteRequest: typeof deleteRequest = async (id) => {
    const res = await deleteRequest(id);
    await refreshData();
    return res;
  };

  const handleChangeStatus: typeof changeRequestStatus = async (id, status, note, file, rejectionReason) => {
    const res = await changeRequestStatus(id, status, note, file, rejectionReason);
    await refreshData();
    return res;
  };

  const handleCreateCustomer: typeof createCustomer = async (data) => {
    const res = await createCustomer(data);
    await refreshData();
    return res;
  };

  const handleUpdateCustomer: typeof updateCustomer = async (id, data) => {
    const res = await updateCustomer(id, data);
    await refreshData();
    return res;
  };

  const handleCreateMinistry: typeof createMinistry = async (data) => {
    const res = await createMinistry(data);
    await refreshData();
    return res;
  };

  const handleUpdateMinistry: typeof updateMinistry = async (id, data) => {
    const res = await updateMinistry(id, data);
    await refreshData();
    return res;
  };

  const handleCreateEmployee: typeof createEmployee = async (data) => {
    const res = await createEmployee(data);
    await refreshData();
    return res;
  };

  const handleUpdateEmployee: typeof updateEmployee = async (id, data) => {
    const res = await updateEmployee(id, data);
    await refreshData();
    return res;
  };

  const handleCreateRole: typeof createRole = async (data) => {
    const res = await createRole(data);
    await refreshData();
    return res;
  };

  const handleUpdateRole: typeof updateRole = async (id, data) => {
    const res = await updateRole(id, data);
    await refreshData();
    return res;
  };

  const handleDeleteRole: typeof deleteRole = async (id) => {
    await deleteRole(id);
    await refreshData();
  };

  const handleMarkNotificationRead: typeof markNotificationAsRead = async (id) => {
    await markNotificationAsRead(id);
    await refreshData();
  };

  const handleMarkAllNotificationsRead: typeof markAllNotificationsAsRead = async () => {
    await markAllNotificationsAsRead();
    await refreshData();
  };

  const handleUpdateSettings: typeof updateSystemSettings = async (data) => {
    const res = await updateSystemSettings(data);
    await refreshData();
    return res;
  };

  return (
    <DataContext.Provider
      value={{
        requests,
        customers,
        ministries,
        employees,
        roles,
        notifications,
        auditLogs,
        settings,
        loading,
        refreshData,
        resetData,
        unreadNotificationsCount,
        overdueRequestsCount,
        inProgressRequestsCount,
        completedRequestsCount,
        totalRequestsCount,
        todayRequestsCount,
        handleCreateRequest,
        handleUpdateRequest,
        handleDeleteRequest,
        handleChangeStatus,
        handleCreateCustomer,
        handleUpdateCustomer,
        handleCreateMinistry,
        handleUpdateMinistry,
        handleCreateEmployee,
        handleUpdateEmployee,
        handleCreateRole,
        handleUpdateRole,
        handleDeleteRole,
        handleMarkNotificationRead,
        handleMarkAllNotificationsRead,
        handleUpdateSettings
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
