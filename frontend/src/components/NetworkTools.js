import React, { useState, useEffect, useRef } from 'react';
import { Network, Activity, Search, Eye, Copy, CheckCircle, XCircle, AlertCircle, Wifi, RefreshCw, Scan, ExternalLink, X, Server, Clock, TrendingUp, Shield } from 'lucide-react';
import { networkToolsAPI } from '../services/api';

const NetworkTools = () => {
  const [activeTab, setActiveTab] = useState('ping');
  const [pingHost, setPingHost] = useState('');
  const [pingCount, setPingCount] = useState(4);
  const [pingResult, setPingResult] = useState(null);
  const [pingLoading, setPingLoading] = useState(false);

  const [tracerouteHost, setTracerouteHost] = useState('');
  const [tracerouteResult, setTracerouteResult] = useState(null);
  const [tracerouteLoading, setTracerouteLoading] = useState(false);

  const [scanHost, setScanHost] = useState('');
  const [scanPorts, setScanPorts] = useState('80,443,8080,8000');
  const [scanResult, setScanResult] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);

  const [connections, setConnections] = useState(null);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  const [devices, setDevices] = useState(null);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceDetails, setDeviceDetails] = useState(null);
  const [deviceDetailsLoading, setDeviceDetailsLoading] = useState(false);
  const [devicePortScan, setDevicePortScan] = useState(null);
  const [devicePortScanLoading, setDevicePortScanLoading] = useState(false);
  const [deviceDetailsTab, setDeviceDetailsTab] = useState('info'); // 'info', 'ports', 'connections', 'monitor'
  const [monitoringInterval, setMonitoringInterval] = useState(null);
  const monitoringIntervalRef = useRef(null);

  const handlePing = async () => {
    if (!pingHost.trim()) return;
    setPingLoading(true);
    setPingResult(null);
    try {
      const result = await networkToolsAPI.ping(pingHost, pingCount);
      setPingResult(result);
    } catch (error) {
      setPingResult({ success: false, error: error.response?.data?.detail || error.message });
    } finally {
      setPingLoading(false);
    }
  };

  const handleTraceroute = async () => {
    if (!tracerouteHost.trim()) return;
    setTracerouteLoading(true);
    setTracerouteResult(null);
    try {
      const result = await networkToolsAPI.traceroute(tracerouteHost);
      setTracerouteResult(result);
    } catch (error) {
      setTracerouteResult({ success: false, error: error.response?.data?.detail || error.message });
    } finally {
      setTracerouteLoading(false);
    }
  };

  const handlePortScan = async () => {
    if (!scanHost.trim() || !scanPorts.trim()) return;
    setScanLoading(true);
    setScanResult(null);
    try {
      const result = await networkToolsAPI.portScan(scanHost, scanPorts);
      setScanResult(result);
    } catch (error) {
      setScanResult({ error: error.response?.data?.detail || error.message });
    } finally {
      setScanLoading(false);
    }
  };

  const loadConnections = async () => {
    setConnectionsLoading(true);
    try {
      const result = await networkToolsAPI.getConnections();
      setConnections(result);
    } catch (error) {
      setConnections({ error: error.response?.data?.detail || error.message });
    } finally {
      setConnectionsLoading(false);
    }
  };

  const loadDevices = async () => {
    setDevicesLoading(true);
    try {
      const result = await networkToolsAPI.getNetworkDevices();
      setDevices(result);
    } catch (error) {
      setDevices({ error: error.response?.data?.detail || error.message, devices: [] });
    } finally {
      setDevicesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'devices') {
      loadDevices();
    }
  }, [activeTab]);

  // Cleanup monitoring interval on component unmount
  useEffect(() => {
    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, []);

  const loadDeviceDetails = async (deviceIp) => {
    setDeviceDetailsLoading(true);
    setDeviceDetails(null);
    try {
      const connections = await networkToolsAPI.getDeviceConnections(deviceIp);
      setDeviceDetails({ connections, ip: deviceIp });
    } catch (error) {
      setDeviceDetails({ 
        connections: { error: error.response?.data?.detail || error.message },
        ip: deviceIp 
      });
    } finally {
      setDeviceDetailsLoading(false);
    }
  };

  const scanDeviceAllPorts = async (deviceIp) => {
    setDevicePortScanLoading(true);
    setDevicePortScan(null);
    try {
      // Scan common ports: 1-1024, 8080, 8443, 8000, 3000, 5000, 9000
      const ports = '1-1024,8080,8443,8000,3000,5000,9000';
      const result = await networkToolsAPI.portScan(deviceIp, ports);
      setDevicePortScan(result);
      setDeviceDetailsTab('ports'); // Switch to ports tab
    } catch (error) {
      setDevicePortScan({ error: error.response?.data?.detail || error.message });
    } finally {
      setDevicePortScanLoading(false);
    }
  };

  const scanDeviceFullPorts = async (deviceIp) => {
    setDevicePortScanLoading(true);
    setDevicePortScan(null);
    try {
      // Scan all ports: 1-65535 (this will be limited by backend to 2000 ports max)
      // For full scan, we'll do it in chunks
      const result = await networkToolsAPI.portScan(deviceIp, '1-2000');
      setDevicePortScan(result);
      setDeviceDetailsTab('ports'); // Switch to ports tab
    } catch (error) {
      setDevicePortScan({ error: error.response?.data?.detail || error.message });
    } finally {
      setDevicePortScanLoading(false);
    }
  };

  const startMonitoring = (deviceIp) => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
    }
    // Immediately load details
    loadDeviceDetails(deviceIp);
    // Then set up interval
    const interval = setInterval(() => {
      loadDeviceDetails(deviceIp);
    }, 5000); // Refresh every 5 seconds
    setMonitoringInterval(interval);
    monitoringIntervalRef.current = interval;
    setDeviceDetailsTab('monitor'); // Switch to monitor tab
  };

  const stopMonitoring = () => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
    setMonitoringInterval(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const tabs = [
    { id: 'ping', label: 'Ping', icon: Activity },
    { id: 'traceroute', label: 'Traceroute', icon: Network },
    { id: 'portscan', label: 'Port Scanner', icon: Search },
    { id: 'devices', label: 'Connected Devices', icon: Wifi },
    { id: 'connections', label: 'Connections', icon: Eye },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
        <div className="flex items-center space-x-3">
          <Network className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Network Tools</h1>
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
                onClick={() => setActiveTab(tab.id)}
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
        {/* Ping Tab */}
        {activeTab === 'ping' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Ping Test</h2>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Host</label>
                  <input
                    type="text"
                    value={pingHost}
                    onChange={(e) => setPingHost(e.target.value)}
                    placeholder="example.com or 192.168.1.1"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handlePing()}
                  />
                </div>
                <div className="w-full sm:w-32">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Count</label>
                  <input
                    type="number"
                    value={pingCount}
                    onChange={(e) => setPingCount(parseInt(e.target.value) || 4)}
                    min="1"
                    max="10"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handlePing}
                    disabled={pingLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pingLoading ? 'Pinging...' : 'Ping'}
                  </button>
                </div>
              </div>

              {pingResult && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${pingResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {pingResult.success ? 'Success' : 'Failed'}
                    </span>
                    {pingResult.output && (
                      <button
                        onClick={() => copyToClipboard(pingResult.output)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center space-x-1"
                      >
                        <Copy className="h-4 w-4" />
                        <span>Copy</span>
                      </button>
                    )}
                  </div>
                  <pre className="bg-gray-900 dark:bg-gray-950 text-green-400 dark:text-green-300 p-4 rounded-lg overflow-auto text-sm font-mono border border-gray-700 dark:border-gray-600">
                    {pingResult.output || pingResult.error || 'No output'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Traceroute Tab */}
        {activeTab === 'traceroute' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Traceroute</h2>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Host</label>
                  <input
                    type="text"
                    value={tracerouteHost}
                    onChange={(e) => setTracerouteHost(e.target.value)}
                    placeholder="example.com or 192.168.1.1"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleTraceroute()}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleTraceroute}
                    disabled={tracerouteLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {tracerouteLoading ? 'Tracing...' : 'Trace'}
                  </button>
                </div>
              </div>

              {tracerouteResult && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${tracerouteResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {tracerouteResult.success ? 'Success' : 'Failed'}
                    </span>
                    {tracerouteResult.output && (
                      <button
                        onClick={() => copyToClipboard(tracerouteResult.output)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center space-x-1"
                      >
                        <Copy className="h-4 w-4" />
                        <span>Copy</span>
                      </button>
                    )}
                  </div>
                  <pre className="bg-gray-900 dark:bg-gray-950 text-green-400 dark:text-green-300 p-4 rounded-lg overflow-auto text-sm font-mono border border-gray-700 dark:border-gray-600">
                    {tracerouteResult.output || tracerouteResult.error || 'No output'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Port Scanner Tab */}
        {activeTab === 'portscan' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Port Scanner</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Host</label>
                <input
                  type="text"
                  value={scanHost}
                  onChange={(e) => setScanHost(e.target.value)}
                  placeholder="192.168.1.1"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                />
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ports (comma-separated or range: 80,443,8000-8010)</label>
                <input
                  type="text"
                  value={scanPorts}
                  onChange={(e) => setScanPorts(e.target.value)}
                  placeholder="80,443,8000-8010"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                />
                <button
                  onClick={handlePortScan}
                  disabled={scanLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {scanLoading ? 'Scanning...' : 'Scan Ports'}
                </button>
              </div>

              {scanResult && (
                <div className="mt-4">
                  {scanResult.error ? (
                    <div className="text-red-600 dark:text-red-400">{scanResult.error}</div>
                  ) : (
                    <>
                      <div className="mb-4 text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">Host: </span>
                        <span className="text-gray-700 dark:text-gray-300">{scanResult.host}</span>
                        <span className="ml-4 font-medium text-gray-900 dark:text-white">Total Ports: </span>
                        <span className="text-gray-700 dark:text-gray-300">{scanResult.total_ports}</span>
                        <span className="ml-4 font-medium text-gray-900 dark:text-white">Open Ports: </span>
                        <span className="text-green-600 dark:text-green-400 font-semibold">{scanResult.open_ports?.length || 0}</span>
                      </div>
                      {scanResult.open_ports && scanResult.open_ports.length > 0 && (
                        <div className="mb-4">
                          <h3 className="font-medium mb-2 text-gray-900 dark:text-white">Open Ports:</h3>
                          <div className="flex flex-wrap gap-2">
                            {scanResult.open_ports.map((port) => (
                              <span key={port} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                                {port}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="overflow-auto max-h-96">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Port</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {scanResult.results?.map((result, idx) => (
                              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{result.port}</td>
                                <td className="px-4 py-3 text-sm">
                                  {result.status === 'open' ? (
                                    <span className="flex items-center text-green-600 dark:text-green-400">
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Open
                                    </span>
                                  ) : (
                                    <span className="flex items-center text-red-600 dark:text-red-400">
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Closed
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Connected Devices Tab */}
        {activeTab === 'devices' && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Connected Devices</h2>
                <button
                  onClick={loadDevices}
                  disabled={devicesLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`h-4 w-4 ${devicesLoading ? 'animate-spin' : ''}`} />
                  <span>{devicesLoading ? 'Scanning...' : 'Refresh'}</span>
                </button>
              </div>

              {devicesLoading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">Scanning network for devices...</div>
              ) : devices && devices.error ? (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warning</h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">{devices.error}</p>
                    </div>
                  </div>
                </div>
              ) : devices && devices.devices && devices.devices.length > 0 ? (
                <>
                  <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    Found {devices.total || devices.devices.length} device{devices.total !== 1 ? 's' : ''} on the network
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            IP Address
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Hostname
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                            MAC Address
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {devices.devices.map((device, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 sm:px-6 py-4 text-sm font-mono text-gray-900 dark:text-gray-100">
                              {device.ip}
                            </td>
                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                      {device.identifier || device.hostname || (device.mac && device.mac !== 'Unknown' ? `Device (${device.mac})` : '-')}
                                    </td>
                            <td className="px-4 sm:px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                              {device.mac || '-'}
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-sm">
                              <span className="px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                {device.status || 'active'}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-sm">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => {
                                    setPingHost(device.ip);
                                    setActiveTab('ping');
                                  }}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-xs sm:text-sm"
                                >
                                  Ping
                                </button>
                                        <button
                                          onClick={() => {
                                            setSelectedDevice(device);
                                            setDeviceDetailsTab('ports'); // Switch to ports tab in modal
                                            scanDeviceAllPorts(device.ip); // Trigger inline port scan
                                          }}
                                          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium text-xs sm:text-sm"
                                        >
                                          Port Scan
                                        </button>
                                <button
                                  onClick={() => {
                                    setSelectedDevice(device);
                                    loadDeviceDetails(device.ip);
                                  }}
                                  className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium text-xs sm:text-sm"
                                >
                                  Details
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No devices found. Click Refresh to scan the network.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Device Details Modal */}
        {selectedDevice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Device Details</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedDevice.ip}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedDevice.identifier || selectedDevice.hostname || (selectedDevice.mac && selectedDevice.mac !== 'Unknown' ? `Device (${selectedDevice.mac})` : 'Unknown Device')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    stopMonitoring();
                    setSelectedDevice(null);
                    setDeviceDetails(null);
                    setDevicePortScan(null);
                    setDeviceDetailsTab('info');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Device Details Tabs */}
              <div className="border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6">
                <div className="flex space-x-1 overflow-x-auto">
                  <button
                    onClick={() => setDeviceDetailsTab('info')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      deviceDetailsTab === 'info'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Server className="h-4 w-4 inline mr-1" />
                    Info
                  </button>
                  <button
                    onClick={() => setDeviceDetailsTab('ports')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      deviceDetailsTab === 'ports'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Scan className="h-4 w-4 inline mr-1" />
                    Ports
                  </button>
                  <button
                    onClick={() => {
                      setDeviceDetailsTab('connections');
                      if (selectedDevice) loadDeviceDetails(selectedDevice.ip);
                    }}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      deviceDetailsTab === 'connections'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Network className="h-4 w-4 inline mr-1" />
                    Connections
                  </button>
                  <button
                    onClick={() => {
                      if (monitoringInterval) {
                        stopMonitoring();
                      } else {
                        startMonitoring(selectedDevice.ip);
                      }
                    }}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      deviceDetailsTab === 'monitor'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Activity className="h-4 w-4 inline mr-1" />
                    {monitoringInterval ? 'Monitoring...' : 'Monitor'}
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-auto p-4 sm:p-6">
                {deviceDetailsLoading && deviceDetailsTab === 'info' ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading device details...</div>
                ) : (
                  <div className="space-y-4">
                    {/* Device Info Tab */}
                    {deviceDetailsTab === 'info' && (
                      <>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                            <Server className="h-4 w-4 mr-2" />
                            Device Information
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">IP Address:</span>
                              <span className="ml-2 font-mono text-gray-900 dark:text-white">{selectedDevice.ip}</span>
                            </div>
                            {selectedDevice.mac && selectedDevice.mac !== 'Unknown' && (
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">MAC Address:</span>
                                <span className="ml-2 font-mono text-gray-900 dark:text-white">{selectedDevice.mac}</span>
                              </div>
                            )}
                            {(selectedDevice.hostname || selectedDevice.identifier) && (
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Hostname/Identifier:</span>
                                <span className="ml-2 text-gray-900 dark:text-white">{selectedDevice.identifier || selectedDevice.hostname}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Status:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">{selectedDevice.status || 'active'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Quick Actions</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                              onClick={() => scanDeviceAllPorts(selectedDevice.ip)}
                              disabled={devicePortScanLoading}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              <Scan className="h-4 w-4 mr-2" />
                              {devicePortScanLoading ? 'Scanning...' : 'Scan Common Ports'}
                            </button>
                            <button
                              onClick={() => scanDeviceFullPorts(selectedDevice.ip)}
                              disabled={devicePortScanLoading}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              {devicePortScanLoading ? 'Scanning...' : 'Full Port Scan (1-65535)'}
                            </button>
                            <button
                              onClick={() => {
                                setDeviceDetailsTab('connections');
                                loadDeviceDetails(selectedDevice.ip);
                              }}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center"
                            >
                              <Network className="h-4 w-4 mr-2" />
                              View Connections
                            </button>
                            <button
                              onClick={() => startMonitoring(selectedDevice.ip)}
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center"
                            >
                              <Activity className="h-4 w-4 mr-2" />
                              Start Monitoring
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Port Scan Tab */}
                    {deviceDetailsTab === 'ports' && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                            <Scan className="h-4 w-4 mr-2" />
                            Port Scan Results
                          </h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => scanDeviceAllPorts(selectedDevice.ip)}
                              disabled={devicePortScanLoading}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors disabled:opacity-50"
                            >
                              {devicePortScanLoading ? 'Scanning...' : 'Rescan Common'}
                            </button>
                            <button
                              onClick={() => scanDeviceFullPorts(selectedDevice.ip)}
                              disabled={devicePortScanLoading}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors disabled:opacity-50"
                            >
                              {devicePortScanLoading ? 'Scanning...' : 'Full Scan'}
                            </button>
                          </div>
                        </div>

                        {devicePortScanLoading ? (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                            Scanning ports... This may take a while for full scans.
                          </div>
                        ) : devicePortScan && devicePortScan.error ? (
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                              <div>
                                <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h4>
                                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{devicePortScan.error}</p>
                              </div>
                            </div>
                          </div>
                        ) : devicePortScan && devicePortScan.open_ports ? (
                          <div className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Total Ports:</span>
                                  <span className="ml-2 font-semibold text-gray-900 dark:text-white">{devicePortScan.total_ports || 0}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Scanned:</span>
                                  <span className="ml-2 font-semibold text-gray-900 dark:text-white">{devicePortScan.total_ports || 0}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Open Ports:</span>
                                  <span className="ml-2 font-semibold text-green-600 dark:text-green-400">{devicePortScan.open_ports.length || 0}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Closed:</span>
                                  <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                    {(devicePortScan.total_ports || 0) - (devicePortScan.open_ports.length || 0)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {devicePortScan.open_ports && devicePortScan.open_ports.length > 0 ? (
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Open Ports:</h4>
                                <div className="flex flex-wrap gap-2">
                                  {devicePortScan.open_ports.map((port) => (
                                    <span 
                                      key={port} 
                                      className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium"
                                    >
                                      {port}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                No open ports found.
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            No port scan results. Click "Scan Common Ports" or "Full Port Scan" to start.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Connections Tab */}
                    {deviceDetailsTab === 'connections' && deviceDetails && deviceDetails.connections && (
                      <>
                        {/* Outbound IPs Summary */}
                        {deviceDetails.connections.outbound_ips && deviceDetails.connections.outbound_ips.length > 0 && (
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                              <TrendingUp className="h-4 w-4 mr-2" />
                              Device is Connecting To ({deviceDetails.connections.outbound_count || 0} unique IPs)
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {deviceDetails.connections.outbound_ips.map((item, idx) => (
                                <div key={idx} className="bg-white dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-700">
                                  <div className="font-mono text-sm text-gray-900 dark:text-white">{item.ip}</div>
                                  {item.hostname && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400">{item.hostname}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Network Connections */}
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Active Connections ({deviceDetails.connections.total || 0})
                          </h3>
                          {deviceDetails.connections.error ? (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                              <div className="flex items-start space-x-3">
                                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                                <div>
                                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warning</h4>
                                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                    {deviceDetails.connections.error}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : deviceDetails.connections.connections && deviceDetails.connections.connections.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Direction</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Local Address</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Remote Address / Domain</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">PID</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                  {deviceDetails.connections.connections.map((conn, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                      <td className="px-4 py-3 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                          conn.direction === 'outbound' 
                                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                                        }`}>
                                          {conn.direction === 'outbound' ? '→ Out' : '← In'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                                        {conn.local_address || '-'}
                                      </td>
                                      <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                                        {conn.remote_address || '-'}
                                      </td>
                                      <td className="px-4 py-3 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                          conn.status === 'ESTABLISHED' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                          conn.status === 'LISTEN' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                                          conn.status === 'TIME_WAIT' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                          'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                        }`}>
                                          {conn.status || '-'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                        {conn.type || '-'}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                        {conn.pid || '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              No active connections found for this device.
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Real-time Monitoring Tab */}
                    {deviceDetailsTab === 'monitor' && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                            <Activity className="h-4 w-4 mr-2" />
                            Real-time Network Monitoring
                            {monitoringInterval && (
                              <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs">
                                Active
                              </span>
                            )}
                          </h3>
                          {monitoringInterval ? (
                            <button
                              onClick={stopMonitoring}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                            >
                              Stop Monitoring
                            </button>
                          ) : (
                            <button
                              onClick={() => startMonitoring(selectedDevice.ip)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                            >
                              Start Monitoring
                            </button>
                          )}
                        </div>

                        {deviceDetails && deviceDetails.connections ? (
                          <div className="space-y-4">
                            {deviceDetails.connections.outbound_ips && deviceDetails.connections.outbound_ips.length > 0 && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                                  <TrendingUp className="h-4 w-4 mr-2" />
                                  Active Connections To ({deviceDetails.connections.outbound_count || 0} IPs)
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                                  {deviceDetails.connections.outbound_ips.map((item, idx) => (
                                    <div key={idx} className="bg-white dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-700">
                                      <div className="font-mono text-sm text-gray-900 dark:text-white">{item.ip}</div>
                                      {item.hostname && (
                                        <div className="text-xs text-gray-600 dark:text-gray-400">{item.hostname}</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Total Connections:</span>
                                  <span className="ml-2 font-semibold text-gray-900 dark:text-white">{deviceDetails.connections.total || 0}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Outbound IPs:</span>
                                  <span className="ml-2 font-semibold text-blue-600 dark:text-blue-400">{deviceDetails.connections.outbound_count || 0}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Last Update:</span>
                                  <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                    {new Date().toLocaleTimeString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                                  <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
                                    {monitoringInterval ? 'Monitoring' : 'Stopped'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {deviceDetails.connections.connections && deviceDetails.connections.connections.length > 0 && (
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                  <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Direction</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Remote IP</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Port</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {deviceDetails.connections.connections.slice(0, 20).map((conn, idx) => (
                                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 text-sm">
                                          <span className={`px-2 py-1 rounded-full text-xs ${
                                            conn.direction === 'outbound' 
                                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                                          }`}>
                                            {conn.direction === 'outbound' ? '→' : '←'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                                          {conn.remote_ip || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                          {conn.remote_port || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                          <span className={`px-2 py-1 rounded-full text-xs ${
                                            conn.status === 'ESTABLISHED' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                          }`}>
                                            {conn.status || '-'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {deviceDetails.connections.connections.length > 20 && (
                                  <div className="text-center py-2 text-sm text-gray-500 dark:text-gray-400">
                                    Showing first 20 of {deviceDetails.connections.connections.length} connections
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            {monitoringInterval ? 'Loading connection data...' : 'Click "Start Monitoring" to begin tracking network activity'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Connections Tab */}
        {activeTab === 'connections' && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Network Connections</h2>
                <button
                  onClick={loadConnections}
                  disabled={connectionsLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connectionsLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {connections && (
                <div className="overflow-auto">
                  {connections.error ? (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                        <div>
                          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warning</h3>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">{connections.error}</p>
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                            On macOS, viewing network connections requires elevated privileges. 
                            You may need to run the server with sudo, or this feature may be limited.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : connections.connections && connections.connections.length > 0 ? (
                    <>
                      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                        Total Connections: {connections.total || 0}
                      </div>
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">PID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Local Address</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Remote Address</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {connections.connections.map((conn, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{conn.pid || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-mono">{conn.local_address || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-mono">{conn.remote_address || '-'}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  conn.status === 'ESTABLISHED' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                                  conn.status === 'LISTEN' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                                  'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                }`}>
                                  {conn.status || '-'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{conn.type || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No connections found or unable to retrieve connections.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkTools;

