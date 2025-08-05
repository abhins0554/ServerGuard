import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add timeout to prevent hanging requests
  timeout: 10000,
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Create a request cache with TTL
const requestCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

// Helper function to create cached API calls
const createCachedApiCall = (apiCall, cacheKey, ttl = CACHE_TTL) => async (...args) => {
  const fullCacheKey = `${cacheKey}_${JSON.stringify(args)}`;
  const cachedItem = requestCache.get(fullCacheKey);
  
  // Return cached response if valid
  if (cachedItem && Date.now() - cachedItem.timestamp < ttl) {
    return cachedItem.data;
  }
  
  // Make the actual API call
  const result = await apiCall(...args);
  
  // Cache the result
  requestCache.set(fullCacheKey, {
    timestamp: Date.now(),
    data: result
  });
  
  return result;
};

// WebSocket connection manager
class WebSocketManager {
  constructor() {
    this.connections = new Map();
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 3;
    this.connectionStates = new Map(); // Track connection states
    this.logger = console; // Use console for now, could be replaced with proper logger
  }

  log(level, message, ...args) {
    const timestamp = new Date().toISOString();
    this.logger[level](`[${timestamp}] WebSocket: ${message}`, ...args);
  }

  connect(url, onMessage, onError, onClose) {
    this.log('info', `Attempting to connect to ${url}`);
    
    // Check if we've exceeded max attempts for this URL
    const attempts = this.reconnectAttempts.get(url) || 0;
    if (attempts >= this.maxReconnectAttempts) {
      this.log('warn', `Max reconnection attempts reached for ${url}`);
      onError?.(new Error('Max reconnection attempts reached'));
      return null;
    }
    
    // Only disconnect if there's an existing connection that's not in OPEN state
    const existingWs = this.connections.get(url);
    if (existingWs && existingWs.readyState !== WebSocket.OPEN) {
      this.log('info', `Clearing existing non-open connection for ${url}`);
      this.disconnect(url);
    }
    
    const ws = new WebSocket(url);
    this.connectionStates.set(url, 'connecting');
    
    ws.onopen = () => {
      this.log('info', `Successfully connected to ${url}`);
      this.reconnectAttempts.set(url, 0);
      this.connectionStates.set(url, 'open');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.log('debug', `Received message from ${url}:`, data.type);
        onMessage(data);
      } catch (error) {
        this.log('error', `WebSocket message parse error for ${url}:`, error);
        // Handle raw text messages
        onMessage({ type: 'output', data: event.data });
      }
    };
    
    ws.onerror = (error) => {
      this.log('error', `WebSocket error for ${url}:`, error);
      this.connectionStates.set(url, 'error');
      onError?.(error);
    };
    
    ws.onclose = (event) => {
      this.log('info', `WebSocket disconnected from ${url}`, { code: event.code, reason: event.reason });
      this.connectionStates.set(url, 'closed');
      
      // Only attempt to reconnect if not a normal closure and we haven't exceeded max attempts
      if (event.code !== 1000 && event.code !== 1006) {
        const attempts = this.reconnectAttempts.get(url) || 0;
        if (attempts < this.maxReconnectAttempts) {
          this.log('info', `Attempting to reconnect to ${url} (attempt ${attempts + 1})`);
          this.reconnectAttempts.set(url, attempts + 1);
          
          // Use exponential backoff
          const delay = Math.min(2000 * Math.pow(2, attempts), 10000);
          setTimeout(() => {
            this.connect(url, onMessage, onError, onClose);
          }, delay);
        } else {
          this.log('warn', `Max reconnection attempts reached for ${url}`);
        }
      }
      
      onClose?.();
    };
    
    this.connections.set(url, ws);
    return ws;
  }

  disconnect(url) {
    const ws = this.connections.get(url);
    if (ws) {
      try {
        // Only close if not already closed
        if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
          this.log('info', `Manually disconnecting from ${url}`);
          ws.close(1000, 'Manual disconnect');
        } else {
          this.log('debug', `WebSocket for ${url} already closed or closing`);
        }
      } catch (e) {
        this.log('error', `Error closing WebSocket for ${url}:`, e);
      }
      this.connections.delete(url);
      this.reconnectAttempts.delete(url);
      this.connectionStates.delete(url);
    }
  }

  send(url, message) {
    const ws = this.connections.get(url);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
        this.log('debug', `Sent message to ${url}:`, message.type);
        return true;
      } catch (e) {
        this.log('error', `Error sending WebSocket message to ${url}:`, e);
        return false;
      }
    } else {
      this.log('warn', `WebSocket not ready for ${url}, state: ${ws?.readyState}`);
      return false;
    }
  }

  isConnected(url) {
    const ws = this.connections.get(url);
    return ws && ws.readyState === WebSocket.OPEN;
  }

  getConnectionState(url) {
    return this.connectionStates.get(url) || 'disconnected';
  }

  resetReconnectAttempts(url) {
    this.reconnectAttempts.delete(url);
    this.log('info', `Reset reconnect attempts for ${url}`);
  }
}

export const wsManager = new WebSocketManager();

export const authAPI = {
  login: async (username, password) => {
    const response = await api.post('/api/auth/login', { username, password });
    return response.data;
  },
};

