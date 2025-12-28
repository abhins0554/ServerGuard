import React, { useState, useEffect } from 'react';
import { Package, Container, FileText, BarChart3, RefreshCw, Eye, Play, Square, RotateCcw, Trash2 } from 'lucide-react';
import { dockerAPI } from '../services/api';

const DockerManagement = () => {
  const [activeTab, setActiveTab] = useState('containers');
  const [containers, setContainers] = useState([]);
  const [images, setImages] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [logs, setLogs] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [dockerAvailable, setDockerAvailable] = useState(true);
  const [dockerError, setDockerError] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState(null);

  useEffect(() => {
    if (activeTab === 'containers') {
      loadContainers();
    } else if (activeTab === 'images') {
      loadImages();
    }
  }, [activeTab]);

  const loadContainers = async () => {
    setLoading(true);
    setDockerError(null);
    try {
      const result = await dockerAPI.getContainers(true);
      setDockerAvailable(result.available);
      if (result.available) {
        setContainers(result.containers || []);
      } else {
        setDockerError(result.error || "Docker is not available");
      }
    } catch (error) {
      setDockerAvailable(false);
      setDockerError(error.response?.data?.detail || error.message || "Failed to connect to Docker");
    } finally {
      setLoading(false);
    }
  };

  const loadImages = async () => {
    setLoading(true);
    setDockerError(null);
    try {
      const result = await dockerAPI.getImages();
      setDockerAvailable(result.available);
      if (result.available) {
        setImages(result.images || []);
      } else {
        setDockerError(result.error || "Docker is not available");
      }
    } catch (error) {
      setDockerAvailable(false);
      setDockerError(error.response?.data?.detail || error.message || "Failed to connect to Docker");
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (containerId) => {
    setLoading(true);
    setLogs(null);
    setActiveSubTab('logs');
    try {
      const result = await dockerAPI.getContainerLogs(containerId, 200);
      setLogs(result);
    } catch (error) {
      setLogs({ error: error.response?.data?.detail || error.message });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (containerId) => {
    setLoading(true);
    setStats(null);
    setActiveSubTab('stats');
    try {
      const result = await dockerAPI.getContainerStats(containerId);
      setStats(result);
    } catch (error) {
      setStats({ error: error.response?.data?.detail || error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleContainerAction = async (action, containerId, force = false) => {
    setActionLoading(true);
    try {
      let result;
      switch (action) {
        case 'start':
          result = await dockerAPI.startContainer(containerId);
          break;
        case 'stop':
          result = await dockerAPI.stopContainer(containerId);
          break;
        case 'restart':
          result = await dockerAPI.restartContainer(containerId);
          break;
        case 'remove':
          if (!window.confirm(`Are you sure you want to remove container ${containerId.substring(0, 12)}?`)) {
            setActionLoading(false);
            return;
          }
          result = await dockerAPI.removeContainer(containerId, force);
          break;
        default:
          return;
      }
      
      if (result.success) {
        // Reload containers after action
        await loadContainers();
        // If container was removed, clear selection
        if (action === 'remove' && selectedContainer?.id === containerId) {
          setSelectedContainer(null);
          setLogs(null);
          setStats(null);
          setActiveSubTab(null);
        }
      } else {
        alert(result.error || `Failed to ${action} container`);
      }
    } catch (error) {
      alert(error.response?.data?.detail || error.message || `Failed to ${action} container`);
    } finally {
      setActionLoading(false);
    }
  };

  const isContainerRunning = (status) => {
    return status && status.toLowerCase().includes('up');
  };

  if (!dockerAvailable && !loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md mx-auto p-6">
          <Package className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Docker Not Available</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {dockerError || "Docker is not installed or not accessible on this system."}
          </p>
          {dockerError && dockerError.includes("daemon is not running") && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-left mt-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">How to fix:</p>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-1">
                <li>On macOS: Start Docker Desktop application</li>
                <li>On Linux: Run <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">sudo systemctl start docker</code></li>
                <li>On Windows: Start Docker Desktop application</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'containers', label: 'Containers', icon: Container },
    { id: 'images', label: 'Images', icon: Package },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Docker Management</h1>
          </div>
          <button
            onClick={() => activeTab === 'containers' ? loadContainers() : loadImages()}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6">
        <div className="flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedContainer(null);
                  setLogs(null);
                  setStats(null);
                  setActiveSubTab(null);
                }}
                className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {activeTab === 'containers' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
            {/* Containers List */}
            <div className="xl:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Containers ({containers.length})
                </h2>
                <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-auto">
                  {loading ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
                  ) : !dockerAvailable && dockerError ? (
                    <div className="text-center py-8">
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
                        <p className="font-medium mb-2">Error:</p>
                        <p className="text-sm">{dockerError}</p>
                      </div>
                    </div>
                  ) : containers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">No containers found</div>
                  ) : (
                    containers.map((container) => {
                      const isRunning = isContainerRunning(container.status);
                      return (
                        <div
                          key={container.id}
                          onClick={() => setSelectedContainer(container)}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedContainer?.id === container.id
                              ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          <div className="font-medium text-sm truncate text-gray-900 dark:text-white">
                            {container.name || container.id.substring(0, 12)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {container.image}
                          </div>
                          <div className={`text-xs mt-1 font-medium ${
                            isRunning ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {container.status || 'Unknown'}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Container Details */}
            <div className="xl:col-span-2">
              {selectedContainer ? (
                <div className="space-y-4 sm:space-y-6">
                  {/* Container Info */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedContainer.name || selectedContainer.id.substring(0, 12)}
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {isContainerRunning(selectedContainer.status) ? (
                          <>
                            <button
                              onClick={() => handleContainerAction('stop', selectedContainer.id)}
                              disabled={actionLoading}
                              className="flex items-center space-x-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              <Square className="h-4 w-4" />
                              <span>Stop</span>
                            </button>
                            <button
                              onClick={() => handleContainerAction('restart', selectedContainer.id)}
                              disabled={actionLoading}
                              className="flex items-center space-x-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              <RotateCcw className="h-4 w-4" />
                              <span>Restart</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleContainerAction('start', selectedContainer.id)}
                            disabled={actionLoading}
                            className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            <Play className="h-4 w-4" />
                            <span>Start</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleContainerAction('remove', selectedContainer.id, false)}
                          disabled={actionLoading}
                          className="flex items-center space-x-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">ID:</span>
                        <span className="ml-2 font-mono text-xs text-gray-900 dark:text-gray-100 break-all">
                          {selectedContainer.id.substring(0, 12)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Image:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100 break-all">
                          {selectedContainer.image}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Status:</span>
                        <span className={`ml-2 font-medium ${
                          isContainerRunning(selectedContainer.status)
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {selectedContainer.status || 'Unknown'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Ports:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100 break-all">
                          {selectedContainer.ports || '-'}
                        </span>
                      </div>
                      {selectedContainer.created && (
                        <div className="sm:col-span-2">
                          <span className="text-gray-500 dark:text-gray-400">Created:</span>
                          <span className="ml-2 text-gray-900 dark:text-gray-100">
                            {selectedContainer.created}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tabs for Logs/Stats */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6">
                      <div className="flex space-x-1 overflow-x-auto">
                        <button
                          onClick={() => loadLogs(selectedContainer.id)}
                          className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                            activeSubTab === 'logs'
                              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                        >
                          <FileText className="h-4 w-4" />
                          <span>Logs</span>
                        </button>
                        <button
                          onClick={() => loadStats(selectedContainer.id)}
                          className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                            activeSubTab === 'stats'
                              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span>Stats</span>
                        </button>
                      </div>
                    </div>
                    <div className="p-4 sm:p-6">
                      {logs && activeSubTab === 'logs' && (
                        <div>
                          {logs.error ? (
                            <div className="text-red-600 dark:text-red-400">{logs.error}</div>
                          ) : (
                            <pre className="bg-gray-900 dark:bg-gray-950 text-green-400 dark:text-green-300 p-4 rounded-lg overflow-auto text-xs sm:text-sm font-mono max-h-96 border border-gray-700 dark:border-gray-600">
                              {logs.logs || 'No logs available'}
                            </pre>
                          )}
                        </div>
                      )}
                      {stats && activeSubTab === 'stats' && (
                        <div>
                          {stats.error ? (
                            <div className="text-red-600 dark:text-red-400">{stats.error}</div>
                          ) : stats.stats ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">CPU Usage:</span>
                                  <span className="ml-2 text-gray-900 dark:text-gray-100">
                                    {stats.stats.CPUPerc || '-'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Memory Usage:</span>
                                  <span className="ml-2 text-gray-900 dark:text-gray-100">
                                    {stats.stats.MemUsage || '-'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Memory Limit:</span>
                                  <span className="ml-2 text-gray-900 dark:text-gray-100">
                                    {stats.stats.MemLimit || '-'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Network I/O:</span>
                                  <span className="ml-2 text-gray-900 dark:text-gray-100">
                                    {stats.stats.NetIO || '-'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-500 dark:text-gray-400">No stats available</div>
                          )}
                        </div>
                      )}
                      {!logs && !stats && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          Select Logs or Stats to view container information
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
                  <Eye className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400">Select a container to view details</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'images' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Docker Images ({images.length})
            </h2>
            {loading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
            ) : !dockerAvailable && dockerError ? (
              <div className="text-center py-8">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
                  <p className="font-medium mb-2">Error:</p>
                  <p className="text-sm">{dockerError}</p>
                </div>
              </div>
            ) : images.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">No images found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Repository
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Tag
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                        Image ID
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {images.map((image, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          {image.repository}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          {image.tag}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                          {image.image_id.substring(0, 12)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          {image.size}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                          {image.created}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DockerManagement;
