import { useState, memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HiChartBar, 
  HiCube, 
  HiUserAdd, 
  HiOfficeBuilding, 
  HiX,
  HiChevronLeft,
  HiChevronRight,
  HiSwitchHorizontal,
  HiClipboardList,
  HiBadgeCheck,
  HiClock,
  HiExclamation
} from 'react-icons/hi';
import { useAuth } from '../../../context/AuthContext';

const Sidebar = memo(({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const userRole = user?.role || 'Admin Cabang';
  
  // Navigation items based on role
  const getNavigationItems = () => {
    const commonItems = [
      { path: '/dashboard', label: 'Dashboard', icon: HiChartBar },
      { path: '/assets', label: 'Assets', icon: HiCube }
    ];
    
    const adminCabangItems = [
      { path: '/assign-asset', label: 'Assign Asset', icon: HiUserAdd },
    ];
    
    const adminPusatItems = [
      { path: '/branch-management', label: 'Branch & User Management', icon: HiOfficeBuilding },
      { path: '/reminder-settings', label: 'Pengaturan Reminder Update', icon: HiClock },
      { path: '/transfer-requests', label: 'Transfer Requests', icon: HiSwitchHorizontal },
      { path: '/reassignment-requests', label: 'Reassignment Requests', icon: HiClipboardList },
      { path: '/asset-approval', label: 'Asset Approval', icon: HiBadgeCheck },
      { path: '/asset-rusak', label: 'Asset Rusak', icon: HiExclamation },
    ];
    
    if (userRole === 'Admin Pusat') {
      return [...commonItems, ...adminPusatItems];
    } else if (userRole === 'Admin Cabang') {
      return [...commonItems, ...adminCabangItems];
    }
    
    return commonItems;
  };
  
  const navigationItems = getNavigationItems();
  
  const isActive = (path) => location.pathname === path;
  
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-white z-50 flex flex-col
          border-r border-gray-200
          transform transition-all duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-[4.6rem]' : 'lg:w-60'}
          w-60
        `}
      >
        {/* Logo/Brand */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200 shrink-0">
          {!isCollapsed ? (
            <>
              <div className="flex items-center space-x-2.5 overflow-hidden flex-1 min-w-0">
                <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center shrink-0">
                  <HiCube className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-base text-neutral-900 whitespace-nowrap tracking-tight">Keria</span>
              </div>
              
              {/* Close button for mobile */}
              <button
                onClick={onClose}
                className="lg:hidden text-neutral-400 hover:text-neutral-900 transition-colors shrink-0"
                aria-label="Close sidebar"
              >
                <HiX className="w-5 h-5" />
              </button>
              
              {/* Collapse button for desktop */}
              <button
                onClick={toggleCollapse}
                className="hidden lg:block text-neutral-400 hover:text-neutral-900 transition-colors shrink-0"
                aria-label="Collapse sidebar"
              >
                <HiChevronLeft className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="w-full flex justify-center">
              <button
                onClick={toggleCollapse}
                className="text-neutral-400 hover:text-neutral-900 transition-colors"
                aria-label="Expand sidebar"
              >
                <HiChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
          {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-hide" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => {
                      onClose();
                    }}
                    title={isCollapsed ? item.label : ''}
                    className={`
                      flex items-center px-3 py-2 rounded-lg text-sm
                      transition-all duration-150
                      ${isActive(item.path)
                        ? 'bg-black text-white font-medium'
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                      }
                      ${isCollapsed ? 'justify-center' : 'space-x-3'}
                    `}
                  >
                    <IconComponent className={`${isCollapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'} shrink-0`} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
