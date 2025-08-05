import React, { useState, useEffect } from 'react';
import { systemAPI } from '../services/api';
import { 
  Cpu, 
  HardDrive, 
  Network, 
  TrendingUp,
  Clock,
  Activity,
  Database
} from 'lucide-react';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchSummary = async () => {
    try {
      const data = await systemAPI.getSummary();
      setSummary(data);
      setLastUpdate(new Date());
      setError('');
    } catch (err) {
      setError('Failed to fetch system data');
      console.error('Error fetching summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getProgressColor = (percent) => {
    if (percent < 60) return 'bg-green-500';
    if (percent < 80) return 'bg-yellow-500';
    return 'bg-red-500';
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
          <button onClick={fetchSummary} className="btn-primary">
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">System Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Activity className="h-4 w-4" />
          <span>Real-time monitoring</span>
          {lastUpdate && (
            <>
              <span>•</span>
              <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* CPU Card */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Cpu className="h-6 w-6 text-blue-600" />
              <span className="font-semibold text-gray-900">CPU Usage</span>
            </div>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {summary?.cpu_percent?.toFixed(1) || 0}%
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${getProgressColor(summary?.cpu_percent || 0)}`}
              style={{ width: `${summary?.cpu_percent || 0}%` }}
            ></div>
          </div>
        </div>

        {/* Memory Card */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Database className="h-6 w-6 text-green-600" />
              <span className="font-semibold text-gray-900">Memory Usage</span>
            </div>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {summary?.memory_percent?.toFixed(1) || 0}%
          </div>
          <div className="text-sm text-gray-600 mb-2">
            {formatBytes(summary?.memory_used || 0)} / {formatBytes(summary?.memory_total || 0)}
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${getProgressColor(summary?.memory_percent || 0)}`}
              style={{ width: `${summary?.memory_percent || 0}%` }}
            ></div>
          </div>
        </div>

        {/* Disk Card */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-6 w-6 text-purple-600" />
              <span className="font-semibold text-gray-900">Disk Usage</span>
            </div>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {(() => {
              const diskData = Object.values(summary?.disk_usage || {})[0];
              return diskData?.percent?.toFixed(1) || 0;
            })()}%
          </div>
          <div className="text-sm text-gray-600 mb-2">
            {(() => {
              const diskData = Object.values(summary?.disk_usage || {})[0];
              return diskData ? `${formatBytes(diskData.used)} / ${formatBytes(diskData.total)}` : 'N/A';
            })()}
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${getProgressColor(
                (() => {
                  const diskData = Object.values(summary?.disk_usage || {})[0];
                  return diskData?.percent || 0;
                })()
              )}`}
              style={{ 
                width: `${(() => {
                  const diskData = Object.values(summary?.disk_usage || {})[0];
                  return diskData?.percent || 0;
                })()}%` 
              }}
            ></div>
          </div>
        </div>

        {/* Network Card */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Network className="h-6 w-6 text-orange-600" />
              <span className="font-semibold text-gray-900">Network</span>
            </div>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Sent:</span>
              <span className="font-medium">{formatBytes(summary?.network_bytes_sent || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Received:</span>
              <span className="font-medium">{formatBytes(summary?.network_bytes_recv || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full btn-secondary text-left">
              Export System Report
            </button>
            <button className="w-full btn-secondary text-left">
              View Detailed Logs
            </button>
            <button className="w-full btn-secondary text-left">
              System Health Check
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">CPU Status</span>
              <span className="text-green-600 font-medium">Healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Memory Status</span>
              <span className="text-green-600 font-medium">Healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Disk Status</span>
              <span className="text-green-600 font-medium">Healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Network Status</span>
              <span className="text-green-600 font-medium">Connected</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">System data updated</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Activity className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Monitoring active</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <TrendingUp className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Performance stable</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 