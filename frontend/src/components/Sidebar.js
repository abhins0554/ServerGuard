import React from 'react';
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
  ScreenShare as ScreenShareIcon
} from 'lucide-react';

const Sidebar = ({ onLogout }) => {
  const location = useLocation();

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
  ];

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Activity className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">System Info</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onLogout}
            className="flex items-center space-x-3 w-full px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors duration-200"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;