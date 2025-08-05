import React, { useState, useEffect } from 'react';
import { systemAPI } from '../services/api';
import { Server, Clock, Activity, Monitor, Cpu, HardDrive } from 'lucide-react';

const OsDetails = () => {
  const [osInfo, setOsInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOsInfo();
    const interval = setInterval(fetchOsInfo, 10000); // Update every 10 seconds for uptime
    
    return () => clearInterval(interval);
  }, []);

  const fetchOsInfo = async () => {
    try {
      const data = await systemAPI.getOsInfo();
      setOsInfo(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch OS data');
      console.error('Error fetching OS info:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (uptime) => {
    if (!uptime) return 'Unknown';
    const { days, hours, minutes, seconds } = uptime;
    const parts = [];
    
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    if (seconds > 0 && parts.length === 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
    
    return parts.join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">{error}</div>
          <button onClick={fetchOsInfo} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Operating System</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Server className="h-4 w-4" />
          <span>System information and configuration</span>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Monitor className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Operating System</h3>
          </div>
          <div className="text-xl font-bold text-blue-600 mb-2">
            {osInfo?.system || 'Unknown'}
          </div>
          <div className="text-sm text-gray-600">
            {osInfo?.release || 'Unknown'} ({osInfo?.version || 'Unknown'})
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Hostname</h3>
          </div>
          <div className="text-xl font-bold text-green-600 mb-2">
            {osInfo?.hostname || 'Unknown'}
          </div>
          <div className="text-sm text-gray-600">
            System hostname
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Clock className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Uptime</h3>
          </div>
          <div className="text-xl font-bold text-purple-600 mb-2">
            {formatUptime(osInfo?.uptime)}
          </div>
          <div className="text-sm text-gray-600">
            System uptime
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="card mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Cpu className="h-5 w-5 text-gray-400" />
              <div>
                <div className="text-sm font-medium text-gray-900">Architecture</div>
                <div className="text-sm text-gray-600">{osInfo?.machine || 'Unknown'}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Server className="h-5 w-5 text-gray-400" />
              <div>
                <div className="text-sm font-medium text-gray-900">Processor</div>
                <div className="text-sm text-gray-600">{osInfo?.processor || 'Unknown'}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <div className="text-sm font-medium text-gray-900">Boot Time</div>
                <div className="text-sm text-gray-600">
                  {osInfo?.boot_time ? new Date(osInfo.boot_time).toLocaleString() : 'Unknown'}
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Monitor className="h-5 w-5 text-gray-400" />
              <div>
                <div className="text-sm font-medium text-gray-900">System</div>
                <div className="text-sm text-gray-600">{osInfo?.system || 'Unknown'}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Activity className="h-5 w-5 text-gray-400" />
              <div>
                <div className="text-sm font-medium text-gray-900">Release</div>
                <div className="text-sm text-gray-600">{osInfo?.release || 'Unknown'}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <HardDrive className="h-5 w-5 text-gray-400" />
              <div>
                <div className="text-sm font-medium text-gray-900">Version</div>
                <div className="text-sm text-gray-600">{osInfo?.version || 'Unknown'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Uptime Details */}
      <div className="card mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Uptime Details</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {osInfo?.uptime?.days || 0}
              </div>
              <div className="text-sm text-gray-600">Days</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {osInfo?.uptime?.hours || 0}
              </div>
              <div className="text-sm text-gray-600">Hours</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {osInfo?.uptime?.minutes || 0}
              </div>
              <div className="text-sm text-gray-600">Minutes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {osInfo?.uptime?.seconds || 0}
              </div>
              <div className="text-sm text-gray-600">Seconds</div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-medium text-green-800">System Online</span>
            </div>
            <p className="text-sm text-green-600 mt-1">All systems operational</p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="font-medium text-blue-800">Monitoring Active</span>
            </div>
            <p className="text-sm text-blue-600 mt-1">Real-time monitoring enabled</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OsDetails; 