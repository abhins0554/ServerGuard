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
    { path: '/cpu', icon: Cpu, label: 'CPU Details' },
    { path: '/memory', icon: Database, label: 'Memory Details' },
    { path: '/disk', icon: HardDrive, label: 'Disk Details' },
    { path: '/network', icon: Network, label: 'Network Details' },
    { path: '/os', icon: Server, label: 'OS Info' },
    { path: '/processes', icon: ListChecks, label: 'Processes' },
    { path: '/terminal', icon: TerminalIcon, label: 'Terminal' },
    { path: '/files', icon: FolderOpen, label: 'File Manager' },
    { path: '/screen', icon: ScreenShareIcon, label: 'Screen Share' },
    { path: '/network-tools', icon: Wifi, label: 'Network Tools' },
    { path: '/docker', icon: Package, label: 'Docker' },
    { path: '/packages', icon: Package, label: 'Packages' },
  ];

  const NavContent = () => (
    <>
      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                isActive
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-r-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <button
          onClick={toggleTheme}
          className="flex items-center space-x-3 w-full px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors duration-200"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button
          onClick={onLogout}
          className="flex items-center space-x-3 w-full px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors duration-200"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6 text-gray-700 dark:text-gray-300" />
        ) : (
          <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-900 shadow-lg border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">System Info</span>
            </div>
          </div>

          <NavContent />
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;