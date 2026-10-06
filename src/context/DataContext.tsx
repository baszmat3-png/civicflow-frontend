import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  deleteEmployee,
  createRole,
  updateRole,
  deleteRole,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  updateSystemSettings
} from '../services/api';
import { customerService } from '../services/customerService';
import { realtimeService } from '../services/realtimeService';
import { pingHealth } from '../services/apiClient';

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
  isSyncing: boolean;
  isServerWaking: boolean;
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
  handleDeleteCustomer: (id: string, force?: boolean) => Promise<void>;
  handleBulkDeleteCustomers: (ids: string[], force?: boolean) => Promise<{ deletedCount: number; blockedCount: number; total: number }>;
  handleCreateMinistry: typeof createMinistry;
  handleUpdateMinistry: typeof updateMinistry;
  handleCreateEmployee: typeof createEmployee;
  handleUpdateEmployee: typeof updateEmployee;
  handleDeleteEmployee: typeof deleteEmployee;
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

  // If we already have cached data in localStorage, render immediately without blocking spinner!
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const hasCachedRequests = !!localStorage.getItem('civicflow_cache_requests');
    const hasCachedCustomers = !!localStorage.getItem('civicflow_cache_customers');
    return !hasCachedRequests && !hasCachedCustomers;
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isServerWaking, setIsServerWaking] = useState<boolean>(false);

  const isRefreshingRef = useRef(false);
  const retryTimeoutRef = useRef<any>(null);
  const retryCountRef = useRef(0);

  const refreshData = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsSyncing(true);

    try {
      const [reqs, custs, mins, emps, rols, notifs, logs, setts] = await Promise.all([
        getRequests().catch(() => null),
        getCustomers().catch(() => null),
        getMinistries().catch(() => null),
        getEmployees().catch(() => null),
        getRoles().catch(() => null),
        getNotifications().catch(() => null),
        getAuditLogs().catch(() => null),
        getSystemSettings().catch(() => null)
      ]);

      let hasAnySuccess = false;

      if (reqs !== null) {
        const validReqs = Array.isArray(reqs) ? reqs : (reqs as any)?.requests || [];
        setRequests(validReqs);
        setCached('requests', validReqs);
        hasAnySuccess = true;
      }

      if (custs !== null) {
        const validCusts = Array.isArray(custs) ? custs : (custs as any)?.customers || [];
        setCustomers(validCusts);
        setCached('customers', validCusts);
        hasAnySuccess = true;
      }

      if (mins !== null) {
        const validMins = Array.isArray(mins) ? mins : (mins as any)?.ministries || [];
        setMinistries(validMins);
        setCached('ministries', validMins);
      }

      if (emps !== null) {
        const validEmps = Array.isArray(emps) ? emps : (emps as any)?.users || (emps as any)?.employees || [];
        setEmployees(validEmps);
        setCached('employees', validEmps);
      }

      if (rols !== null) {
        const validRols = Array.isArray(rols) ? rols : (rols as any)?.roles || [];
        setRoles(validRols);
        setCached('roles', validRols);
      }

      if (notifs !== null) {
        const validNotifs = Array.isArray(notifs) ? notifs : (notifs as any)?.notifications || [];
        setNotifications(validNotifs);
        setCached('notifications', validNotifs);
      }

      if (logs !== null) {
        const validLogs = Array.isArray(logs) ? logs : (logs as any)?.auditLogs || [];
        setAuditLogs(validLogs);
        setCached('auditLogs', validLogs);
      }

      if (setts !== null && typeof setts === 'object') {
        setSettings(setts);
        setCached('settings', setts);
      }

      if (hasAnySuccess) {
        setIsServerWaking(false);
        retryCountRef.current = 0;
      } else {
        // If all requests failed, server might be waking up on Render
        setIsServerWaking(true);
        retryCountRef.current += 1;
        const nextDelay = Math.min(2500, 1000 + retryCountRef.current * 500);
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(() => {
          refreshData();
        }, nextDelay);
      }
    } catch (error) {
      console.warn('⚠️ [DataContext] Data fetch notice (retrying):', error);
      setIsServerWaking(true);
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(() => {
        refreshData();
      }, 2500);
    } finally {
      isRefreshingRef.current = false;
      setIsSyncing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 0. Immediate pre-warm ping to spin up Render backend immediately
    pingHealth(4000).catch(() => {});

    // Initial data fetch
    refreshData();

    // 1. Subscribe to Real-Time Server-Sent Events (SSE)
    const unsubConnected = realtimeService.subscribe('connected', () => {
      console.log('⚡ [DataContext] Realtime SSE stream connected, syncing fresh data');
      setIsServerWaking(false);
      refreshData();
    });

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

    const unsubNewCust = realtimeService.subscribe('new_customer', (data) => {
      console.log('⚡ [DataContext] Instant SSE new_customer received:', data);
      refreshData();
    });

    const unsubCustUpdate = realtimeService.subscribe('customer_updated', () => {
      refreshData();
    });

    const unsubCustDelete = realtimeService.subscribe('customer_deleted', () => {
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
    window.addEventListener('focus', handleStorageUpdate);
    window.addEventListener('online', handleStorageUpdate);

    // 3. Smart real-time polling interval (every 8s when active)
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshData();
      }
    }, 8000);

    // 4. Keep-Alive ping every 3 minutes to prevent Render free tier from sleeping
    const keepAliveInterval = setInterval(() => {
      pingHealth(5000).catch(() => {});
    }, 180000);

    return () => {
      clearTimeout(retryTimeoutRef.current);
      clearInterval(pollInterval);
      clearInterval(keepAliveInterval);
      unsubConnected();
      unsubNewReq();
      unsubReqUpdate();
      unsubReqDelete();
      unsubNewCust();
      unsubCustUpdate();
      unsubCustDelete();
      unsubNewApt();
      unsubAptUpdate();
      unsubRating();
      window.removeEventListener('civicflow_data_updated', handleStorageUpdate);
      window.removeEventListener('civicflow_auth_login', handleStorageUpdate);
      window.removeEventListener('focus', handleStorageUpdate);
      window.removeEventListener('online', handleStorageUpdate);
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

  const handleDeleteCustomer = async (id: string, force?: boolean) => {
    await customerService.deleteCustomer(id, force);
    await refreshData();
  };

  const handleBulkDeleteCustomers = async (ids: string[], force?: boolean) => {
    const res = await customerService.bulkDeleteCustomers(ids, force);
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

  const handleDeleteEmployee: typeof deleteEmployee = async (id) => {
    await deleteEmployee(id);
    await refreshData();
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
        isSyncing,
        isServerWaking,
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
        handleDeleteCustomer,
        handleBulkDeleteCustomers,
        handleCreateMinistry,
        handleUpdateMinistry,
        handleCreateEmployee,
        handleUpdateEmployee,
        handleDeleteEmployee,
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
