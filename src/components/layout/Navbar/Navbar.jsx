import { memo, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { HiBell, HiChevronDown, HiLogout, HiMenu, HiX } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { truncate } from '../../../utils/assetConstants';
import { NotificationContext } from '../../../context/NotificationContext';

const Navbar = memo(({ onMenuClick }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const profileMenuRef = useRef(null);
  const notificationsRef = useRef(null);
  const notificationApi = useContext(NotificationContext);
  const {
    notifications = [],
    latestThree = [],
    unreadCount = 0,
    displayUnreadCount = '0',
    markAsRead = () => {},
    markAllAsRead = () => {},
    refresh = () => {},
  } = notificationApi || {};

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenViewAll = useCallback(() => {
    setShowNotifications(false);
    refresh();
    setShowAllNotifications(true);
  }, [refresh]);

  const handleCloseViewAll = useCallback(() => {
    setShowAllNotifications(false);
  }, []);

  const handleNotificationClick = useCallback(
    (notif) => {
      markAsRead(notif.id);
    },
    [markAsRead]
  );

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('id-ID');
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowProfileMenu(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);
  
  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const getInitials = useCallback((name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);
  
  return (
    <nav className="h-14 bg-white border-b border-gray-200 relative z-50">
      <div className="h-full px-4 sm:px-6 lg:px-8">
        <div className="h-full flex items-center justify-between">
          {/* Left side - Menu button */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onMenuClick}
              className="lg:hidden text-neutral-500 hover:text-neutral-900 focus:outline-none transition-colors"
              aria-label="Toggle menu"
            >
              <HiMenu className="w-6 h-6" />
            </button>
            
            <h1 className="text-base font-semibold text-neutral-900 hidden sm:block tracking-tight">
              Asset Monitoring Dashboard
            </h1>
          </div>
          
          {/* Right side - Actions */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                aria-label="Notifications"
                aria-expanded={showNotifications}
                aria-haspopup="true"
              >
                <HiBell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[1rem] h-4 px-1 bg-neutral-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center" aria-label={`${unreadCount} unread notifications`}>
                    {displayUnreadCount}
                  </span>
                )}
              </button>
              
              {/* Notifications Dropdown - 3 terbaru */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-[9999]" role="menu">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-neutral-900 text-sm">Notifications</h3>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {latestThree.length === 0 ? (
                      <p className="px-4 py-4 text-sm text-neutral-500">Tidak ada notifikasi</p>
                    ) : (
                      latestThree.map((notif) => (
                        <button
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className="w-full px-4 py-3 border-b border-gray-50 hover:bg-neutral-50 cursor-pointer transition-colors text-left"
                          role="menuitem"
                        >
                          <div className="flex items-start gap-2">
                            {!notif.read && (
                              <div className="w-1.5 h-1.5 bg-neutral-900 rounded-full mt-2 shrink-0" aria-hidden="true" />
                            )}
                            <div className="flex-1">
                              <p className={`text-sm ${!notif.read ? 'text-neutral-900 font-medium' : 'text-neutral-600'}`}>
                                {notif.message}
                              </p>
                              <p className="text-xs text-neutral-400 mt-1">{formatTime(notif.createdAt)}</p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-3 text-center border-t border-gray-100">
                    <button
                      type="button"
                      onClick={handleOpenViewAll}
                      className="text-sm text-neutral-900 hover:underline font-medium"
                    >
                      View All Notification
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Profile Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
                aria-label="User menu"
                aria-expanded={showProfileMenu}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 bg-neutral-900 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-xs">{getInitials(user?.name)}</span>
                </div>
                <span className="text-sm font-medium text-neutral-700 hidden sm:block" title={user?.name}>{truncate(user?.name, 30)}</span>
                <HiChevronDown className="w-4 h-4 text-neutral-400" />
              </button>
              
              {/* Profile Menu Dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-[9999]" role="menu">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-neutral-900" title={user?.name}>{truncate(user?.name, 30)}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{user?.email}</p>
                    {user?.role && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 bg-neutral-100 text-neutral-700 text-xs font-medium rounded-full">
                        {user.role}
                      </span>
                    )}
                  </div>
                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 font-medium flex items-center gap-2 transition-colors"
                      role="menuitem"
                    >
                      <HiLogout className="w-4 h-4" aria-hidden="true" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* View All Notifications Overlay - max 9 ditampilkan */}
      {showAllNotifications && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40">
          <div className="relative w-full max-w-md max-h-[85vh] bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <h3 className="font-semibold text-neutral-900">View All Notification</h3>
              <button
                type="button"
                onClick={handleCloseViewAll}
                className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg transition-colors"
                aria-label="Tutup"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-sm text-neutral-500 text-center">Tidak ada notifikasi</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {notifications.map((notif) => (
                    <li key={notif.id}>
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(notif)}
                        className="w-full px-4 py-3 hover:bg-neutral-50 text-left transition-colors flex items-start gap-2"
                      >
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 bg-neutral-900 rounded-full mt-2 shrink-0" aria-hidden="true" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notif.read ? 'font-medium text-neutral-900' : 'text-neutral-600'}`}>
                            {notif.message}
                          </p>
                          <p className="text-xs text-neutral-400 mt-1">{formatTime(notif.createdAt)}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="text-sm text-neutral-600 hover:text-neutral-900 font-medium"
              >
                Tandai semua dibaca
              </button>
              <button
                type="button"
                onClick={handleCloseViewAll}
                className="text-sm font-medium text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-4 py-2 rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
});

Navbar.displayName = 'Navbar';

export default Navbar;
