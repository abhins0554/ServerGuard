import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as TerminalIcon, Send, Clipboard, AlertCircle, Wifi, WifiOff, RefreshCw, Folder, Clock, Zap, Shield } from 'lucide-react';
import { systemAPI, wsManager } from '../services/api';

// Platform detection function
const detectPlatform = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('win')) return 'windows';
  if (userAgent.includes('mac')) return 'mac';
  if (userAgent.includes('linux')) return 'linux';
  return 'unknown';
};

// Platform-specific command suggestions
const getPlatformCommands = (platform) => {
  const commands = {
    windows: [
      { name: 'System Information', command: 'systeminfo' },
      { name: 'List Running Processes', command: 'tasklist' },
      { name: 'Network Configuration', command: 'ipconfig /all' },
      { name: 'Disk Space', command: 'wmic logicaldisk get deviceid,volumename,size,freespace' },
      { name: 'Current Directory', command: 'dir' },
      { name: 'System Uptime', command: 'net statistics workstation' },
      { name: 'Memory Usage', command: 'wmic OS get TotalVisibleMemorySize,FreePhysicalMemory' },
      { name: 'CPU Info', command: 'wmic cpu get name,numberofcores,maxclockspeed' },
      { name: 'Service Status', command: 'sc query' },
      { name: 'Change Directory', command: 'cd' },
      { name: 'List Files', command: 'dir' },
      { name: 'Process Tree', command: 'tasklist /v' },
    ],
    mac: [
      { name: 'System Information', command: 'system_profiler SPHardwareDataType' },
      { name: 'List Running Processes', command: 'ps aux' },
      { name: 'Network Configuration', command: 'ifconfig' },
      { name: 'Disk Space', command: 'df -h' },
      { name: 'Current Directory', command: 'pwd' },
      { name: 'System Uptime', command: 'uptime' },
      { name: 'Memory Usage', command: 'vm_stat' },
      { name: 'CPU Info', command: 'sysctl -n machdep.cpu.brand_string' },
      { name: 'Service Status', command: 'launchctl list' },
      { name: 'Change Directory', command: 'cd' },
      { name: 'List Files', command: 'ls -la' },
      { name: 'Process Tree', command: 'ps -ef' },
    ],
    linux: [
      { name: 'System Information', command: 'cat /proc/cpuinfo' },
      { name: 'List Running Processes', command: 'ps aux' },
      { name: 'Network Configuration', command: 'ip addr' },
      { name: 'Disk Space', command: 'df -h' },
      { name: 'Current Directory', command: 'pwd' },
      { name: 'System Uptime', command: 'uptime' },
      { name: 'Memory Usage', command: 'free -h' },
      { name: 'CPU Info', command: 'cat /proc/cpuinfo | grep "model name"' },
      { name: 'Service Status', command: 'systemctl list-units --type=service' },
      { name: 'Change Directory', command: 'cd' },
      { name: 'List Files', command: 'ls -la' },
      { name: 'Process Tree', command: 'ps -ef' },
    ],
    unknown: [
      { name: 'System Information', command: 'uname -a' },
      { name: 'List Running Processes', command: 'ps aux' },
      { name: 'Network Configuration', command: 'ifconfig' },
      { name: 'Disk Space', command: 'df -h' },
      { name: 'Current Directory', command: 'pwd' },
      { name: 'System Uptime', command: 'uptime' },
      { name: 'Memory Usage', command: 'free -h' },
      { name: 'CPU Info', command: 'cat /proc/cpuinfo' },
      { name: 'Service Status', command: 'systemctl status' },
      { name: 'Change Directory', command: 'cd' },
      { name: 'List Files', command: 'ls -la' },
      { name: 'Process Tree', command: 'ps -ef' },
    ]
  };
  
  return commands[platform] || commands.unknown;
};

