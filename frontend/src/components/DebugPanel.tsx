import React, { useState, useEffect } from 'react';
import { EyeIcon, EyeSlashIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ConsoleMessage {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: string;
  data?: any[];
}

const DebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const [activeTab, setActiveTab] = useState('debug');
  const [consoleFilter, setConsoleFilter] = useState<'all' | 'log' | 'warn' | 'error' | 'info'>('all');
  const [hideConnectionStatus, setHideConnectionStatus] = useState(false);

  useEffect(() => {
    if (isVisible) {
      updateDebugInfo();
      loadConsoleMessages();
    }
  }, [isVisible]);

  useEffect(() => {
    // Intercept console messages
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    const addMessage = (type: ConsoleMessage['type'], ...args: any[]) => {
      const message: ConsoleMessage = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type,
        message: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '),
        timestamp: new Date().toISOString(),
        data: args
      };

      // Use setTimeout to defer state update and prevent React errors
      setTimeout(() => {
        setConsoleMessages(prev => {
          const newMessages = [...prev, message];
          // Keep only last 100 messages to prevent memory issues
          if (newMessages.length > 100) {
            newMessages.splice(0, newMessages.length - 100);
          }
          return newMessages;
        });

        // Store in localStorage for persistence
        try {
          const stored = JSON.parse(localStorage.getItem('consoleMessages') || '[]');
          stored.push(message);
          if (stored.length > 100) stored.splice(0, stored.length - 100);
          localStorage.setItem('consoleMessages', JSON.stringify(stored));
        } catch (e) {
          // Silently fail if localStorage is not available
        }
      }, 0);
    };

    console.log = (...args) => {
      originalLog.apply(console, args);
      addMessage('log', ...args);
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      addMessage('warn', ...args);
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      addMessage('error', ...args);
    };

    console.info = (...args) => {
      originalInfo.apply(console, args);
      addMessage('info', ...args);
    };

    // Cleanup function
    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      console.info = originalInfo;
    };
  }, []);

  const loadConsoleMessages = () => {
    try {
      const stored = localStorage.getItem('consoleMessages');
      if (stored) {
        setConsoleMessages(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load console messages:', e);
    }
  };

  const updateDebugInfo = () => {
    const info: any = {};
    
    // Get stored errors
    try {
      const lastLoginError = localStorage.getItem('lastLoginError');
      if (lastLoginError) info.lastLoginError = JSON.parse(lastLoginError);
      
      const lastLoginSuccess = localStorage.getItem('lastLoginSuccess');
      if (lastLoginSuccess) info.lastLoginSuccess = JSON.parse(lastLoginSuccess);
      
      const lastReactError = localStorage.getItem('lastReactError');
      if (lastReactError) info.lastReactError = JSON.parse(lastReactError);
    } catch (e) {
      info.parseError = e;
    }

    // Get current auth state
    info.currentAuth = {
      token: localStorage.getItem('bbds_access_token'),
      user: localStorage.getItem('bbds_user'),
      hasToken: !!localStorage.getItem('bbds_access_token'),
      hasUser: !!localStorage.getItem('bbds_user')
    };

    // Get connection status
    info.connectionStatus = {
      backend: localStorage.getItem('backendConnectionStatus') || 'unknown',
      timestamp: new Date().toISOString()
    };

    setDebugInfo(info);
  };

  const clearDebugInfo = () => {
    localStorage.removeItem('lastLoginError');
    localStorage.removeItem('lastLoginSuccess');
    localStorage.removeItem('lastReactError');
    updateDebugInfo();
  };

  const clearConsoleMessages = () => {
    setConsoleMessages([]);
    localStorage.removeItem('consoleMessages');
  };

  const getMessageIcon = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'error': return '🔴';
      case 'warn': return '🟡';
      case 'info': return '🔵';
      default: return '⚪';
    }
  };

  const getMessageColor = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'error': return 'text-red-600';
      case 'warn': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const filteredConsoleMessages = consoleMessages.filter(msg => {
    // First apply type filter
    const typeMatch = consoleFilter === 'all' || msg.type === consoleFilter;
    
    // Then apply connection status filter
    const connectionStatusMatch = !hideConnectionStatus || !msg.message.includes('[CONNECTION STATUS]');
    
    return typeMatch && connectionStatusMatch;
  });

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Show Debug Panel"
        >
          <EyeIcon className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 bg-white border border-gray-300 rounded-lg shadow-xl">
      <div className="bg-gray-100 px-4 py-2 rounded-t-lg flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">Debug Panel</h3>
        <div className="flex space-x-2">
          <button
            onClick={updateDebugInfo}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Refresh
          </button>
          <button
            onClick={clearDebugInfo}
            className="text-red-600 hover:text-red-800 text-sm"
            title="Clear Debug Info"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-600 hover:text-gray-800"
            title="Hide Debug Panel"
          >
            <EyeSlashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('debug')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'debug' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Debug Info
        </button>
        <button
          onClick={() => setActiveTab('console')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'console' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Console ({consoleMessages.length})
        </button>
      </div>

      <div className="p-4 max-h-80 overflow-y-auto text-xs">
        {activeTab === 'debug' ? (
          <pre className="whitespace-pre-wrap text-gray-800">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Console Messages</span>
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-1 text-xs">
                  <input
                    type="checkbox"
                    checked={hideConnectionStatus}
                    onChange={(e) => setHideConnectionStatus(e.target.checked)}
                    className="rounded"
                  />
                  <span>Hide Connection Status</span>
                </label>
                <select
                  value={consoleFilter}
                  onChange={(e) => setConsoleFilter(e.target.value as any)}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="all">All ({consoleMessages.length})</option>
                  <option value="log">Log ({consoleMessages.filter(m => m.type === 'log').length})</option>
                  <option value="warn">Warn ({consoleMessages.filter(m => m.type === 'warn').length})</option>
                  <option value="error">Error ({consoleMessages.filter(m => m.type === 'error').length})</option>
                  <option value="info">Info ({consoleMessages.filter(m => m.type === 'info').length})</option>
                </select>
                <button
                  onClick={clearConsoleMessages}
                  className="text-red-600 hover:text-red-800 text-xs"
                >
                  Clear
                </button>
              </div>
            </div>
            {filteredConsoleMessages.length === 0 ? (
              <p className="text-gray-500 italic">No console messages match the current filter</p>
            ) : (
              filteredConsoleMessages.slice().reverse().map((msg) => (
                <div key={msg.id} className="border-l-2 border-gray-200 pl-2 py-1">
                  <div className="flex items-start space-x-2">
                    <span className="text-lg">{getMessageIcon(msg.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-mono ${getMessageColor(msg.type)}`}>
                        {msg.message}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugPanel;
