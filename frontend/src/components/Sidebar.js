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
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="flex items-center px-6 h-20 border-b border-white/10 dark:border-gray-800/50">
        <div className="flex items-center space-x-3 group">
          <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform duration-300">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">ServerGuard</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full" />
              )}
              <Icon className={`h-5 w-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="text-sm tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 mt-auto border-t border-white/10 dark:border-gray-800/50 space-y-2">
        <button
          onClick={toggleTheme}
          className="flex items-center space-x-3 w-full px-4 py-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-white rounded-xl transition-all duration-200 group"
        >
          <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-blue-500/10 transition-colors">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </div>
          <span className="text-sm font-medium">{theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
        </button>
        <button
          onClick={onLogout}
          className="flex items-center space-x-3 w-full px-4 py-2.5 text-gray-500 dark:text-gray-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all duration-200 group"
        >
          <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-red-500/20 transition-colors">
            <LogOut className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 p-4 bg-blue-600 text-white rounded-2xl shadow-2xl shadow-blue-600/40 hover:scale-110 active:scale-95 transition-all duration-300"
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 glass-sidebar transform transition-all duration-500 ease-in-out lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <NavContent />
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;