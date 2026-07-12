// Structured logger for production use
// Replaces console.error/console.log with structured output

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context && { context }),
  };

  // In production, output structured JSON to stderr
  // In development, use readable format
  if (process.env.NODE_ENV === 'production') {
    process.stderr.write(JSON.stringify(entry) + '\n');
  } else {
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
    process.stderr.write(`${prefix} [${entry.timestamp}] ${message}\n`);
    if (context) {
      process.stderr.write(`   ${JSON.stringify(context)}\n`);
    }
  }
}

export const logger = {
  error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  debug: (message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'production') {
      log('debug', message, context);
    }
  },
};
