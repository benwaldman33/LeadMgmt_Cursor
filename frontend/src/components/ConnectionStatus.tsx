import React, { useState, useEffect, useRef } from 'react';
import { 
  WifiIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

interface ConnectionStatusProps {
  className?: string;
}

interface ConnectionState {
  backend: 'connected' | 'disconnected' | 'checking';
  lastCheck: Date | null;
  error?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const [connection, setConnection] = useState<ConnectionState>({
    backend: 'checking',
    lastCheck: null
  });
  
  const isCheckingRef = useRef(false);
  const lastCheckTimeRef = useRef<number>(0);
  const checkCountRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkBackendConnection = async (isManualCheck = false) => {
    // Prevent multiple simultaneous checks
    if (isCheckingRef.current) {
      console.log('🔒 [CONNECTION STATUS] Skipping check - already in progress');
      return;
    }

    // Only log manual checks or first few automatic checks to reduce noise
    const shouldLog = isManualCheck || checkCountRef.current < 2;
    
    if (shouldLog) {
      console.log(`🔍 [CONNECTION STATUS] ${isManualCheck ? 'Manual' : 'Automatic'} backend connection check... (Check #${checkCountRef.current + 1})`);
    }
    
    try {
      isCheckingRef.current = true;
      setConnection(prev => ({ ...prev, backend: 'checking' }));
      
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (response.ok) {
        if (shouldLog) {
          console.log('✅ [CONNECTION STATUS] Backend connection successful');
        }
        setConnection({
          backend: 'connected',
          lastCheck: new Date(),
          error: undefined
        });
      } else {
        if (shouldLog) {
          console.warn('⚠️ [CONNECTION STATUS] Backend responded with error:', response.status);
        }
        setConnection({
          backend: 'disconnected',
          lastCheck: new Date(),
          error: `HTTP ${response.status}`
        });
      }
    } catch (error: any) {
      if (shouldLog) {
        console.error('❌ [CONNECTION STATUS] Backend connection failed:', error.message);
      }
      setConnection({
        backend: 'disconnected',
        lastCheck: new Date(),
        error: error.message
      });
    } finally {
      isCheckingRef.current = false;
      lastCheckTimeRef.current = Date.now();
      checkCountRef.current++;
      
      if (shouldLog) {
        console.log(`📊 [CONNECTION STATUS] Check completed. Total checks: ${checkCountRef.current}`);
      }
    }
  };

  useEffect(() => {
    console.log('🚀 [CONNECTION STATUS] Component mounted - setting up connection monitoring');
    
    // Initial check
    checkBackendConnection();

    // Check every 2 minutes (120 seconds) instead of 60 to reduce noise
    intervalRef.current = setInterval(() => {
      const timeSinceLastCheck = Date.now() - lastCheckTimeRef.current;
      const minutesSinceLastCheck = Math.floor(timeSinceLastCheck / 60000);
      
      // Only check if it's been at least 2 minutes since last check
      if (timeSinceLastCheck >= 120000) {
        console.log(`⏰ [CONNECTION STATUS] Scheduled check triggered (${minutesSinceLastCheck} minutes since last check)`);
        checkBackendConnection();
      } else {
        console.log(`⏰ [CONNECTION STATUS] Skipping scheduled check - only ${Math.floor(timeSinceLastCheck / 1000)}s since last check`);
      }
    }, 120000); // Check every 2 minutes

    return () => {
      if (intervalRef.current) {
        console.log('🧹 [CONNECTION STATUS] Component unmounting - clearing interval');
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleManualCheck = () => {
    console.log('👆 [CONNECTION STATUS] Manual check requested by user');
    checkBackendConnection(true);
  };

  const getStatusIcon = () => {
    switch (connection.backend) {
      case 'connected':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
      case 'checking':
        return <WifiIcon className="h-4 w-4 text-yellow-500 animate-pulse" />;
      default:
        return <WifiIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (connection.backend) {
      case 'connected':
        return 'Backend Connected';
      case 'disconnected':
        return 'Backend Disconnected';
      case 'checking':
        return 'Checking Connection...';
      default:
        return 'Unknown Status';
    }
  };

  const getStatusColor = () => {
    switch (connection.backend) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'disconnected':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'checking':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border text-sm ${getStatusColor()} ${className}`}>
      {getStatusIcon()}
      <span className="font-medium">{getStatusText()}</span>
      
      {connection.lastCheck && (
        <span className="text-xs opacity-75">
          {connection.lastCheck.toLocaleTimeString()}
        </span>
      )}
      
      {connection.error && (
        <span className="text-xs opacity-75 max-w-xs truncate" title={connection.error}>
          ({connection.error})
        </span>
      )}
      
      <button
        onClick={handleManualCheck}
        className="text-xs opacity-75 hover:opacity-100 underline"
        title="Check connection now"
      >
        Check
      </button>
    </div>
  );
};

export default ConnectionStatus;

