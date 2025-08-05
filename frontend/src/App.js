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
import Sidebar from './components/Sidebar';
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
    <Router>
      <div className="flex h-screen bg-gray-50">
        <Sidebar onLogout={handleLogout} />
        <div className="flex-1 overflow-auto">
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;