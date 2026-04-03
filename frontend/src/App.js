import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CpuDetails from './components/CpuDetails';
import MemoryDetails from './components/MemoryDetails';
import DiskDetails from './components/DiskDetails';
import NetworkDetails from './components/NetworkDetails';
import OsDetails from './components/OsDetails';
import ProcessDetails from './components/ProcessDetails';
import Terminal from './components/Terminal';
import FileManager from './components/FileManager';
import ScreenShare from './components/ScreenShare';
import NetworkTools from './components/NetworkTools';
import DockerManagement from './components/DockerManagement';
import PackageManagement from './components/PackageManagement';
import Sidebar from './components/Sidebar';
import { ThemeProvider } from './contexts/ThemeContext';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      setIsAuthenticated(true);
    }
  }, [token]);

  const handleLogin = (newToken) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <ThemeProvider>
      <Router>
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
          <Sidebar onLogout={handleLogout} />
          {/* lg:pl-64 reserves horizontal space for the fixed sidebar (w-64); without it, main content sits underneath */}
          <main className="flex-1 min-w-0 w-full relative overflow-y-auto scroll-smooth lg:pl-64 lg:border-l border-gray-200/70 dark:border-gray-800/80">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
            
            <div className="w-full max-w-[1680px] mx-auto min-h-0">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/cpu" element={<CpuDetails />} />
                <Route path="/memory" element={<MemoryDetails />} />
                <Route path="/disk" element={<DiskDetails />} />
                <Route path="/network" element={<NetworkDetails />} />
                <Route path="/os" element={<OsDetails />} />
                <Route path="/processes" element={<ProcessDetails />} />
                <Route path="/terminal" element={<Terminal />} />
                <Route path="/files" element={<FileManager />} />
                <Route path="/screen" element={<ScreenShare />} />
                <Route path="/network-tools" element={<NetworkTools />} />
                <Route path="/docker" element={<DockerManagement />} />
                <Route path="/packages" element={<PackageManagement />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;