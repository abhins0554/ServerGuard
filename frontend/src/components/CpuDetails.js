import React, { useState, useEffect } from 'react';
import { systemAPI } from '../services/api';
import { Cpu, Clock, Zap, Activity, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const CpuDetails = () => {
  const [cpuInfo, setCpuInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [useDetailedApi, setUseDetailedApi] = useState(true);

  useEffect(() => {
    fetchCpuInfo();
    const interval = setInterval(fetchCpuInfo, 2000); // More frequent updates
    
    return () => clearInterval(interval);
  }, [useDetailedApi]);

  const fetchCpuInfo = async () => {
    try {
      let data;
      if (useDetailedApi) {
        data = await systemAPI.getDetailedCpuInfo();
      } else {
        data = await systemAPI.getCpuInfo();
      }
      setCpuInfo(data);
      
      // Add to history for chart
      setHistory(prev => {
        const newHistory = [...prev, {
          time: new Date().toLocaleTimeString(),
          usage: data.cpu_percent,
          ...data.cpu_percent_per_core.reduce((acc, usage, index) => {
            acc[`core_${index}`] = usage;
            return acc;
          }, {})
        }];
        
        // Keep only last 20 data points
        return newHistory.slice(-20);
      });
      
      setError('');
    } catch (err) {
      setError('Failed to fetch CPU data');
      console.error('Error fetching CPU info:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatFrequency = (freq) => {
    if (!freq) return 'N/A';
    return `${(freq / 1000).toFixed(2)} GHz`;
  };

  const getCalculationMethod = () => {
    if (!cpuInfo?.calculation_methods) return 'Standard';
    const methods = cpuInfo.calculation_methods;
    if (methods.primary_used === methods.standard_psutil) return 'Standard psutil';
    if (methods.primary_used === methods.cpu_times_total) return 'CPU times calculation';
    return 'Hybrid (most reliable)';
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
          <button onClick={fetchCpuInfo} className="btn-primary">
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">CPU Details</h1>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Cpu className="h-4 w-4" />
            <span>Processor information and usage statistics</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-xs text-gray-500">
              Method: {getCalculationMethod()}
            </div>
            <button
              onClick={() => setUseDetailedApi(!useDetailedApi)}
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              <span>{useDetailedApi ? 'Switch to Basic' : 'Switch to Detailed'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CPU Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Current Usage</h3>
          </div>
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {cpuInfo?.cpu_percent?.toFixed(1) || 0}%
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill bg-blue-500"
              style={{ width: `${cpuInfo?.cpu_percent || 0}%` }}
            ></div>
          </div>
          {cpuInfo?.calculation_methods && (
            <div className="mt-2 text-xs text-gray-500">
              <div>Standard: {cpuInfo.calculation_methods.standard_psutil?.toFixed(1)}%</div>
              <div>CPU Times: {cpuInfo.calculation_methods.cpu_times_total?.toFixed(1)}%</div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Zap className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Frequency</h3>
          </div>
          <div className="text-2xl font-bold text-green-600 mb-2">
            {formatFrequency(cpuInfo?.cpu_freq?.current)}
          </div>
          <div className="text-sm text-gray-600">
            Min: {formatFrequency(cpuInfo?.cpu_freq?.min)} | Max: {formatFrequency(cpuInfo?.cpu_freq?.max)}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Clock className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Cores</h3>
          </div>
          <div className="text-4xl font-bold text-purple-600 mb-2">
            {cpuInfo?.cpu_count || 0}
          </div>
          <div className="text-sm text-gray-600">
            Physical and logical cores
          </div>
        </div>
      </div>

      {/* CPU Model Info */}
      <div className="card mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Processor Information</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-gray-700 font-medium">{cpuInfo?.cpu_model || 'Unknown'}</p>
        </div>
      </div>

      {/* Per-Core Usage */}
      <div className="card mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Per-Core Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cpuInfo?.cpu_percent_per_core?.map((usage, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-700">Core {index + 1}</span>
                <span className="text-sm font-bold text-blue-600">{usage.toFixed(1)}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill bg-blue-500"
                  style={{ width: `${usage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Usage History Chart */}
      <div className="card mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">CPU Usage History</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-Core Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Per-Core Usage Chart</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history.slice(-1)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              {cpuInfo?.cpu_percent_per_core?.map((_, index) => (
                <Bar 
                  key={index} 
                  dataKey={`core_${index}`} 
                  fill={`hsl(${index * 30}, 70%, 60%)`}
                  name={`Core ${index + 1}`}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default CpuDetails; 