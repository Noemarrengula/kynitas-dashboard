type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
  context?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isDevelopment = import.meta.env.DEV;

  private log(level: LogLevel, message: string, data?: Record<string, unknown>, context?: string) {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (this.isDevelopment) {
      const style = this.getConsoleStyle(level);
      console.group(`%c[${level.toUpperCase()}] ${message}`, style);
      if (context) console.log('%ccontext:', 'font-weight: bold', context);
      if (data) console.log('%cdata:', 'font-weight: bold', data);
      console.log('%ctimestamp:', 'font-weight: bold', entry.timestamp);
      console.groupEnd();
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case 'debug': return 'color: #6c757d';
      case 'info': return 'color: #0dcaf0; font-weight: bold';
      case 'warn': return 'color: #ffc107; font-weight: bold';
      case 'error': return 'color: #dc3545; font-weight: bold';
    }
  }

  debug(message: string, data?: Record<string, unknown>, context?: string) {
    this.log('debug', message, data, context);
  }

  info(message: string, data?: Record<string, unknown>, context?: string) {
    this.log('info', message, data, context);
  }

  warn(message: string, data?: Record<string, unknown>, context?: string) {
    this.log('warn', message, data, context);
  }

  error(message: string, data?: Record<string, unknown>, context?: string) {
    this.log('error', message, data, context);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(l => l.level === level);
    }
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();

export function useLogger(context?: string) {
  return {
    debug: (message: string, data?: Record<string, unknown>) => 
      logger.debug(message, data, context),
    info: (message: string, data?: Record<string, unknown>) => 
      logger.info(message, data, context),
    warn: (message: string, data?: Record<string, unknown>) => 
      logger.warn(message, data, context),
    error: (message: string, data?: Record<string, unknown>) => 
      logger.error(message, data, context),
  };
}
