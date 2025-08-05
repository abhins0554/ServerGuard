import React, { useState, useEffect } from 'react';
import { systemAPI } from '../services/api';
import { Network, Activity, TrendingUp, Wifi, Globe } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const NetworkDetails = () => {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchNetworkInfo();
    const interval = setInterval(fetchNetworkInfo, 1000); // Update every second for real-time data
    
    return () => clearInterval(interval);
  }, []);

  const fetchNetworkInfo = async () => {
    try {
      const data = await systemAPI.getNetworkInfo();
      setNetworkInfo(data);
      
      // Add to history for chart with real-time utilization
      setHistory(prev => {
        const newHistory = [...prev, {
          time: new Date().toLocaleTimeString(),
          sent: data.io_counters.bytes_sent,
          received: data.io_counters.bytes_recv,
          upload_speed: data.utilization?.mb_sent_per_sec || 0,
          download_speed: data.utilization?.mb_recv_per_sec || 0
        }];
        
        // Keep only last 30 data points for better visualization
        return newHistory.slice(-30);
      });
      
      setError('');
    } catch (err) {
      setError('Failed to fetch network data');
      console.error('Error fetching network info:', err);
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
          <button onClick={fetchNetworkInfo} className="btn-primary">
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Network Details</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Network className="h-4 w-4" />
          <span>Network interfaces and bandwidth statistics</span>
        </div>
      </div>

      {/* Real-time Network Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="card bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Upload Speed</h3>
          </div>
          <div className="text-2xl font-bold text-blue-600 mb-2">
            {networkInfo?.formatted_utilization?.upload_speed || '0.00 MB/s'}
          </div>
          <div className="text-sm text-gray-600">
            Current upload rate
          </div>
        </div>

        <div className="card bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Download Speed</h3>
          </div>
          <div className="text-2xl font-bold text-green-600 mb-2">
            {networkInfo?.formatted_utilization?.download_speed || '0.00 MB/s'}
          </div>
          <div className="text-sm text-gray-600">
            Current download rate
          </div>
        </div>

        <div className="card bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center space-x-3 mb-4">
            <Wifi className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Upload Packets</h3>
          </div>
          <div className="text-2xl font-bold text-purple-600 mb-2">
            {networkInfo?.formatted_utilization?.upload_packets || '0.0 pkt/s'}
          </div>
          <div className="text-sm text-gray-600">
            Packets sent per second
          </div>
        </div>

        <div className="card bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center space-x-3 mb-4">
            <Globe className="h-6 w-6 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Download Packets</h3>
          </div>
          <div className="text-2xl font-bold text-orange-600 mb-2">
            {networkInfo?.formatted_utilization?.download_packets || '0.0 pkt/s'}
          </div>
          <div className="text-sm text-gray-600">
            Packets received per second
          </div>
        </div>
      </div>

      {/* Total Network Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Total Bytes Sent</h3>
          </div>
          <div className="text-2xl font-bold text-blue-600 mb-2">
            {formatBytes(networkInfo?.io_counters?.bytes_sent || 0)}
          </div>
          <div className="text-sm text-gray-600">
            Total data sent
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Total Bytes Received</h3>
          </div>
          <div className="text-2xl font-bold text-green-600 mb-2">
            {formatBytes(networkInfo?.io_counters?.bytes_recv || 0)}
          </div>
          <div className="text-sm text-gray-600">
            Total data received
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Wifi className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Total Packets Sent</h3>
          </div>
          <div className="text-2xl font-bold text-purple-600 mb-2">
            {networkInfo?.io_counters?.packets_sent?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600">
            Total packets sent
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Globe className="h-6 w-6 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Total Packets Received</h3>
          </div>
          <div className="text-2xl font-bold text-orange-600 mb-2">
            {networkInfo?.io_counters?.packets_recv?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600">
            Total packets received
          </div>
        </div>
      </div>

      {/* Network Interfaces */}
      <div className="card mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Interfaces</h3>
        <div className="space-y-4">
          {Object.entries(networkInfo?.interfaces || {}).map(([interfaceName, interfaceData]) => (
            <div key={interfaceName} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{interfaceName}</h4>
                  <div className="text-sm text-gray-600">
                    Status: {interfaceData.stats?.isup ? 'Up' : 'Down'}
                    {interfaceData.stats?.speed && ` | Speed: ${interfaceData.stats.speed} Mbps`}
                    {interfaceData.stats?.mtu && ` | MTU: ${interfaceData.stats.mtu}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {interfaceData.addresses?.length || 0} addresses
                  </div>
                </div>
              </div>
              
              {/* IP Addresses */}
              <div className="space-y-2">
                {interfaceData.addresses?.map((addr, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{addr.family}:</span>
                    <span className="font-medium text-gray-900">{addr.address}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Network Traffic Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Total Traffic Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Network Traffic</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip formatter={(value) => formatBytes(value)} />
                <Line type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={2} name="Sent" />
                <Line type="monotone" dataKey="received" stroke="#10b981" strokeWidth={2} name="Received" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-time Speed Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Real-time Network Speed</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toFixed(2)} MB/s`} />
                <Line type="monotone" dataKey="upload_speed" stroke="#3b82f6" strokeWidth={2} name="Upload Speed" />
                <Line type="monotone" dataKey="download_speed" stroke="#10b981" strokeWidth={2} name="Download Speed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkDetails; 