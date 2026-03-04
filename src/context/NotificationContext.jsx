import { createContext, useCallback, useMemo, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useDataInvalidation } from '../utils/dataInvalidation';
import { api, getListData } from '../api/client';

const NOTIFICATION_READ_KEY = 'notificationReadIds';
const MAX_UNREAD_DISPLAY = 9;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getReminderDates(dueUpdateIso) {
  const dates = [];
  const d = new Date(dueUpdateIso);
  d.setHours(0, 0, 0, 0);
  const dueTime = d.getTime();
  dates.push(dueTime);
  const d7 = new Date(dueTime);
  d7.setDate(d7.getDate() + 7);
  dates.push(d7.getTime());
  let next = new Date(d7);
  for (let i = 0; i < 24; i++) {
    next.setDate(next.getDate() + 14);
    dates.push(next.getTime());
  }
  return dates;
}

function getReadIds() {
  try {
    const raw = localStorage.getItem(NOTIFICATION_READ_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function setReadIds(ids) {
  localStorage.setItem(NOTIFICATION_READ_KEY, JSON.stringify([...ids]));
}

function buildNotifications(assets, readIds) {
  const now = startOfToday();
  const list = [];
  assets.forEach((asset) => {
    if (asset.status !== 'Perlu Diupdate' || !asset.dueUpdate) return;
    const dueUpdate = asset.dueUpdate;
    const reminderTimes = getReminderDates(dueUpdate);
    reminderTimes.forEach((t) => {
      if (t > now) return;
      const dateIso = new Date(t).toISOString().slice(0, 10);
      const id = `${asset.id}-${dateIso}`;
      const message = `Asset ${asset.serialNumber} (${asset.type}) perlu diupdate. Jatuh tempo: ${new Date(dueUpdate).toLocaleDateString('id-ID')}.`;
      list.push({
        id,
        assetId: asset.id,
        message,
        createdAt: new Date(t).toISOString(),
        read: readIds.has(id),
      });
    });
  });
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return list;
}

export const NotificationContext = createContext(null);

function applyDueUpdateStatus(assets) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return (assets || []).map((a) => {
    if (a.status === 'Available' && a.dueUpdate && new Date(a.dueUpdate).getTime() <= now.getTime()) {
      return { ...a, status: 'Perlu Diupdate' };
    }
    return a;
  });
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [readIds, setReadIdsState] = useState(() => getReadIds());
  const [assets, setAssets] = useState([]);

  const loadAssets = useCallback(() => {
    if (!user) {
      setAssets([]);
      return;
    }
    const params = {};
    // Admin Cabang: only their branch. Admin Pusat: all branches (notifications for all late assets).
    if (user.role === 'Admin Cabang' && user.branch_id) params.branchId = user.branch_id;
    api.assets.list(params)
      .then((res) => setAssets(getListData(res)))
      .catch((err) => {
        // FIX [F009]: Log error instead of silently showing empty list
        console.error('[NotificationContext] Failed to load assets for notifications:', err?.message || err);
        setAssets([]);
      });
  }, [user?.id, user?.role, user?.branch_id]);

  useEffect(() => {
    if (!user) {
      setAssets([]);
      return;
    }
    loadAssets();
  }, [user, loadAssets]);

  useDataInvalidation('assets', loadAssets);

  const assetsWithLate = useMemo(() => applyDueUpdateStatus(assets), [assets]);
  const notifications = useMemo(
    () => buildNotifications(assetsWithLate, readIds),
    [assetsWithLate, readIds]
  );

  const latestThree = useMemo(() => notifications.slice(0, 3), [notifications]);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const displayUnreadCount = unreadCount > MAX_UNREAD_DISPLAY ? '9+' : String(unreadCount);

  const refresh = useCallback(() => {
    setReadIdsState(getReadIds());
  }, []);

  const markAsRead = useCallback((id) => {
    const ids = getReadIds();
    ids.add(id);
    setReadIds(ids);
    setReadIdsState(new Set(ids));
  }, []);

  const markAllAsRead = useCallback(() => {
    const ids = getReadIds();
    notifications.forEach((n) => ids.add(n.id));
    setReadIds(ids);
    setReadIdsState(new Set(ids));
  }, [notifications]);

  useEffect(() => {
    setReadIdsState(getReadIds());
  }, [assetsWithLate]);

  const value = useMemo(
    () => ({
      notifications,
      latestThree,
      unreadCount,
      displayUnreadCount,
      markAsRead,
      markAllAsRead,
      refresh,
    }),
    [notifications, latestThree, unreadCount, displayUnreadCount, markAsRead, markAllAsRead, refresh]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
