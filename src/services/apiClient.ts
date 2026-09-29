const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const rawApiUrl =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (import.meta as any).env?.VITE_API_URL ||
  (isLocalhost ? 'http://localhost:5000/api' : 'https://civicflow-backend-1u3o.onrender.com/api');

export const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');


let accessToken: string | null = isBrowser ? localStorage.getItem('civicflow_access_token') : null;
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (isBrowser) {
    if (token) {
      localStorage.setItem('civicflow_access_token', token);
    } else {
      localStorage.removeItem('civicflow_access_token');
    }
  }
};

export const getAccessToken = () => accessToken;

export class ApiError extends Error {
  public statusCode: number;
  public code?: string;
  public details?: any;

  constructor(message: string, statusCode: number, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
  skipAuth?: boolean;
}

export const request = async <T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { params, skipAuth = false, headers = {}, ...customConfig } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const reqHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string>)
  };

  // If not FormData, set Content-Type
  if (!(customConfig.body instanceof FormData) && !reqHeaders['Content-Type']) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  if (!skipAuth && accessToken) {
    reqHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  const config: RequestInit = {
    ...customConfig,
    headers: reqHeaders,
    credentials: 'include' // include HTTP-only refresh cookies
  };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (err: any) {
    throw new ApiError('تعذر الاتصال بالخادم، يرجى التحقق من اتصال الشبكة', 0, 'NETWORK_ERROR');
  }

  // Handle 401 Unauthorized - Attempt Refresh
  if (response.status === 401 && !skipAuth && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        reqHeaders['Authorization'] = `Bearer ${token}`;
        return fetch(url, { ...config, headers: reqHeaders }).then((r) => handleResponse<T>(r));
      });
    }

    isRefreshing = true;

    try {
      const storedRefreshToken = isBrowser ? localStorage.getItem('civicflow_refresh_token') : null;
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken || undefined }),
        credentials: 'include'
      });

      if (!refreshRes.ok) {
        if (refreshRes.status === 401 || refreshRes.status === 403) {
          setAccessToken(null);
          if (isBrowser) {
            localStorage.removeItem('civicflow_access_token');
            localStorage.removeItem('civicflow_refresh_token');
            localStorage.removeItem('civicflow_user');
          }
          window.dispatchEvent(new CustomEvent('civicflow_auth_expired'));
        }
        throw new Error('Refresh failed');
      }

      const refreshData = await refreshRes.json();
      const newAccessToken = refreshData.data?.accessToken;
      const newRefreshToken = refreshData.data?.refreshToken;

      if (!newAccessToken) {
        throw new Error('No access token returned from refresh');
      }

      setAccessToken(newAccessToken);
      if (isBrowser && newRefreshToken) {
        localStorage.setItem('civicflow_refresh_token', newRefreshToken);
      }
      processQueue(null, newAccessToken);

      reqHeaders['Authorization'] = `Bearer ${newAccessToken}`;
      return handleResponse<T>(await fetch(url, { ...config, headers: reqHeaders }));
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      throw new ApiError('انتهت صلاحية الجلسة أو تعذر الاتصال بالخادم', 401, 'SESSION_EXPIRED');
    } finally {
      isRefreshing = false;
    }
  }

  return handleResponse<T>(response);
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 503 || (typeof data === 'object' && data?.maintenance)) {
      if (isBrowser) {
        window.dispatchEvent(new CustomEvent('civicflow_maintenance_mode'));
      }
    }

    const errorMsg =
      (typeof data === 'object' && data !== null ? (data.message || data.error?.message) : null) ||
      (typeof data === 'string' && data ? data : 'حدث خطأ في الخادم');
    const errorCode = data?.error?.code || (response.status === 503 ? 'MAINTENANCE_MODE' : `HTTP_${response.status}`);
    const errorDetails = data?.error?.details;
    throw new ApiError(errorMsg, response.status, errorCode, errorDetails);
  }

  return (data?.data !== undefined ? data.data : data) as T;
};

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
  download: async (endpoint: string, defaultFilename = 'download', params?: Record<string, any>) => {
    let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      const qs = searchParams.toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    }

    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const res = await fetch(url, { headers, credentials: 'include' });
    if (!res.ok) {
      throw new ApiError('فشل تنزيل الملف', res.status);
    }

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = defaultFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }
};