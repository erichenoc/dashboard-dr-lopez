'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  Download,
  Users,
  X,
} from 'lucide-react';
import clsx from 'clsx';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Conversaciones', href: '/conversations', icon: MessageSquare },
  { name: 'Servicios', href: '/services', icon: Stethoscope },
  { name: 'Citas', href: '/citas', icon: Calendar },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Reportes', href: '/reports', icon: Download },
];

export default function Sidebar({ onClose, isMobile = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <aside
      className={clsx(
        'h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out flex flex-col',
        isMobile ? 'w-64' : 'fixed left-0 top-0 z-40',
        !isMobile && (collapsed ? 'w-16' : 'w-64')
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Dr. Lopez
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                AI Dashboard
              </span>
            </div>
          </div>
        )}
        {collapsed && !isMobile && (
          <div className="w-8 h-8 mx-auto rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
        )}
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleLinkClick}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <item.icon
                className={clsx(
                  'w-5 h-5 flex-shrink-0',
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                )}
              />
              {!collapsed && (
                <span className="text-sm font-medium">{item.name}</span>
              )}
              {!collapsed && item.badge && (
                <span className="ml-auto bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs font-medium px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings & Collapse */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-2">
        <Link
          href="/settings"
          onClick={handleLinkClick}
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
            pathname === '/settings'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          )}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Configuracion</span>}
        </Link>

        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-3 px-3 py-2.5 mt-1 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5 flex-shrink-0" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Colapsar</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );
}
