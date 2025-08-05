import React, { useState, useEffect } from 'react';
import { systemAPI } from '../services/api';
import { Database, HardDrive, Activity, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const MemoryDetails = () => {
  const [memoryInfo, setMemoryInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchMemoryInfo();
    const interval = setInterval(fetchMemoryInfo, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchMemoryInfo = async () => {
    try {
      const data = await systemAPI.getMemoryInfo();
      setMemoryInfo(data);
      
      // Add to history for chart
      setHistory(prev => {
        const newHistory = [...prev, {
          time: new Date().toLocaleTimeString(),
          memory: data.memory.percent,
          swap: data.swap.percent
        }];
        
        // Keep only last 20 data points
        return newHistory.slice(-20);
      });
      
      setError('');
    } catch (err) {
      setError('Failed to fetch memory data');
      console.error('Error fetching memory info:', err);
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

  const memoryChartData = memoryInfo ? [
    { name: 'Used', value: memoryInfo.memory.used, color: '#3b82f6' },
    { name: 'Available', value: memoryInfo.memory.available, color: '#10b981' }
  ] : [];

  const swapChartData = memoryInfo ? [
    { name: 'Used', value: memoryInfo.swap.used, color: '#f59e0b' },
    { name: 'Free', value: memoryInfo.swap.free, color: '#6b7280' }
  ] : [];

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
          <button onClick={fetchMemoryInfo} className="btn-primary">
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Memory Details</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Database className="h-4 w-4" />
          <span>RAM and swap memory information</span>
        </div>
      </div>

      {/* Memory Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">RAM Usage</h3>
          </div>
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {memoryInfo?.memory?.percent?.toFixed(1) || 0}%
          </div>
          <div className="text-sm text-gray-600 mb-2">
            {formatBytes(memoryInfo?.memory?.used || 0)} / {formatBytes(memoryInfo?.memory?.total || 0)}
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${getProgressColor(memoryInfo?.memory?.percent || 0)}`}
              style={{ width: `${memoryInfo?.memory?.percent || 0}%` }}
            ></div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <HardDrive className="h-6 w-6 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Swap Usage</h3>
          </div>
          <div className="text-4xl font-bold text-orange-600 mb-2">
            {memoryInfo?.swap?.percent?.toFixed(1) || 0}%
          </div>
          <div className="text-sm text-gray-600 mb-2">
            {formatBytes(memoryInfo?.swap?.used || 0)} / {formatBytes(memoryInfo?.swap?.total || 0)}
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${getProgressColor(memoryInfo?.swap?.percent || 0)}`}
              style={{ width: `${memoryInfo?.swap?.percent || 0}%` }}
            ></div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Available Memory</h3>
          </div>
          <div className="text-3xl font-bold text-green-600 mb-2">
            {formatBytes(memoryInfo?.memory?.available || 0)}
          </div>
          <div className="text-sm text-gray-600">
            Free memory for applications
          </div>
        </div>
      </div>

      {/* Memory Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">RAM Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={memoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {memoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatBytes(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-4 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-600">Used</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">Available</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Swap Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={swapChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {swapChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatBytes(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-4 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span className="text-sm text-gray-600">Used</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-500 rounded"></div>
              <span className="text-sm text-gray-600">Free</span>
            </div>
          </div>
        </div>
      </div>

      {/* Memory Details Table */}
      <div className="card mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Memory Information</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metric
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Total RAM
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatBytes(memoryInfo?.memory?.total || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  100%
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Used RAM
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatBytes(memoryInfo?.memory?.used || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {memoryInfo?.memory?.percent?.toFixed(1) || 0}%
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Available RAM
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatBytes(memoryInfo?.memory?.available || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {((memoryInfo?.memory?.available || 0) / (memoryInfo?.memory?.total || 1) * 100).toFixed(1)}%
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Total Swap
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatBytes(memoryInfo?.swap?.total || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  100%
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Used Swap
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatBytes(memoryInfo?.swap?.used || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {memoryInfo?.swap?.percent?.toFixed(1) || 0}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage History Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Memory Usage History</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="memory" stroke="#3b82f6" strokeWidth={2} name="RAM" />
              <Line type="monotone" dataKey="swap" stroke="#f59e0b" strokeWidth={2} name="Swap" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default MemoryDetails; 