export const systemAPI = {
  getSummary: createCachedApiCall(async () => {
    const response = await api.get('/api/system/summary');
    return response.data;
  }, 'system_summary', 1000), // 1 second cache for real-time data

  getCpuInfo: createCachedApiCall(async () => {
    const response = await api.get('/api/system/cpu');
    return response.data;
  }, 'system_cpu', 1000), // 1 second cache

  getDetailedCpuInfo: createCachedApiCall(async () => {
    const response = await api.get('/api/system/cpu/detailed');
    return response.data;
  }, 'system_cpu_detailed', 1000), // 1 second cache

  getMemoryInfo: createCachedApiCall(async () => {
    const response = await api.get('/api/system/memory');
    return response.data;
  }, 'system_memory', 1000), // 1 second cache

  getDiskInfo: createCachedApiCall(async () => {
    const response = await api.get('/api/system/disk');
    return response.data;
  }, 'system_disk', 2000), // 2 second cache

  getNetworkInfo: createCachedApiCall(async () => {
    const response = await api.get('/api/system/network');
    return response.data;
  }, 'system_network', 2000), // 2 second cache

  getOsInfo: createCachedApiCall(async () => {
    const response = await api.get('/api/system/os');
    return response.data;
  }, 'system_os', 60000), // 1 minute cache for static data

  getProcesses: createCachedApiCall(async (page = 1, limit = 50, sortBy = 'cpu_percent', sortOrder = 'desc') => {
    const response = await api.get('/api/system/processes', {
      params: { page, limit, sort_by: sortBy, sort_order: sortOrder }
    });
    return response.data;
  }, 'system_processes', 1000), // 1 second cache for processes

  executeCommand: async (command) => {
    const response = await api.post('/api/system/command', { command });
    return response.data;
  },

  clearCache: async () => {
    const response = await api.post('/api/system/clear-cache');
    return response.data;
  },

  // Real-time system monitoring via WebSocket
  connectSystemWebSocket: (onMessage, onError, onClose) => {
    const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/ws/system`;
    return wsManager.connect(wsUrl, onMessage, onError, onClose);
  },

  // Real-time terminal via WebSocket
  connectTerminalWebSocket: (sessionId, onMessage, onError, onClose) => {
    const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/ws/terminal/${sessionId}`;
    return wsManager.connect(wsUrl, onMessage, onError, onClose);
  },

  sendTerminalCommand: (sessionId, command) => {
    const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/ws/terminal/${sessionId}`;
    return wsManager.send(wsUrl, { type: 'command', command });
  },

  getTerminalDirectory: (sessionId) => {
    const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/ws/terminal/${sessionId}`;
    return wsManager.send(wsUrl, { type: 'get_directory' });
  },

  pingTerminal: (sessionId) => {
    const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/ws/terminal/${sessionId}`;
    return wsManager.send(wsUrl, { type: 'ping' });
  }
};

export const fileAPI = {
  listDirectory: createCachedApiCall(async (path = '.') => {
    const response = await api.get(`/api/files/list?path=${encodeURIComponent(path)}`);
    return response.data;
  }, 'files_list', 10000), // 10 second cache for directory listings

  getFileContent: createCachedApiCall(async (path) => {
    const response = await api.get(`/api/files/content?path=${encodeURIComponent(path)}`);
    return response.data;
  }, 'files_content', 30000), // 30 second cache for file content

  updateFile: async (path, content) => {
    const response = await api.post('/api/files/update', { path, content });
    // Clear file content cache after update
    const cacheKey = `files_content_${JSON.stringify([path])}`;
    requestCache.delete(cacheKey);
    return response.data;
  },

  downloadFile: (path) => {
    // This will trigger a file download in the browser
    const token = localStorage.getItem('token');
    window.open(`${API_BASE_URL}/api/files/download?path=${encodeURIComponent(path)}&token=${token}`);
  },

  uploadFile: async (path, file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`/api/files/upload?path=${encodeURIComponent(path)}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    // Clear directory cache after upload
    const parentPath = path.substring(0, path.lastIndexOf('/'));
    const cacheKey = `files_list_${JSON.stringify([parentPath])}`;
    requestCache.delete(cacheKey);
    
    return response.data;
  },

  createDirectory: async (path) => {
    const response = await api.post('/api/files/create-directory', { path });
    
    // Clear directory cache after creation
    const parentPath = path.substring(0, path.lastIndexOf('/'));
    const cacheKey = `files_list_${JSON.stringify([parentPath])}`;
    requestCache.delete(cacheKey);
    
    return response.data;
  },

  deleteFile: async (path) => {
    const response = await api.delete(`/api/files/delete?path=${encodeURIComponent(path)}`);
    
    // Clear directory cache after deletion
    const parentPath = path.substring(0, path.lastIndexOf('/'));
    const cacheKey = `files_list_${JSON.stringify([parentPath])}`;
    requestCache.delete(cacheKey);
    
    return response.data;
  },

  getBinaryFileInfo: createCachedApiCall(async (path) => {
    const response = await api.get(`/api/files/binary-info?path=${encodeURIComponent(path)}`);
    return response.data;
  }, 'files_binary_info', 30000), // 30 second cache for binary file info

  createShareableLink: async (path, expiresIn = 1200) => {
    const response = await api.post('/api/files/create-share-link', { 
      path, 
      expires_in: expiresIn 
    });
    return response.data;
  },

  getShareableLinkUrl: (linkId) => {
    return `${API_BASE_URL}/api/files/share/${linkId}`;
  },

  getStreamableLinkUrl: (linkId) => {
    return `${API_BASE_URL}/api/files/stream/${linkId}`;
  },
};

// Cache management utilities
export const cacheUtils = {
  clearCache: (pattern = null) => {
    if (pattern) {
      for (const key of requestCache.keys()) {
        if (key.includes(pattern)) {
          requestCache.delete(key);
        }
      }
    } else {
      requestCache.clear();
    }
  },

  getCacheStats: () => {
    return {
      size: requestCache.size,
      keys: Array.from(requestCache.keys())
    };
  }
};

export default api;