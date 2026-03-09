const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** True for network/connection failures (ECONNRESET, ECONNREFUSED, etc.), not for HTTP 4xx/5xx. */
function isConnectionError(err) {
  if (!err || typeof err !== 'object') return false;
  return err.name === 'TypeError' || (err.message && /fetch|network|connection|reset|refused/i.test(err.message));
}

export async function request(path, options = {}, extra = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const headers = { ...options.headers };
  const isGet = (options.method || 'GET').toUpperCase() === 'GET';
  const fetchOpts = {
    ...options,
    headers,
    credentials: 'include',
    ...(isGet && { cache: 'no-store' }),
  };
  const retryOnNetworkError = extra.retryOnNetworkError === true;

  let lastError;
  for (let attempt = 0; attempt <= (retryOnNetworkError ? 1 : 0); attempt++) {
    try {
      const res = await fetch(url, fetchOpts);
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        localStorage.removeItem('user');
        // Only treat as "session expired" when we had a session that became invalid — not on
        // initial /auth/me (no cookie) or on the login request itself. /auth/me 401 with no
        // cookie = unauthenticated visit; 401 on other routes = expired session.
        const isAuthMeOrLogin = url.includes('/auth/me') || url.includes('/auth/login');
        if (typeof window !== 'undefined' && !isAuthMeOrLogin) {
          try { sessionStorage.setItem('sessionExpired', '1'); } catch { /* ignore */ }
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
        throw new Error(data?.error || 'Unauthorized');
      }
      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Request failed: ${res.status}`);
      }
      return data;
    } catch (err) {
      lastError = err;
      if (retryOnNetworkError && attempt === 0 && isConnectionError(err)) {
        await sleep(800);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

/** Ambil array dari response API standar { success, data: [] }. Konsisten di seluruh app. */
export function getListData(res) {
  if (res && typeof res === 'object' && Array.isArray(res.data)) return res.data;
  return [];
}

export const api = {
  auth: {
    login: (email, password, options = {}) =>
      request(
        'auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            rememberMe: options.rememberMe ?? false,
            rememberDuration: options.rememberDuration ?? undefined,
          }),
        },
        { retryOnNetworkError: true }
      ),
    logout: () => request('auth/logout', { method: 'POST' }),
    me: () => request('auth/me', {}, { retryOnNetworkError: true }),
    forgotPassword: (email) =>
      request('auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token, newPassword) =>
      request('auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      }),
    checkEmail: (email) =>
      request('auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }),
    requestPasswordChange: (body) =>
      request('auth/request-password-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
  },
  branches: {
    list: () => request('branches'),
    listPublic: () => request('branches/public'),
    get: (id) => request(`branches/${id}`),
    create: (body) =>
      request('branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    update: (id, body) =>
      request(`branches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    delete: (id) => request(`branches/${id}`, { method: 'DELETE' }),
  },
  users: {
    list: (params) => {
      const q = new URLSearchParams(params).toString();
      return request(`users${q ? `?${q}` : ''}`);
    },
    getAccountRequests: (status) =>
      request(`users/account-requests${status ? `?status=${encodeURIComponent(status)}` : ''}`),
    createAccountRequest: (body) =>
      request('users/account-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    approveAccountRequest: (id, body = {}) =>
      request(`users/account-requests/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    rejectAccountRequest: (id) =>
      request(`users/account-requests/${id}/reject`, { method: 'PATCH' }),
    getPasswordApprovals: (status) =>
      request(`users/password-approvals${status ? `?status=${encodeURIComponent(status)}` : ''}`),
    getPasswordApprovalDetail: (id) => request(`users/password-approvals/${id}`),
    approvePasswordRequest: (id) =>
      request(`users/password-approvals/${id}/approve`, { method: 'PATCH' }),
    rejectPasswordRequest: (id) =>
      request(`users/password-approvals/${id}/reject`, { method: 'PATCH' }),
    updateBranch: (id, body) =>
      request(`users/${id}/branch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    delete: (id) => request(`users/${id}`, { method: 'DELETE' }),
  },
  assets: {
    list: (params) => {
      const q = new URLSearchParams(params).toString();
      return request(`assets${q ? `?${q}` : ''}`);
    },
    get: (id) => request(`assets/${id}`),
    getHistory: (id) => request(`assets/${id}/history`).then((res) => res?.data ?? []),
    getBeritaAcara: (id) => request(`assets/${id}/berita-acara`).then((res) => res?.data ?? []),
    create: (body, photoFile, beritaAcaraFile) => {
      const form = new FormData();
      Object.entries(body).forEach(([k, v]) => {
        if (v != null) form.append(k, v === '' ? '' : String(v));
      });
      if (photoFile) form.append('photo', photoFile);
      if (beritaAcaraFile) form.append('beritaAcara', beritaAcaraFile);
      return request('assets', { method: 'POST', body: form });
    },
    update: (id, body) => {
      const isFormData = body instanceof FormData;
      return request(`assets/${id}`, {
        method: 'PATCH',
        ...(isFormData ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
        ...(isFormData ? { body } : {}),
      });
    },
    delete: (id) => request(`assets/${id}`, { method: 'DELETE' }),
    assign: (id, bodyOrFormData) => {
      if (bodyOrFormData instanceof FormData) {
        return request(`assets/${id}/assign`, { method: 'POST', body: bodyOrFormData });
      }
      return request(`assets/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyOrFormData),
      });
    },
    getRepair: (id) => request(`assets/${id}/repair`).then((res) => res?.data ?? null),
    startRepair: (id, body, beritaAcaraFile) => {
      const form = new FormData();
      if (body) {
        Object.entries(body).forEach(([k, v]) => {
          if (v != null && v !== '') form.append(k, String(v));
        });
      }
      if (beritaAcaraFile) form.append('beritaAcara', beritaAcaraFile);
      return request(`assets/${id}/start-repair`, { method: 'POST', body: form });
    },
    completeRepair: (id, bodyOrFormData) => {
      if (bodyOrFormData instanceof FormData) {
        return request(`assets/${id}/complete-repair`, { method: 'POST', body: bodyOrFormData });
      }
      return request(`assets/${id}/complete-repair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyOrFormData),
      });
    },
  },
  transferRequests: {
    list: (status) =>
      request(`transfer-requests${status ? `?status=${encodeURIComponent(status)}` : ''}`),
    create: (body) =>
      request('transfer-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    direct: (body, beritaAcaraFile) => {
      if (beritaAcaraFile) {
        const form = new FormData();
        form.append('assetId', body.assetId);
        form.append('toBranchId', body.toBranchId);
        form.append('beritaAcara', beritaAcaraFile);
        return request('transfer-requests/direct', { method: 'POST', body: form });
      }
      return request('transfer-requests/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    },
    approve: (id, beritaAcaraFile) => {
      if (beritaAcaraFile) {
        const form = new FormData();
        form.append('beritaAcara', beritaAcaraFile);
        return request(`transfer-requests/${id}/approve`, { method: 'PATCH', body: form });
      }
      return request(`transfer-requests/${id}/approve`, { method: 'PATCH' });
    },
    reject: (id) => request(`transfer-requests/${id}/reject`, { method: 'PATCH' }),
  },
  reassignmentRequests: {
    list: (status) =>
      request(`reassignment-requests${status ? `?status=${encodeURIComponent(status)}` : ''}`),
    create: (bodyOrFormData) => {
      if (bodyOrFormData instanceof FormData) {
        return request('reassignment-requests', { method: 'POST', body: bodyOrFormData });
      }
      return request('reassignment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyOrFormData),
      });
    },
    approve: (id, beritaAcaraFile) => {
      if (beritaAcaraFile) {
        const form = new FormData();
        form.append('beritaAcara', beritaAcaraFile);
        return request(`reassignment-requests/${id}/approve`, { method: 'PATCH', body: form });
      }
      return request(`reassignment-requests/${id}/approve`, { method: 'PATCH' });
    },
    reject: (id) => request(`reassignment-requests/${id}/reject`, { method: 'PATCH' }),
  },
  settings: {
    get: () => request('settings'),
    updateReminder: (body) =>
      request('settings/reminder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
  },
  progressTrack: {
    list: (params) => {
      const q = new URLSearchParams(params).toString();
      return request(`progress-track${q ? `?${q}` : ''}`);
    },
  },
  assetRequests: {
    list: (status) =>
      request(`asset-requests${status ? `?status=${encodeURIComponent(status)}` : ''}`),
    create: (body, photoFile) => {
      const form = new FormData();
      Object.entries(body).forEach(([k, v]) => {
        if (v != null && v !== '') form.append(k, String(v));
      });
      if (photoFile) form.append('photo', photoFile);
      return request('asset-requests', { method: 'POST', body: form });
    },
    approve: (id, body = {}, photoFile, beritaAcaraFile) => {
      const form = new FormData();
      Object.entries(body || {}).forEach(([k, v]) => {
        if (v != null && v !== '') form.append(k, String(v));
      });
      if (photoFile) form.append('photo', photoFile);
      if (beritaAcaraFile) form.append('beritaAcara', beritaAcaraFile);
      return request(`asset-requests/${id}/approve`, { method: 'PATCH', body: form });
    },
    reject: (id) => request(`asset-requests/${id}/reject`, { method: 'PATCH' }),
  },
};
