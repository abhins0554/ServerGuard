import React, { useState, useEffect, useRef } from 'react';
import { systemAPI } from '../services/api';
import { Monitor, Settings, MousePointer, Keyboard, Maximize2, Minimize2 } from 'lucide-react';

const ScreenShare = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isControlConnected, setIsControlConnected] = useState(false);
  const [screenImage, setScreenImage] = useState(null);
  const [screenInfo, setScreenInfo] = useState(null);
  const [error, setError] = useState(null);
  const [sessionId] = useState(() => `screen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [settings, setSettings] = useState({
    quality: 75,
    scale: 1.0,
    fps: 10
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mouseControlEnabled, setMouseControlEnabled] = useState(true);
  const [isMouseDown, setIsMouseDown] = useState(false);
  
  const screenRef = useRef(null);
  const containerRef = useRef(null);
  const wsRef = useRef(null);
  const controlWsRef = useRef(null);
  const scaleFactorRef = useRef({ x: 1, y: 1 });
  const lastMouseMoveRef = useRef({ x: 0, y: 0, time: 0 });
  const mouseMoveThrottleRef = useRef(null);

  useEffect(() => {
    // Get screen info
    const fetchScreenInfo = async () => {
      try {
        const info = await systemAPI.getScreenInfo();
        setScreenInfo(info);
      } catch (err) {
        setError(`Failed to get screen info: ${err.message}`);
      }
    };
    
    fetchScreenInfo();

    // Connect to screen sharing WebSocket
    const connectScreen = () => {
      const wsUrl = `${process.env.REACT_APP_API_URL?.replace('http', 'ws') || 'ws://localhost:8000'}/ws/screen/${sessionId}`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'screen_info') {
            setScreenInfo(data);
          } else if (data.type === 'frame') {
            setScreenImage(`data:image/jpeg;base64,${data.data}`);
          } else if (data.type === 'error') {
            setError(data.message);
          }
        } catch (err) {
          console.error('Error parsing screen data:', err);
        }
      };
      
      ws.onerror = (err) => {
        setError('Screen sharing connection error');
        setIsConnected(false);
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        // Attempt to reconnect after 2 seconds
        setTimeout(connectScreen, 2000);
      };
      
      wsRef.current = ws;
    };

    // Connect to control WebSocket
    const connectControl = () => {
      const wsUrl = `${process.env.REACT_APP_API_URL?.replace('http', 'ws') || 'ws://localhost:8000'}/ws/screen-control/${sessionId}`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsControlConnected(true);
      };
      
      ws.onerror = (err) => {
        setIsControlConnected(false);
      };
      
      ws.onclose = () => {
        setIsControlConnected(false);
        // Attempt to reconnect after 2 seconds
        setTimeout(connectControl, 2000);
      };
      
      controlWsRef.current = ws;
    };

    connectScreen();
    connectControl();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (controlWsRef.current) {
        controlWsRef.current.close();
      }
      // Clean up throttle timer
      if (mouseMoveThrottleRef.current) {
        clearTimeout(mouseMoveThrottleRef.current);
      }
    };
  }, [sessionId]);

  // Update scale factor when screen info or container size changes
  useEffect(() => {
    if (screenInfo && screenRef.current && containerRef.current) {
      const screen = screenRef.current;
      const screenRect = screen.getBoundingClientRect();
      
      // Calculate scale factor based on actual displayed image size, not container size
      // This accounts for object-contain CSS which may scale the image to fit
      scaleFactorRef.current = {
        x: screenInfo.width / screenRect.width,
        y: screenInfo.height / screenRect.height
      };
    }
  }, [screenInfo, screenImage]);

  const sendControlCommand = (data) => {
    if (controlWsRef.current && controlWsRef.current.readyState === WebSocket.OPEN) {
      controlWsRef.current.send(JSON.stringify({
        type: 'control',
        data: data
      }));
    }
  };

  const handleMouseMove = (e) => {
    if (!screenInfo || !screenRef.current || !mouseControlEnabled) return;
    
    // Recalculate scale factor in case image size changed
    const screenRect = screenRef.current.getBoundingClientRect();
    const scaleX = screenInfo.width / screenRect.width;
    const scaleY = screenInfo.height / screenRect.height;
    
    // Calculate mouse position relative to the displayed image
    let x = (e.clientX - screenRect.left) * scaleX;
    let y = (e.clientY - screenRect.top) * scaleY;
    
    // Clamp coordinates to valid screen bounds
    x = Math.max(0, Math.min(screenInfo.width - 1, x));
    y = Math.max(0, Math.min(screenInfo.height - 1, y));
    
    const now = Date.now();
    const lastMove = lastMouseMoveRef.current;
    
    // Throttle mouse move events - only send every 50ms (20fps max)
    // Or send immediately if mouse button is down (for dragging)
    if (isMouseDown || (now - lastMove.time) >= 50) {
      // Only send if position actually changed significantly (at least 2 pixels)
      const dx = Math.abs(x - lastMove.x);
      const dy = Math.abs(y - lastMove.y);
      
      if (isMouseDown || dx > 2 || dy > 2) {
        // Clear any pending throttle
        if (mouseMoveThrottleRef.current) {
          clearTimeout(mouseMoveThrottleRef.current);
          mouseMoveThrottleRef.current = null;
        }
        
        sendControlCommand({
          type: 'mouse_move',
          x: Math.round(x),
          y: Math.round(y)
        });
        
        lastMouseMoveRef.current = { x, y, time: now };
      } else {
        // Throttle: schedule a delayed send if not already scheduled
        if (!mouseMoveThrottleRef.current) {
          mouseMoveThrottleRef.current = setTimeout(() => {
            sendControlCommand({
              type: 'mouse_move',
              x: Math.round(x),
              y: Math.round(y)
            });
            lastMouseMoveRef.current = { x, y, time: Date.now() };
            mouseMoveThrottleRef.current = null;
          }, 50);
        }
      }
    }
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    if (!screenInfo || !screenRef.current || !mouseControlEnabled) return;
    
    setIsMouseDown(true);
    // Recalculate scale factor in case image size changed
    const screenRect = screenRef.current.getBoundingClientRect();
    const scaleX = screenInfo.width / screenRect.width;
    const scaleY = screenInfo.height / screenRect.height;
    
    let x = (e.clientX - screenRect.left) * scaleX;
    let y = (e.clientY - screenRect.top) * scaleY;
    
    // Clamp coordinates to valid screen bounds
    x = Math.max(0, Math.min(screenInfo.width - 1, x));
    y = Math.max(0, Math.min(screenInfo.height - 1, y));
    
    // Send mouse move first to ensure cursor is at the right position
    sendControlCommand({
      type: 'mouse_move',
      x: Math.round(x),
      y: Math.round(y)
    });
    
    sendControlCommand({
      type: 'mouse_click',
      x: Math.round(x),
      y: Math.round(y),
      button: e.button === 2 ? 'right' : 'left'
    });
  };
  
  const handleMouseUp = (e) => {
    setIsMouseDown(false);
    if (!screenInfo || !screenRef.current || !mouseControlEnabled) return;
    
    // Recalculate scale factor in case image size changed
    const screenRect = screenRef.current.getBoundingClientRect();
    const scaleX = screenInfo.width / screenRect.width;
    const scaleY = screenInfo.height / screenRect.height;
    
    let x = (e.clientX - screenRect.left) * scaleX;
    let y = (e.clientY - screenRect.top) * scaleY;
    
    // Clamp coordinates to valid screen bounds
    x = Math.max(0, Math.min(screenInfo.width - 1, x));
    y = Math.max(0, Math.min(screenInfo.height - 1, y));
    
    sendControlCommand({
      type: 'mouse_click',
      x: Math.round(x),
      y: Math.round(y),
      button: e.button === 2 ? 'right' : 'left'
    });
  };

  const handleWheel = (e) => {
    if (!screenInfo || !screenRef.current) return;
    
    e.preventDefault();
    // Recalculate scale factor in case image size changed
    const screenRect = screenRef.current.getBoundingClientRect();
    const scaleX = screenInfo.width / screenRect.width;
    const scaleY = screenInfo.height / screenRect.height;
    
    let x = (e.clientX - screenRect.left) * scaleX;
    let y = (e.clientY - screenRect.top) * scaleY;
    
    // Clamp coordinates to valid screen bounds
    x = Math.max(0, Math.min(screenInfo.width - 1, x));
    y = Math.max(0, Math.min(screenInfo.height - 1, y));
    
    sendControlCommand({
      type: 'mouse_scroll',
      x: Math.round(x),
      y: Math.round(y),
      scroll: e.deltaY > 0 ? -3 : 3
    });
  };

  const handleKeyDown = (e) => {
    if (!isControlConnected) return;
    
    // Don't send special keys that might interfere with browser
    if (e.key === 'F11' || e.key === 'F12') {
      return;
    }
    
    // Map special keys
    let key = e.key;
    if (key === 'ArrowUp') key = 'up';
    else if (key === 'ArrowDown') key = 'down';
    else if (key === 'ArrowLeft') key = 'left';
    else if (key === 'ArrowRight') key = 'right';
    else if (key === 'Enter') key = 'enter';
    else if (key === 'Backspace') key = 'backspace';
    else if (key === 'Delete') key = 'delete';
    else if (key === 'Tab') key = 'tab';
    else if (key === 'Escape') key = 'esc';
    else if (key === ' ') key = 'space';
    else if (key.length > 1 && key.startsWith('Control')) key = 'ctrl';
    else if (key.length > 1 && key.startsWith('Alt')) key = 'alt';
    else if (key.length > 1 && key.startsWith('Shift')) key = 'shift';
    else if (key.length > 1 && key.startsWith('Meta')) key = 'meta';
    
    sendControlCommand({
      type: 'key_down',
      key: key.toLowerCase()
    });
  };

  const handleKeyUp = (e) => {
    if (!isControlConnected) return;
    
    let key = e.key;
    if (key === 'ArrowUp') key = 'up';
    else if (key === 'ArrowDown') key = 'down';
    else if (key === 'ArrowLeft') key = 'left';
    else if (key === 'ArrowRight') key = 'right';
    else if (key === 'Enter') key = 'enter';
    else if (key === 'Backspace') key = 'backspace';
    else if (key === 'Delete') key = 'delete';
    else if (key === 'Tab') key = 'tab';
    else if (key === 'Escape') key = 'esc';
    else if (key === ' ') key = 'space';
    else if (key.length > 1 && key.startsWith('Control')) key = 'ctrl';
    else if (key.length > 1 && key.startsWith('Alt')) key = 'alt';
    else if (key.length > 1 && key.startsWith('Shift')) key = 'shift';
    else if (key.length > 1 && key.startsWith('Meta')) key = 'meta';
    
    sendControlCommand({
      type: 'key_up',
      key: key.toLowerCase()
    });
  };

  const handleKeyPress = (e) => {
    if (!isControlConnected) return;
    
    // Only send printable characters
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      sendControlCommand({
        type: 'key_type',
        text: e.key
      });
    }
  };

  const updateSettings = async () => {
    try {
      await systemAPI.updateScreenSettings(sessionId, settings.quality, settings.scale, settings.fps);
      setShowSettings(false);
    } catch (err) {
      setError(`Failed to update settings: ${err.message}`);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <Monitor className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Screen Share & Remote Control</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm">{isConnected ? 'Screen Connected' : 'Disconnected'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`h-3 w-3 rounded-full ${isControlConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm">{isControlConnected ? 'Control Active' : 'Control Inactive'}</span>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
          <button
            onClick={() => setMouseControlEnabled(!mouseControlEnabled)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              mouseControlEnabled 
                ? 'bg-green-700 hover:bg-green-600' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={mouseControlEnabled ? 'Disable Mouse Control' : 'Enable Mouse Control'}
          >
            <MousePointer className="h-4 w-4" />
            <span>{mouseControlEnabled ? 'Control ON' : 'Control OFF'}</span>
          </button>
          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center space-x-2"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-800 text-white px-6 py-4 border-b border-gray-700">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Quality (10-100)</label>
              <input
                type="range"
                min="10"
                max="100"
                value={settings.quality}
                onChange={(e) => setSettings({ ...settings, quality: parseInt(e.target.value) })}
                className="w-full"
              />
              <span className="text-sm text-gray-400">{settings.quality}</span>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Scale (0.1-2.0)</label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={settings.scale}
                onChange={(e) => setSettings({ ...settings, scale: parseFloat(e.target.value) })}
                className="w-full"
              />
              <span className="text-sm text-gray-400">{settings.scale.toFixed(1)}</span>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">FPS (1-30)</label>
              <input
                type="range"
                min="1"
                max="30"
                value={settings.fps}
                onChange={(e) => setSettings({ ...settings, fps: parseInt(e.target.value) })}
                className="w-full"
              />
              <span className="text-sm text-gray-400">{settings.fps}</span>
            </div>
          </div>
          <button
            onClick={updateSettings}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Apply Settings
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-600 text-white px-6 py-3">
          <p>{error}</p>
        </div>
      )}

      {/* Screen Display */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-black flex items-center justify-center p-4"
        onContextMenu={(e) => e.preventDefault()}
        tabIndex={0}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsMouseDown(false)}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onKeyPress={handleKeyPress}
      >
        {screenImage ? (
          <img
            ref={screenRef}
            src={screenImage}
            alt="Remote Screen"
            className="max-w-full max-h-full object-contain select-none"
            style={{ imageRendering: 'pixelated' }}
            draggable={false}
          />
        ) : (
          <div className="text-white text-center">
            <Monitor className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl">Waiting for screen connection...</p>
            {!isConnected && (
              <p className="text-sm text-gray-400 mt-2">Attempting to connect...</p>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gray-800 text-white px-6 py-3 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <MousePointer className="h-4 w-4" />
              <span>Click to control mouse</span>
            </div>
            <div className="flex items-center space-x-2">
              <Keyboard className="h-4 w-4" />
              <span>Type to send keyboard input</span>
            </div>
          </div>
          {screenInfo && (
            <div className="text-sm text-gray-400">
              Resolution: {screenInfo.width} × {screenInfo.height}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScreenShare;

