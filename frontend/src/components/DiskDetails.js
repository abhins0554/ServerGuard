import React, { useState, useEffect } from 'react';
import { systemAPI } from '../services/api';
import { HardDrive, Activity, TrendingUp, Database } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const DiskDetails = () => {
  const [diskInfo, setDiskInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchDiskInfo();
    const interval = setInterval(fetchDiskInfo, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchDiskInfo = async () => {
    try {
      const data = await systemAPI.getDiskInfo();
      setDiskInfo(data);
      
      // Add to history for chart
      setHistory(prev => {
        const newHistory = [...prev, {
          time: new Date().toLocaleTimeString(),
          read: data.io_counters.read_bytes,
          write: data.io_counters.write_bytes
        }];
        
        // Keep only last 15 data points
        return newHistory.slice(-15);
      });
      
      setError('');
    } catch (err) {
      setError('Failed to fetch disk data');
      console.error('Error fetching disk info:', err);
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
          <button onClick={fetchDiskInfo} className="btn-primary">
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Disk Details</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <HardDrive className="h-4 w-4" />
          <span>Storage partitions and I/O statistics</span>
        </div>
      </div>

      {/* I/O Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Read Operations</h3>
          </div>
          <div className="text-2xl font-bold text-blue-600 mb-2">
            {diskInfo?.io_counters?.read_count?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600">
            Total read operations
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Write Operations</h3>
          </div>
          <div className="text-2xl font-bold text-green-600 mb-2">
            {diskInfo?.io_counters?.write_count?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600">
            Total write operations
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Bytes Read</h3>
          </div>
          <div className="text-2xl font-bold text-purple-600 mb-2">
            {formatBytes(diskInfo?.io_counters?.read_bytes || 0)}
          </div>
          <div className="text-sm text-gray-600">
            Total data read
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <HardDrive className="h-6 w-6 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Bytes Written</h3>
          </div>
          <div className="text-2xl font-bold text-orange-600 mb-2">
            {formatBytes(diskInfo?.io_counters?.write_bytes || 0)}
          </div>
          <div className="text-sm text-gray-600">
            Total data written
          </div>
        </div>
      </div>

      {/* Disk Partitions */}
      <div className="card mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Disk Partitions</h3>
        <div className="space-y-4">
          {Object.entries(diskInfo?.partitions || {}).map(([device, partition]) => (
            <div key={device} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{device}</h4>
                  <p className="text-sm text-gray-600">
                    Mount: {partition.mountpoint} | Type: {partition.fstype}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {partition.percent?.toFixed(1) || 0}%
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatBytes(partition.used || 0)} / {formatBytes(partition.total || 0)}
                  </div>
                </div>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${getProgressColor(partition.percent || 0)}`}
                  style={{ width: `${partition.percent || 0}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* I/O History Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Disk I/O History</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip formatter={(value) => formatBytes(value)} />
              <Line type="monotone" dataKey="read" stroke="#3b82f6" strokeWidth={2} name="Read" />
              <Line type="monotone" dataKey="write" stroke="#10b981" strokeWidth={2} name="Write" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DiskDetails; 