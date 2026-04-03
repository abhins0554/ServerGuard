import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Monitor,
  Cpu,
  Database,
  HardDrive,
  Network,
  Server,
  LogOut,
  Activity,
  ListChecks,
  Terminal as TerminalIcon,
  FolderOpen,
  ScreenShare as ScreenShareIcon,
  Package,
  Wifi,
  Moon,
  Sun,
  Menu,
  X
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const Sidebar = ({ onLogout }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', icon: Monitor, label: 'Dashboard' },
    { path: '/cpu', icon: Cpu, label: 'CPU' },
    { path: '/memory', icon: Database, label: 'Memory' },
    { path: '/disk', icon: HardDrive, label: 'Disk' },
    { path: '/network', icon: Network, label: 'Network' },
    { path: '/os', icon: Server, label: 'OS Info' },
    { path: '/processes', icon: ListChecks, label: 'Processes' },
    { path: '/terminal', icon: TerminalIcon, label: 'Terminal' },
    { path: '/files', icon: FolderOpen, label: 'Files' },
    { path: '/screen', icon: ScreenShareIcon, label: 'Screen' },
    { path: '/network-tools', icon: Wifi, label: 'Net Tools' },
    { path: '/docker', icon: Package, label: 'Docker' },
    { path: '/packages', icon: Package, label: 'Packages' },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full p-3 sm:p-4">
      {/* Brand — glass chip */}
      <div className="mb-3 rounded-2xl border border-white/40 dark:border-gray-700/50 bg-white/45 dark:bg-gray-900/35 backdrop-blur-md px-4 py-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-600/25 ring-1 ring-white/20">
            <Activity className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <span className="block text-base font-semibold tracking-tight text-gray-900 dark:text-white truncate">
              ServerGuard
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">System overview</span>
          </div>
        </div>
      </div>

      {/* Nav — inset frosted stack (macOS sidebar feel) */}
      <nav className="flex-1 min-h-0 rounded-2xl border border-white/35 dark:border-gray-800/60 bg-white/35 dark:bg-gray-900/30 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] px-2 py-3 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                isActive
                  ? 'bg-white/85 dark:bg-white/10 text-blue-700 dark:text-blue-300 shadow-md shadow-black/[0.06] dark:shadow-black/30 ring-1 ring-black/[0.04] dark:ring-white/10'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-blue-500 rounded-r-full dark:bg-blue-400" />
              )}
              <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'opacity-100' : 'opacity-80'}`} strokeWidth={isActive ? 2.25 : 2} />
              <span className="truncate tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer — glass actions */}
      <div className="mt-3 pt-3 border-t border-white/25 dark:border-gray-800/50 space-y-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-white/45 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white transition-all border border-transparent hover:border-white/30 dark:hover:border-gray-700/50"
        >
          <span className="p-2 rounded-lg bg-white/60 dark:bg-gray-800/80 shadow-sm">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </span>
          <span className="text-sm font-medium">{theme === 'dark' ? 'Light' : 'Dark'} mode</span>
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
        >
          <span className="p-2 rounded-lg bg-white/60 dark:bg-gray-800/80 shadow-sm">
            <LogOut className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium">Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-blue-600/95 text-white shadow-2xl shadow-blue-600/35 backdrop-blur-md border border-white/20 hover:scale-105 active:scale-95 transition-transform"
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 glass-sidebar transform transition-transform duration-300 ease-out lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <NavContent />
      </aside>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden
        />
      )}
    </>
  );
};

export default Sidebar;
