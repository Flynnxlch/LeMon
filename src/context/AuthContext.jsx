import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { invalidateData } from '../utils/dataInvalidation';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const res = await api.auth.me();
      const userData = res?.data?.user;
      if (userData) {
        const normalized = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          branch_id: userData.branch_id,
          branch_name: userData.branch_name ?? null,
          avatar: null,
        };
        setUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
    } catch {
      setUser(null);
      localStorage.removeItem('user');
      // Do not set sessionExpired here: this is the initial load. No cookie = user never
      // logged in; only the periodic check (when user was set) or 401 on protected routes
      // should show "session expired".
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const onLogout = () => {
      setUser(null);
    };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  // Periodic session check: when token is expired, /auth/me returns 401 and client.js
  // dispatches auth:logout, which clears user and sends user back to login.
  useEffect(() => {
    if (!user) return;
    const SESSION_CHECK_INTERVAL_MS = 60 * 1000; // 1 minute
    const intervalId = setInterval(async () => {
      try {
        await api.auth.me();
      } catch {
        // 401 or network error: client.js already clears storage and dispatches auth:logout
        // If for any reason the event didn't run, ensure we clear user so redirect happens
        setUser(null);
        localStorage.removeItem('user');
        try { sessionStorage.setItem('sessionExpired', '1'); } catch { /* ignore */ }
      }
    }, SESSION_CHECK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [user]);

  const login = useCallback(async (email, password, options = {}) => {
    const res = await api.auth.login(email, password, {
      rememberMe: options.rememberMe,
      rememberDuration: options.rememberDuration,
    });
    const userData = res.data?.user;
    if (!userData) {
      throw new Error('Invalid response from server');
    }
    const normalized = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      branch_id: userData.branch_id,
      branch_name: userData.branch_name ?? null,
      avatar: null,
    };
    setUser(normalized);
    localStorage.setItem('user', JSON.stringify(normalized));
    return normalized;
  }, []);

  const register = useCallback(async (userData) => {
    await api.users.createAccountRequest(userData);
    invalidateData('accountRequests');
  }, []);

  const logout = useCallback(async () => {
    try { await api.auth.logout(); } catch { /* ignore */ }
    setUser(null);
    localStorage.removeItem('user');
    try {
      localStorage.removeItem('rememberMe');
    } catch { /* ignore */ }
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      updateUser,
      loadUser,
      isAuthenticated: !!user,
      isAdminPusat: user?.role === 'Admin Pusat',
      isAdminCabang: user?.role === 'Admin Cabang',
    }),
    [user, loading, login, register, logout, updateUser, loadUser]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
export default AuthContext;