const Terminal = () => {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionMode, setConnectionMode] = useState('websocket');
  const [currentDirectory, setCurrentDirectory] = useState('');
  const [sessionId] = useState(() => `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [connectionHealth, setConnectionHealth] = useState('disconnected');
  const [lastPing, setLastPing] = useState(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [terminalTheme, setTerminalTheme] = useState('dark');
  
  const terminalRef = useRef(null);
  const inputRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  // Logging function for the component
  const log = (level, message, ...args) => {
    const timestamp = new Date().toISOString();
    console[level](`[${timestamp}] Terminal: ${message}`, ...args);
  };

  // Enhanced scroll to bottom with smooth animation
  const scrollToBottom = useCallback((force = false) => {
    if (terminalRef.current && (autoScroll || force)) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        terminalRef.current.scrollTo({
          top: terminalRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 50);
    }
  }, [autoScroll]);

  // Scroll to bottom when history changes
  useEffect(() => {
    scrollToBottom();
  }, [history, scrollToBottom]);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Connection health monitoring
  useEffect(() => {
    if (isConnected && connectionMode === 'websocket') {
      // Start ping interval
      pingIntervalRef.current = setInterval(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsManager.send(wsRef.current.url, { type: 'ping' });
          setLastPing(Date.now());
        }
      }, 30000); // Ping every 30 seconds

      return () => {
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
      };
    }
  }, [isConnected, connectionMode]);

  // Initialize WebSocket connection with enhanced retry logic
  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let isConnecting = false;
    
    const connectWebSocket = () => {
      if (isConnecting) {
        log('warn', 'Connection attempt already in progress, skipping');
        return;
      }
      
      // Don't connect if already connected and healthy
      if (isConnected && connectionHealth === 'connected') {
        log('info', 'Already connected and healthy, skipping connection attempt');
        return;
      }
      
      isConnecting = true;
      setConnectionHealth('connecting');
      
      try {
        log('info', `Starting WebSocket connection for session: ${sessionId}`);
        
        // Clear any existing reconnect timeout first
        if (reconnectTimeoutRef.current) {
          log('info', 'Clearing existing reconnect timeout');
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        // Only disconnect if we have a different URL or if explicitly reconnecting
        const wsUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}`.replace('http', 'ws') + `/ws/terminal/${sessionId}`;
        if (wsRef.current && wsRef.current.url !== wsUrl) {
          log('info', 'Clearing existing WebSocket connection (different URL)');
          wsManager.disconnect(wsRef.current.url);
        }

        // Don't attempt to reconnect if we've exceeded max attempts
        if (reconnectAttempts >= maxReconnectAttempts) {
          log('warn', 'Max reconnection attempts reached, switching to HTTP mode');
          setConnectionMode('http');
          setIsConnected(true);
          setError('');
          setConnectionHealth('connected');
          isConnecting = false;
          return;
        }

        log('info', `Attempting WebSocket connection (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
        
        wsRef.current = systemAPI.connectTerminalWebSocket(
          sessionId,
          (message) => {
            // Reset reconnect attempts on successful message
            reconnectAttempts = 0;
            isConnecting = false;
            setConnectionHealth('connected');
            log('debug', 'Received WebSocket message:', message.type);
            
            // Handle incoming WebSocket messages
            switch (message.type) {
              case 'output':
                setHistory(prev => [...prev, { 
                  type: 'output', 
                  content: message.data,
                  timestamp: new Date().toISOString()
                }]);
                break;
              case 'error':
                setHistory(prev => [...prev, { 
                  type: 'error', 
                  content: message.data || message.message,
                  timestamp: new Date().toISOString()
                }]);
                break;
              case 'exit':
                setHistory(prev => [...prev, { 
                  type: 'system', 
                  content: `Command exited with code ${message.code}`,
                  timestamp: new Date().toISOString()
                }]);
                setLoading(false);
                break;
              case 'system':
                setHistory(prev => [...prev, { 
                  type: 'system', 
                  content: message.message,
                  timestamp: new Date().toISOString()
                }]);
                break;
              case 'directory':
                setCurrentDirectory(message.path);
                break;
              case 'pong':
                setConnectionHealth('connected');
                break;
              default:
                if (message.message) {
                  setError(message.message);
                  setLoading(false);
                }
                break;
            }
          },
          (error) => {
            log('error', 'WebSocket error:', error);
            setIsConnected(false);
            setConnectionHealth('error');
            isConnecting = false;
            reconnectAttempts++;
            
            if (reconnectAttempts >= maxReconnectAttempts) {
              log('warn', 'WebSocket connection failed. Switching to HTTP mode...');
              setError('WebSocket connection failed. Switching to HTTP mode...');
              setTimeout(() => {
                setConnectionMode('http');
                setIsConnected(true);
                setError('');
                setConnectionHealth('connected');
              }, 2000);
            } else {
              log('warn', `WebSocket connection failed. Attempt ${reconnectAttempts}/${maxReconnectAttempts}. Retrying...`);
              setError(`WebSocket connection failed. Attempt ${reconnectAttempts}/${maxReconnectAttempts}. Retrying...`);
            }
          },
          () => {
            log('info', 'WebSocket connection closed');
            setIsConnected(false);
            setConnectionHealth('disconnected');
            isConnecting = false;
            reconnectAttempts++;
            
            if (reconnectAttempts >= maxReconnectAttempts) {
              log('warn', 'WebSocket connection closed. Switching to HTTP mode...');
              setError('WebSocket connection closed. Switching to HTTP mode...');
              setTimeout(() => {
                setConnectionMode('http');
                setIsConnected(true);
                setError('');
                setConnectionHealth('connected');
              }, 2000);
            } else {
              log('warn', `WebSocket connection closed. Attempt ${reconnectAttempts}/${maxReconnectAttempts}. Retrying...`);
              setError(`WebSocket connection closed. Attempt ${reconnectAttempts}/${maxReconnectAttempts}. Retrying...`);
              
              // Auto-reconnect after delay with exponential backoff
              const delay = Math.min(2000 * Math.pow(2, reconnectAttempts - 1), 10000);
              log('info', `Scheduling reconnect in ${delay}ms`);
              reconnectTimeoutRef.current = setTimeout(() => {
                if (connectionMode === 'websocket') {
                  connectWebSocket();
                }
              }, delay);
            }
          }
        );
        
        log('info', 'WebSocket connection established successfully');
        setIsConnected(true);
        setError('');
        setConnectionMode('websocket');
        setConnectionHealth('connected');
      } catch (err) {
        log('error', 'Failed to connect WebSocket:', err);
        isConnecting = false;
        setConnectionHealth('error');
        reconnectAttempts++;
        
        if (reconnectAttempts >= maxReconnectAttempts) {
          log('warn', 'WebSocket connection failed. Switching to HTTP mode...');
          setError('WebSocket connection failed. Switching to HTTP mode...');
          setTimeout(() => {
            setConnectionMode('http');
            setIsConnected(true);
            setError('');
            setConnectionHealth('connected');
          }, 2000);
        } else {
          log('warn', `Failed to establish WebSocket connection. Attempt ${reconnectAttempts}/${maxReconnectAttempts}. Retrying...`);
          setError(`Failed to establish WebSocket connection. Attempt ${reconnectAttempts}/${maxReconnectAttempts}. Retrying...`);
          
          // Retry after delay
          setTimeout(() => {
            if (connectionMode === 'websocket') {
              connectWebSocket();
            }
          }, 2000);
        }
      }
    };

    log('info', `Initializing Terminal component for session: ${sessionId}`);
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      log('info', 'Cleaning up Terminal component');
      if (wsRef.current) {
        wsManager.disconnect(wsRef.current.url);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [sessionId]); // Remove connectionMode from dependencies to prevent infinite loops

  const executeCommand = async () => {
    if (!command.trim() || !isConnected) {
      log('warn', 'Cannot execute command: empty command or not connected');
      return;
    }
    
    log('info', `Executing command: ${command}`);
    
    // Add command to history
    const timestamp = new Date().toISOString();
    setHistory(prev => [...prev, { 
      type: 'command', 
      content: command, 
      timestamp,
      directory: currentDirectory
    }]);
    
    // Add to command history for up/down navigation
    setCommandHistory(prev => [command, ...prev.filter(cmd => cmd !== command).slice(0, 19)]);
    setHistoryIndex(-1);
    
    // Clear input
    setCommand('');
    
    try {
      setLoading(true);
      setError('');
      
      if (connectionMode === 'websocket' && wsRef.current) {
        log('info', 'Sending command via WebSocket');
        // Send command via WebSocket
        const success = systemAPI.sendTerminalCommand(sessionId, command);
        if (!success) {
          log('warn', 'Failed to send command via WebSocket, falling back to HTTP');
          // Fallback to HTTP if WebSocket send fails
          const result = await systemAPI.executeCommand(command);
          
          if (result.output) {
            setHistory(prev => [...prev, { 
              type: 'output', 
              content: result.output,
              timestamp: new Date().toISOString()
            }]);
          }
          
          if (result.error) {
            setHistory(prev => [...prev, { 
              type: 'error', 
              content: result.error,
              timestamp: new Date().toISOString()
            }]);
          }
          
          setHistory(prev => [...prev, { 
            type: 'system', 
            content: `Command exited with code ${result.exit_code}`,
            timestamp: new Date().toISOString()
          }]);
        }
      } else {
        log('info', 'Executing command via HTTP API');
        // Fallback to HTTP API
        const result = await systemAPI.executeCommand(command);
        
        if (result.output) {
          setHistory(prev => [...prev, { 
            type: 'output', 
            content: result.output,
            timestamp: new Date().toISOString()
          }]);
        }
        
        if (result.error) {
          setHistory(prev => [...prev, { 
            type: 'error', 
            content: result.error,
            timestamp: new Date().toISOString()
          }]);
        }
        
        setHistory(prev => [...prev, { 
          type: 'system', 
          content: `Command exited with code ${result.exit_code}`,
          timestamp: new Date().toISOString()
        }]);
      }
      
    } catch (err) {
      log('error', 'Command execution failed:', err);
      setError(err.message || 'Failed to execute command');
      setHistory(prev => [...prev, { 
        type: 'error', 
        content: `Error: ${err.message || 'Failed to execute command'}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    // Handle Enter key
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand();
    }
    
    // Handle Up arrow for command history
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    }
    
    // Handle Down arrow for command history
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }

    // Handle Ctrl+L to clear terminal
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      clearTerminal();
    }

    // Handle Ctrl+R to reconnect
    if (e.ctrlKey && e.key === 'r') {
      e.preventDefault();
      reconnect();
    }
  };

  const clearTerminal = () => {
    setHistory([]);
    setError('');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => {
        // Success message could be shown here
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };

  const reconnect = () => {
    if (wsRef.current) {
      wsManager.disconnect(wsRef.current.url);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setError('');
    setHistory([]);
    setConnectionMode('websocket');
    setConnectionHealth('connecting');
    // Reconnect will be handled by useEffect
  };

  const switchToHttp = () => {
    setConnectionMode('http');
    setIsConnected(true);
    setError('');
    setConnectionHealth('connected');
  };

  const getConnectionStatusColor = () => {
    switch (connectionHealth) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getPrompt = () => {
    if (currentDirectory) {
      const dirName = currentDirectory.split(/[/\\]/).pop() || currentDirectory;
      return `${dirName}>`;
    }
    return '$';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terminal</h1>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <TerminalIcon className="h-4 w-4" />
            <span>Execute commands on the system</span>
            <div className="flex items-center space-x-1">
              {isConnected ? (
                <>
                  <Wifi className={`h-4 w-4 ${getConnectionStatusColor()}`} />
                  <span className={getConnectionStatusColor()}>
                    Connected ({connectionMode}) - {connectionHealth}
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span className="text-red-600">Disconnected</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isConnected && connectionMode === 'websocket' && (
              <button 
                onClick={reconnect}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reconnect</span>
              </button>
            )}
            {connectionMode === 'http' && (
              <button 
                onClick={reconnect}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Try WebSocket</span>
              </button>
            )}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center space-x-1 text-sm ${autoScroll ? 'text-green-600' : 'text-gray-600'}`}
            >
              <Zap className="h-4 w-4" />
              <span>Auto-scroll</span>
            </button>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      {connectionMode === 'http' && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <Wifi className="h-4 w-4 text-blue-500 mr-2" />
            <span className="text-blue-700 text-sm">
              Using HTTP mode. Commands will execute but real-time output is not available.
              <button onClick={switchToHttp} className="ml-2 text-blue-600 hover:text-blue-800 underline">
                Switch to WebSocket
              </button>
            </span>
          </div>
        </div>
      )}

      {/* Terminal Window */}
      <div className={`bg-gray-900 rounded-lg shadow-lg overflow-hidden ${terminalTheme === 'dark' ? 'terminal-dark' : 'terminal-light'}`}>
        {/* Terminal Header */}
        <div className="bg-gray-800 px-4 py-2 flex justify-between items-center">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="text-gray-400 text-sm flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>{connectionMode === 'websocket' ? 'Real-time Terminal' : 'HTTP Terminal'}</span>
            {currentDirectory && (
              <>
                <Folder className="h-4 w-4" />
                <span className="text-xs">{currentDirectory}</span>
              </>
            )}
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={clearTerminal}
              className="text-gray-400 hover:text-white text-sm"
            >
              Clear
            </button>
          </div>
        </div>
        
        {/* Terminal Output */}
        <div 
          ref={terminalRef}
          className="p-4 h-96 overflow-y-auto font-mono text-sm text-gray-300 bg-gray-900"
          onScroll={(e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.target;
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
            setAutoScroll(isAtBottom);
          }}
        >
          {history.length === 0 ? (
            <div className="text-gray-500 italic">
              {isConnected 
                ? "Type a command and press Enter to execute. Use up/down arrows to navigate command history. Ctrl+L to clear, Ctrl+R to reconnect."
                : "Connecting to terminal..."
              }
            </div>
          ) : (
            history.map((item, index) => (
              <div key={index} className="mb-2">
                {item.type === 'command' && (
                  <div className="flex items-start group">
                    <span className="text-green-400 mr-2">{getPrompt()}</span>
                    <span className="text-white">{item.content}</span>
                    <button 
                      onClick={() => copyToClipboard(item.content)}
                      className="ml-2 text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Clipboard className="h-4 w-4" />
                    </button>
                    {item.timestamp && (
                      <span className="ml-2 text-gray-600 text-xs flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTimestamp(item.timestamp)}
                      </span>
                    )}
                  </div>
                )}
                
                {item.type === 'output' && (
                  <div className="pl-4 whitespace-pre-wrap group">
                    {item.content}
                    <button 
                      onClick={() => copyToClipboard(item.content)}
                      className="ml-2 text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Clipboard className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                {item.type === 'error' && (
                  <div className="pl-4 text-red-400 whitespace-pre-wrap group">
                    {item.content}
                    <button 
                      onClick={() => copyToClipboard(item.content)}
                      className="ml-2 text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Clipboard className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                {item.type === 'system' && (
                  <div className="pl-4 text-yellow-400 italic">
                    {item.content}
                  </div>
                )}
              </div>
            ))
          )}
          
          {loading && (
            <div className="pl-4 text-gray-400 animate-pulse">
              Executing command...
            </div>
          )}
          
          {error && (
            <div className="flex items-center pl-4 text-red-400">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          )}
        </div>
        
        {/* Command Input */}
        <div className="border-t border-gray-700 p-4 flex items-center">
          <span className="text-green-400 mr-2">{getPrompt()}</span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white outline-none font-mono"
            placeholder={isConnected ? "Type a command..." : "Connecting..."}
            disabled={loading || !isConnected}
          />
          <button
            onClick={executeCommand}
            disabled={loading || !command.trim() || !isConnected}
            className="ml-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Command Suggestions */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Suggested Commands ({detectPlatform()})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getPlatformCommands(detectPlatform()).map((suggestion, index) => (
            <button
              key={index}
              onClick={() => setCommand(suggestion.command)}
              disabled={!isConnected}
              className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="font-medium text-gray-900">{suggestion.name}</div>
              <div className="text-sm text-gray-500 font-mono">{suggestion.command}</div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Safety Notice */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" />
          <div>
            <h4 className="font-medium text-yellow-800">Safety Notice</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Be careful when executing commands. Some commands may modify system settings or files.
              Dangerous commands that could harm the system are blocked for safety.
              {connectionMode === 'websocket' 
                ? 'Commands are executed in real-time with live output streaming.'
                : 'Commands are executed via HTTP API with output returned after completion.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terminal;