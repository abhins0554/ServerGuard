import React, { useState, useEffect } from 'react';
import { Activity, Search, RefreshCw, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { systemAPI } from '../services/api';

const ProcessDetails = () => {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('cpu_percent');
  const [sortDirection, setSortDirection] = useState('desc');
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProcesses, setTotalProcesses] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const fetchProcesses = async (page = currentPage, limit = pageSize, sortBy = sortField, sortOrder = sortDirection) => {
    try {
      setLoading(true);
      const data = await systemAPI.getProcesses(page, limit, sortBy, sortOrder);
      setProcesses(data.processes);
      setTotalPages(data.pagination.pages);
      setTotalProcesses(data.pagination.total);
      setLastUpdate(new Date());
      setError('');
    } catch (err) {
      setError('Failed to fetch process data');
      console.error('Error fetching processes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();

    // Set up auto-refresh if enabled
    let intervalId;
    if (isAutoRefresh) {
      intervalId = setInterval(() => {
        fetchProcesses();
      }, refreshInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAutoRefresh, refreshInterval, currentPage, pageSize, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending for numeric values
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const formatMemory = (memPercent) => {
    return memPercent ? `${memPercent.toFixed(1)}%` : 'N/A';
  };

  const formatCpu = (cpuPercent) => {
    return cpuPercent ? `${cpuPercent.toFixed(1)}%` : 'N/A';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const filteredProcesses = processes.filter(process => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (process.name && process.name.toLowerCase().includes(term)) ||
      (process.pid && process.pid.toString().includes(term)) ||
      (process.username && process.username.toLowerCase().includes(term))
    );
  });

  if (loading && processes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error && processes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">{error}</div>
          <button onClick={() => fetchProcesses()} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Process Monitor</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <Activity className="h-4 w-4" />
          <span>Real-time process monitoring</span>
          {lastUpdate && (
            <>
              <span>•</span>
              <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between mb-6 space-y-4 md:space-y-0">
        <div className="relative w-full md:w-1/3">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            className="pl-10 input-field"
            placeholder="Search processes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={isAutoRefresh}
              onChange={() => setIsAutoRefresh(!isAutoRefresh)}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-blue-600 focus:ring-blue-500/50"
            />
            <label htmlFor="autoRefresh" className="text-sm text-gray-700 dark:text-gray-300">Auto-refresh</label>
          </div>

          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="text-sm rounded-md px-2 py-1.5 border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-950/60 text-foreground disabled:opacity-50"
            disabled={!isAutoRefresh}
          >
            <option value={2000}>2 seconds</option>
            <option value={5000}>5 seconds</option>
            <option value={10000}>10 seconds</option>
            <option value={30000}>30 seconds</option>
          </select>

          <button
            onClick={() => fetchProcesses()}
            className="flex items-center space-x-1 btn-secondary py-1 px-3"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalProcesses)} of {totalProcesses} processes
          </span>
          
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="text-sm rounded-md px-2 py-1.5 border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-950/60 text-foreground"
          >
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value={200}>200 per page</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Process Table */}
      <div className="rounded-2xl overflow-hidden border border-gray-200/80 dark:border-gray-800/80 bg-white/80 dark:bg-gray-950/40 shadow-md backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/70">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('pid')}
                >
                  <div className="flex items-center space-x-1">
                    <span>PID</span>
                    {getSortIcon('pid')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Name</span>
                    {getSortIcon('name')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('username')}
                >
                  <div className="flex items-center space-x-1">
                    <span>User</span>
                    {getSortIcon('username')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('cpu_percent')}
                >
                  <div className="flex items-center space-x-1">
                    <span>CPU</span>
                    {getSortIcon('cpu_percent')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('memory_percent')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Memory</span>
                    {getSortIcon('memory_percent')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    {getSortIcon('status')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('create_time')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Started</span>
                    {getSortIcon('create_time')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/80 dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-700">
              {loading && processes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading processes...
                  </td>
                </tr>
              ) : filteredProcesses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No processes found
                  </td>
                </tr>
              ) : (
                filteredProcesses.map((process) => (
                  <tr key={process.pid} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {process.pid}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {process.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {process.username || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center">
                        <div className="w-16">{formatCpu(process.cpu_percent)}</div>
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full"
                            style={{ width: `${Math.min(process.cpu_percent || 0, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center">
                        <div className="w-16">{formatMemory(process.memory_percent)}</div>
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-green-600 dark:bg-green-500 h-2 rounded-full"
                            style={{ width: `${Math.min(process.memory_percent || 0, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        process.status === 'running'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/45 dark:text-green-300'
                          : process.status === 'sleeping'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/45 dark:text-blue-300'
                          : process.status === 'stopped'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/45 dark:text-red-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800/80 dark:text-gray-300'
                      }`}>
                        {process.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(process.create_time)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process Count */}
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredProcesses.length} of {processes.length} processes on this page
      </div>
    </div>
  );
};

export default ProcessDetails;