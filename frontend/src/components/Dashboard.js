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
    <div className="p-8 max-w-7xl mx-auto space-y-10 fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">
            System Overseer
          </h1>
          <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
            Infrastructure nodes are performing at optimal levels
          </p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-2xl border border-white/20 dark:border-gray-700/30 text-xs font-medium text-gray-500">
          <Clock className="h-3.5 w-3.5" />
          Last synced: {lastUpdate?.toLocaleTimeString()}
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CPU Card */}
        <div className="metric-card group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Cpu className="h-24 w-24 text-blue-600" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-blue-500/10 rounded-xl">
                <Cpu className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">Processor</span>
            </div>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-4xl font-black text-gray-900 dark:text-white">
                {summary?.cpu_percent?.toFixed(1) || 0}
              </span>
              <span className="text-xl font-bold text-gray-400">%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ 
                  width: `${summary?.cpu_percent || 0}%`,
                  background: 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Memory Card */}
        <div className="metric-card group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Database className="h-24 w-24 text-emerald-600" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                <Database className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">Memory</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-black text-gray-900 dark:text-white">
                {summary?.memory_percent?.toFixed(1) || 0}
              </span>
              <span className="text-xl font-bold text-gray-400">%</span>
            </div>
            <div className="text-[10px] font-semibold text-gray-400 mb-4 uppercase tracking-tighter">
              {formatBytes(summary?.memory_used || 0)} OF {formatBytes(summary?.memory_total || 0)} USED
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ 
                  width: `${summary?.memory_percent || 0}%`,
                  background: 'linear-gradient(90deg, #10b981, #34d399)'
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Disk Card */}
        <div className="metric-card group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <HardDrive className="h-24 w-24 text-violet-600" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-violet-500/10 rounded-xl">
                <HardDrive className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">Storage</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-black text-gray-900 dark:text-white">
                {(() => {
                  const diskData = Object.values(summary?.disk_usage || {})[0];
                  return diskData?.percent?.toFixed(1) || 0;
                })()}
              </span>
              <span className="text-xl font-bold text-gray-400">%</span>
            </div>
            <div className="text-[10px] font-semibold text-gray-400 mb-4 uppercase tracking-tighter">
               PRIMARY VOLUME STATUS
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ 
                  width: `${(() => {
                    const diskData = Object.values(summary?.disk_usage || {})[0];
                    return diskData?.percent || 0;
                  })()}%`,
                  background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)'
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Network Card */}
        <div className="metric-card group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Network className="h-24 w-24 text-amber-600" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-amber-500/10 rounded-xl">
                <Network className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">Traffic</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Inbound</span>
                  <span className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                    {formatBytes(summary?.network_bytes_recv || 0)}
                  </span>
                </div>
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-800" />
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Outbound</span>
                  <span className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                    {formatBytes(summary?.network_bytes_sent || 0)}
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-amber-500/10 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 w-2/3 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Extended Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="glass-card flex flex-col">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Control Center
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <button className="btn-secondary group">
              <TrendingUp className="h-4 w-4 mr-2 text-blue-500 group-hover:scale-125 transition-transform" />
              Analyze Performance
            </button>
            <button className="btn-secondary group text-left">
               Secure Export
            </button>
            <button className="btn-secondary group text-left">
               Node Logs
            </button>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="glass-card lg:col-span-2">
           <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            Infrastructure Status
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'CPU Cluster', status: 'Optimal', color: 'text-emerald-500' },
              { label: 'RAM Sync', status: 'Stable', color: 'text-emerald-500' },
              { label: 'Disk Array', status: 'Active', color: 'text-blue-500' },
              { label: 'Net Interface', status: 'Online', color: 'text-emerald-500' },
            ].map((node, i) => (
              <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800/20 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{node.label}</p>
                <div className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${node.color.replace('text', 'bg')} animate-pulse`} />
                  <span className={`text-sm font-bold ${node.color}`}>{node.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 