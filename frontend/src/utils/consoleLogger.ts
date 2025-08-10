// Console logger utility to persist logs in localStorage
class ConsoleLogger {
  private maxLogs = 100;
  private logs: Array<{ timestamp: string; level: string; message: string; data?: any }> = [];

  constructor() {
    this.loadLogs();
    this.overrideConsole();
  }

  private loadLogs() {
    try {
      const stored = localStorage.getItem('consoleLogs');
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load stored logs:', e);
    }
  }

  private saveLogs() {
    try {
      localStorage.setItem('consoleLogs', JSON.stringify(this.logs));
    } catch (e) {
      console.warn('Failed to save logs:', e);
    }
  }

  private addLog(level: string, message: string, data?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };

    this.logs.push(logEntry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    this.saveLogs();
  }

  private overrideConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    console.log = (...args) => {
      this.addLog('log', args[0], args.slice(1));
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      this.addLog('error', args[0], args.slice(1));
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      this.addLog('warn', args[0], args.slice(1));
      originalWarn.apply(console, args);
    };

    console.info = (...args) => {
      this.addLog('info', args[0], args.slice(1));
      originalInfo.apply(console, args);
    };
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    this.saveLogs();
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create and export singleton instance
export const consoleLogger = new ConsoleLogger();

// Also export the class for testing
export { ConsoleLogger };
