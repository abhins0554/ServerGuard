import React, { useState, useEffect, useRef } from 'react';
import { systemAPI, getWebSocketBaseUrl } from '../services/api';
import {
  Monitor,
  Settings,
  MousePointer,
  Keyboard,
  Maximize2,
  Minimize2,
  X,
  Smartphone,
  ZoomIn
} from 'lucide-react';

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

  const screenRef = useRef(null);
  const containerRef = useRef(null);
  const touchSurfaceRef = useRef(null);
  const wsRef = useRef(null);
  const controlWsRef = useRef(null);
  const scaleFactorRef = useRef({ x: 1, y: 1 });
  const lastMouseMoveRef = useRef({ x: 0, y: 0, time: 0 });
  const mouseMoveThrottleRef = useRef(null);
  const screenReconnectRef = useRef(null);
  const controlReconnectRef = useRef(null);
  /** Mouse or touch is holding primary button down (for move throttling). */
  const isPointerDownRef = useRef(false);
  const screenInfoRef = useRef(null);
  const activeTouchIdRef = useRef(null);
  const touchPointerDownRef = useRef(false);
  const twoFingerMidRef = useRef({ y: null, x: null });
  /** Two-finger spread/pinch: finger distance + zoom throttle */
  const twoFingerPinchRef = useRef({ lastSpread: null, lastZoomAt: 0 });

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

    const wsBase = getWebSocketBaseUrl();

    // Connect to screen sharing WebSocket (same backend origin as Terminal — not CRA :3000)
    const connectScreen = () => {
      const wsUrl = `${wsBase}/ws/screen/${sessionId}`;
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

      ws.onerror = () => {
        const httpHint = wsBase.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
        setError(`Screen sharing connection error — open the API at ${httpHint} or set REACT_APP_API_URL.`);
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        screenReconnectRef.current = setTimeout(connectScreen, 2000);
      };

      wsRef.current = ws;
    };

    const connectControl = () => {
      const wsUrl = `${wsBase}/ws/screen-control/${sessionId}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsControlConnected(true);
      };

      ws.onerror = () => {
        setIsControlConnected(false);
      };

      ws.onclose = () => {
        setIsControlConnected(false);
        controlReconnectRef.current = setTimeout(connectControl, 2000);
      };

      controlWsRef.current = ws;
    };

    connectScreen();
    connectControl();

    return () => {
      if (screenReconnectRef.current) {
        clearTimeout(screenReconnectRef.current);
        screenReconnectRef.current = null;
      }
      if (controlReconnectRef.current) {
        clearTimeout(controlReconnectRef.current);
        controlReconnectRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (controlWsRef.current) {
        controlWsRef.current.close();
        controlWsRef.current = null;
      }
      if (mouseMoveThrottleRef.current) {
        clearTimeout(mouseMoveThrottleRef.current);
      }
    };
  }, [sessionId]);

  useEffect(() => {
    screenInfoRef.current = screenInfo;
  }, [screenInfo]);

  // Non-passive touch listeners so we can preventDefault (stop scroll/zoom while controlling)
  useEffect(() => {
    const el = touchSurfaceRef.current;
    if (!el || !mouseControlEnabled) return undefined;
    const opts = { passive: false };
    const block = (e) => {
      if (screenInfoRef.current && screenRef.current) {
        e.preventDefault();
      }
    };
    el.addEventListener('touchstart', block, opts);
    el.addEventListener('touchmove', block, opts);
    el.addEventListener('touchend', block, opts);
    el.addEventListener('touchcancel', block, opts);
    return () => {
      el.removeEventListener('touchstart', block, opts);
      el.removeEventListener('touchmove', block, opts);
      el.removeEventListener('touchend', block, opts);
      el.removeEventListener('touchcancel', block, opts);
    };
  }, [mouseControlEnabled, screenImage]);

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

  /** Map viewport coordinates to remote desktop pixels (respects object-contain image bounds). */
  const clientToRemote = (clientX, clientY) => {
    const info = screenInfoRef.current;
    const img = screenRef.current;
    if (!info || !img) return null;
    const screenRect = img.getBoundingClientRect();
    const scaleX = info.width / screenRect.width;
    const scaleY = info.height / screenRect.height;
    let x = (clientX - screenRect.left) * scaleX;
    let y = (clientY - screenRect.top) * scaleY;
    x = Math.max(0, Math.min(info.width - 1, x));
    y = Math.max(0, Math.min(info.height - 1, y));
    return { x: Math.round(x), y: Math.round(y) };
  };

  const sendThrottledRemoteMove = (x, y) => {
    const now = Date.now();
    const lastMove = lastMouseMoveRef.current;
    const pointerDown = isPointerDownRef.current;

    if (pointerDown || now - lastMove.time >= 50) {
      const dx = Math.abs(x - lastMove.x);
      const dy = Math.abs(y - lastMove.y);

      if (pointerDown || dx > 2 || dy > 2) {
        if (mouseMoveThrottleRef.current) {
          clearTimeout(mouseMoveThrottleRef.current);
          mouseMoveThrottleRef.current = null;
        }
        sendControlCommand({ type: 'mouse_move', x, y });
        lastMouseMoveRef.current = { x, y, time: now };
      } else if (!mouseMoveThrottleRef.current) {
        mouseMoveThrottleRef.current = setTimeout(() => {
          sendControlCommand({ type: 'mouse_move', x, y });
          lastMouseMoveRef.current = { x, y, time: Date.now() };
          mouseMoveThrottleRef.current = null;
        }, 50);
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!screenInfo || !screenRef.current || !mouseControlEnabled) return;

    const screenRect = screenRef.current.getBoundingClientRect();
    const scaleX = screenInfo.width / screenRect.width;
    const scaleY = screenInfo.height / screenRect.height;
    let x = (e.clientX - screenRect.left) * scaleX;
    let y = (e.clientY - screenRect.top) * scaleY;
    x = Math.max(0, Math.min(screenInfo.width - 1, x));
    y = Math.max(0, Math.min(screenInfo.height - 1, y));
    sendThrottledRemoteMove(Math.round(x), Math.round(y));
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    if (!screenInfo || !screenRef.current || !mouseControlEnabled) return;

    isPointerDownRef.current = true;
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
    isPointerDownRef.current = false;
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

  const endTouchPointerIfNeeded = () => {
    if (touchPointerDownRef.current) {
      sendControlCommand({ type: 'mouse_up', button: 'left' });
      touchPointerDownRef.current = false;
    }
    activeTouchIdRef.current = null;
    isPointerDownRef.current = false;
  };

  const handleTouchStart = (e) => {
    if (!mouseControlEnabled || !screenInfoRef.current || !screenRef.current) return;

    if (e.touches.length === 2) {
      endTouchPointerIfNeeded();
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      twoFingerMidRef.current = {
        y: (t0.clientY + t1.clientY) / 2,
        x: (t0.clientX + t1.clientX) / 2
      };
      twoFingerPinchRef.current = {
        lastSpread: Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY),
        lastZoomAt: twoFingerPinchRef.current.lastZoomAt
      };
      return;
    }

    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const pos = clientToRemote(t.clientX, t.clientY);
    if (!pos) return;

    activeTouchIdRef.current = t.identifier;
    sendControlCommand({ type: 'mouse_move', x: pos.x, y: pos.y });
    sendControlCommand({ type: 'mouse_down', x: pos.x, y: pos.y, button: 'left' });
    touchPointerDownRef.current = true;
    isPointerDownRef.current = true;
    lastMouseMoveRef.current = { x: pos.x, y: pos.y, time: Date.now() };
  };

  const handleTouchMove = (e) => {
    if (!mouseControlEnabled || !screenInfoRef.current || !screenRef.current) return;

    if (e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      const spread = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const last = twoFingerMidRef.current;
      const pinch = twoFingerPinchRef.current;

      let didPinchZoom = false;
      if (
        last.x != null &&
        last.y != null &&
        pinch.lastSpread != null &&
        spread > 24
      ) {
        const midDx = Math.abs(midX - last.x);
        const midDy = Math.abs(midY - last.y);
        const dSpread = spread - pinch.lastSpread;
        const now = Date.now();
        if (
          midDx < 18 &&
          midDy < 18 &&
          Math.abs(dSpread) > 12 &&
          now - pinch.lastZoomAt > 360
        ) {
          sendControlCommand({
            type: 'zoom_gesture',
            direction: dSpread > 0 ? 'in' : 'out'
          });
          pinch.lastZoomAt = now;
          pinch.lastSpread = spread;
          didPinchZoom = true;
        }
      }
      if (!didPinchZoom) {
        pinch.lastSpread = spread;
      }

      const at = clientToRemote(midX, midY);
      if (at && !didPinchZoom && last.x != null && last.y != null) {
        const dx = midX - last.x;
        const dy = midY - last.y;
        const vert =
          Math.abs(dy) >= 2
            ? -Math.sign(dy) * Math.min(14, Math.max(1, Math.round(Math.abs(dy) / 6)))
            : 0;
        const horiz =
          Math.abs(dx) >= 2
            ? -Math.sign(dx) * Math.min(14, Math.max(1, Math.round(Math.abs(dx) / 6)))
            : 0;
        if (vert !== 0 || horiz !== 0) {
          sendControlCommand({
            type: 'mouse_scroll',
            x: at.x,
            y: at.y,
            scroll: vert,
            scroll_horizontal: horiz
          });
        }
      }

      twoFingerMidRef.current = { y: midY, x: midX };
      return;
    }

    if (
      e.touches.length === 1 &&
      touchPointerDownRef.current &&
      e.touches[0].identifier === activeTouchIdRef.current
    ) {
      const t = e.touches[0];
      const pos = clientToRemote(t.clientX, t.clientY);
      if (pos) sendThrottledRemoteMove(pos.x, pos.y);
    }
  };

  const handleTouchEnd = (e) => {
    if (!mouseControlEnabled) return;

    if (e.touches.length < 2) {
      twoFingerMidRef.current = { y: null, x: null };
      twoFingerPinchRef.current = { lastSpread: null, lastZoomAt: twoFingerPinchRef.current.lastZoomAt };
    }

    let releasedPrimary = false;
    for (let i = 0; i < e.changedTouches.length; i += 1) {
      const ch = e.changedTouches[i];
      if (ch.identifier === activeTouchIdRef.current && touchPointerDownRef.current) {
        endTouchPointerIfNeeded();
        releasedPrimary = true;
        break;
      }
    }

    if (e.touches.length === 0 && touchPointerDownRef.current) {
      endTouchPointerIfNeeded();
      releasedPrimary = true;
    }

    if (e.touches.length === 0) {
      activeTouchIdRef.current = null;
      twoFingerMidRef.current = { y: null, x: null };
      twoFingerPinchRef.current = { lastSpread: null, lastZoomAt: 0 };
    }

    if (releasedPrimary) {
      e.preventDefault();
    }
  };

  const handleWheel = (e) => {
    if (!screenInfo || !screenRef.current) return;

    e.preventDefault();
    const screenRect = screenRef.current.getBoundingClientRect();
    const scaleX = screenInfo.width / screenRect.width;
    const scaleY = screenInfo.height / screenRect.height;

    let x = (e.clientX - screenRect.left) * scaleX;
    let y = (e.clientY - screenRect.top) * scaleY;
    x = Math.max(0, Math.min(screenInfo.width - 1, x));
    y = Math.max(0, Math.min(screenInfo.height - 1, y));

    const rdx = e.shiftKey ? e.deltaY : e.deltaX;
    const rdy = e.shiftKey ? 0 : e.deltaY;
    const ax = Math.abs(rdx);
    const ay = Math.abs(rdy);

    const step = (delta) => {
      if (delta === 0) return 0;
      return -Math.sign(delta) * Math.min(14, Math.max(1, Math.round(Math.abs(delta) / 25)));
    };

    let scroll = 0;
    let scroll_horizontal = 0;
    if (ax < 1 && ay < 1) return;
    if (ay >= ax) {
      scroll = step(rdy);
      if (ax > 6) scroll_horizontal = step(rdx);
    } else {
      scroll_horizontal = step(rdx);
      if (ay > 6) scroll = step(rdy);
    }

    if (scroll !== 0 || scroll_horizontal !== 0) {
      sendControlCommand({
        type: 'mouse_scroll',
        x: Math.round(x),
        y: Math.round(y),
        scroll,
        scroll_horizontal
      });
    }
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

  const toolBtn =
    'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors border border-gray-200/80 dark:border-gray-700/80 bg-white/60 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 hover:bg-white/90 dark:hover:bg-gray-800/70';

  const statusPill = (ok, label) => (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-md border ${
        ok
          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-300'
          : 'bg-red-500/10 border-red-500/25 text-red-800 dark:text-red-300'
      }`}
    >
      <span className={`h-2 w-2 rounded-full shrink-0 ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {label}
    </div>
  );

  const rangeClass =
    'w-full h-2 rounded-lg appearance-none bg-gray-200 dark:bg-gray-700 accent-blue-600 dark:accent-blue-500 cursor-pointer';

  return (
    <div className="page-shell-flex gap-5 min-h-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Screen Sharing
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <Monitor className="h-4 w-4 shrink-0 opacity-80" />
          View and control the remote display — click or tap the picture first for keyboard focus
        </p>
      </div>

      <div className="glass-card py-3 px-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {statusPill(isConnected, isConnected ? 'Stream live' : 'Stream offline')}
          {statusPill(
            isControlConnected,
            isControlConnected ? 'Control channel ready' : 'Control channel idle'
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setShowSettings((s) => !s)} className={toolBtn}>
            <Settings className="h-4 w-4" />
            {showSettings ? 'Hide' : 'Stream'} settings
          </button>
          <button
            type="button"
            onClick={() => setMouseControlEnabled(!mouseControlEnabled)}
            className={`${toolBtn} ${
              mouseControlEnabled
                ? 'border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-200'
                : ''
            }`}
            title={mouseControlEnabled ? 'Disable pointer' : 'Enable pointer'}
          >
            <MousePointer className="h-4 w-4" />
            Pointer {mouseControlEnabled ? 'on' : 'off'}
          </button>
          <button type="button" onClick={toggleFullscreen} className={toolBtn} title="Full screen">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {isFullscreen ? 'Exit' : 'Full screen'}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Stream quality</h2>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400"
              aria-label="Close settings"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                Quality · {settings.quality}
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={settings.quality}
                onChange={(e) => setSettings({ ...settings, quality: parseInt(e.target.value, 10) })}
                className={rangeClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                Scale · {settings.scale.toFixed(1)}×
              </label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={settings.scale}
                onChange={(e) => setSettings({ ...settings, scale: parseFloat(e.target.value) })}
                className={rangeClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                Frame rate · {settings.fps} fps
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={settings.fps}
                onChange={(e) => setSettings({ ...settings, fps: parseInt(e.target.value, 10) })}
                className={rangeClass}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={updateSettings}
            className="mt-5 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            Apply to session
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/90 dark:bg-red-950/35 px-4 py-3 text-sm text-red-800 dark:text-red-300 backdrop-blur-sm">
          {error}
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1 flex flex-col min-h-[min(58vh,680px)] rounded-2xl overflow-hidden border border-gray-200/90 dark:border-gray-800/90 shadow-2xl shadow-gray-900/10 dark:shadow-black/40 bg-gray-950 ring-1 ring-black/5 dark:ring-white/10"
      >
        <div className="flex items-center gap-3 px-3 py-2.5 border-b border-white/10 bg-gray-900/85 dark:bg-black/60 backdrop-blur-xl">
          <div className="flex items-center gap-1.5 pl-1" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-red-500 shadow-sm ring-1 ring-black/20" />
            <span className="h-3 w-3 rounded-full bg-amber-400 shadow-sm ring-1 ring-black/15" />
            <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm ring-1 ring-black/20" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 tracking-tight">
              Remote Display
            </span>
          </div>
          {screenInfo && (
            <span className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400 pr-1">
              {screenInfo.width} × {screenInfo.height}
            </span>
          )}
        </div>

        <div
          className="flex-1 overflow-auto bg-black flex items-center justify-center p-3 sm:p-4 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-inset"
          onContextMenu={(e) => e.preventDefault()}
          tabIndex={0}
          ref={touchSurfaceRef}
          style={{
            touchAction: mouseControlEnabled ? 'none' : 'auto',
            WebkitTouchCallout: 'none'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            isPointerDownRef.current = false;
          }}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onKeyPress={handleKeyPress}
        >
          {screenImage ? (
            <img
              ref={screenRef}
              src={screenImage}
              alt="Remote screen"
              className="max-w-full max-h-full object-contain select-none rounded-lg shadow-lg ring-1 ring-white/10"
              style={{ imageRendering: 'auto' }}
              draggable={false}
            />
          ) : (
            <div className="text-center px-6 py-12 max-w-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                <Monitor className="h-8 w-8 text-gray-500" strokeWidth={1.25} />
              </div>
              <p className="text-base font-medium text-gray-300">Waiting for frames…</p>
              {!isConnected && (
                <p className="text-sm text-gray-500 mt-2">Connecting to the screen WebSocket</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card py-3 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="inline-flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
              Click and drag on the picture to move the remote pointer
            </span>
            <span className="inline-flex items-center gap-2 max-w-md">
              <Smartphone className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />
              <span>
                Touch: <strong className="font-medium text-gray-700 dark:text-gray-300">1</strong> finger — move
                &amp; drag; <strong className="font-medium text-gray-700 dark:text-gray-300">2</strong> fingers — pan
                to scroll <span className="whitespace-nowrap">(↕ ↔)</span>; hold center still and{' '}
                <strong className="font-medium text-gray-700 dark:text-gray-300">spread/pinch</strong> to zoom the
                remote app <ZoomIn className="inline h-3.5 w-3.5 -mt-0.5 opacity-70" aria-hidden />
              </span>
            </span>
            <span className="inline-flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
              Focus the black area, then type (modifiers map to the remote Mac)
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-500 shrink-0 text-right sm:text-left max-w-md sm:max-w-none">
            Wheel / trackpad: vertical scroll; sideways with horizontal trackpad delta or{' '}
            <kbd className="px-1 py-0.5 rounded bg-gray-200/80 dark:bg-gray-800/80 font-mono text-[10px]">
              Shift
            </kbd>
            + wheel. Right-click: use Control+click on the remote Mac (browser blocks right-click here).
          </span>
        </div>
      </div>
    </div>
  );
};

export default ScreenShare;

