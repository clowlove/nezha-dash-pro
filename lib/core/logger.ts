// Structured logging with levels, context propagation, request tracing, log rotation interface

// ── Types ─────────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  logger: string;
  message: string;
  context?: Record<string, unknown>;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  error?: { message: string; stack?: string; code?: string };
}

export interface LogTransport {
  write(entry: LogEntry): void | Promise<void>;
  flush?(): void | Promise<void>;
  close?(): void | Promise<void>;
}

export interface LoggerConfig {
  level?: LogLevel;
  transports?: LogTransport[];
  defaultContext?: Record<string, unknown>;
  requestIdHeader?: string;
}

// ── Built-in transports ───────────────────────────────────────────────────

/** Console transport with structured JSON output */
export class ConsoleTransport implements LogTransport {
  private json: boolean;

  constructor(opts?: { json?: boolean }) {
    this.json = opts?.json ?? process.env.NODE_ENV === 'production';
  }

  write(entry: LogEntry): void {
    if (this.json) {
      const output = JSON.stringify(entry);
      if (entry.level === 'error' || entry.level === 'fatal') {
        process.stderr.write(output + '\n');
      } else {
        process.stdout.write(output + '\n');
      }
      return;
    }

    // Human-readable format for development
    const ts = entry.timestamp.slice(11, 23);
    const level = entry.level.toUpperCase().padEnd(5);
    const logger = `[${entry.logger}]`;
    const reqId = entry.requestId ? ` (${entry.requestId.slice(0, 8)})` : '';

    let line = `${ts} ${level} ${logger}${reqId} ${entry.message}`;
    if (entry.context && Object.keys(entry.context).length > 0) {
      line += ' ' + formatContext(entry.context);
    }
    if (entry.error) {
      line += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) line += `\n  ${entry.error.stack.split('\n').slice(1, 4).join('\n  ')}`;
    }

    if (entry.level === 'error' || entry.level === 'fatal') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  }
}

/** File rotation interface — implementors can plug in actual file rotation */
export class RotatingFileTransport implements LogTransport {
  private buffer: LogEntry[] = [];
  private flushInterval: ReturnType<typeof setInterval>;
  private writeFn: (entries: LogEntry[]) => void | Promise<void>;

  constructor(opts: {
    writeFn: (entries: LogEntry[]) => void | Promise<void>;
    flushIntervalMs?: number;
  }) {
    this.writeFn = opts.writeFn;
    this.flushInterval = setInterval(() => this.flush(), opts.flushIntervalMs ?? 5000);
  }

  write(entry: LogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length >= 100) this.flush();
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0);
    await this.writeFn(batch);
  }

  close(): void {
    clearInterval(this.flushInterval);
    this.flush();
  }
}

function formatContext(ctx: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(ctx)) {
    if (typeof value === 'object') {
      parts.push(`${key}=${JSON.stringify(value)}`);
    } else {
      parts.push(`${key}=${value}`);
    }
  }
  return parts.join(' ');
}

// ── Logger class ──────────────────────────────────────────────────────────

export class Logger {
  private name: string;
  private level: LogLevel;
  private transports: LogTransport[];
  private defaultContext: Record<string, unknown>;
  private requestId?: string;
  private traceId?: string;

  constructor(name: string, config?: LoggerConfig) {
    this.name = name;
    this.level = config?.level ?? (process.env.LOG_LEVEL as LogLevel) ?? 'info';
    this.transports = config?.transports ?? [new ConsoleTransport()];
    this.defaultContext = config?.defaultContext ?? {};
  }

  /** Create a child logger with inherited context */
  child(name: string, context?: Record<string, unknown>): Logger {
    const child = new Logger(`${this.name}:${name}`, {
      level: this.level,
      transports: this.transports,
      defaultContext: { ...this.defaultContext, ...context },
    });
    child.requestId = this.requestId;
    child.traceId = this.traceId;
    return child;
  }

  /** Bind a request ID for context propagation */
  withRequestId(requestId: string): Logger {
    const clone = this.child('', {});
    clone.requestId = requestId;
    return clone;
  }

  /** Bind trace/span IDs */
  withTrace(traceId: string, spanId?: string): Logger {
    const clone = this.child('', {});
    clone.traceId = traceId;
    if (spanId) clone.defaultContext.spanId = spanId;
    return clone;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown> & { error?: Error }): void {
    const error = context?.error;
    const ctx = { ...context };
    delete ctx.error;

    this.log('error', message, ctx, error);
  }

  fatal(message: string, context?: Record<string, unknown> & { error?: Error }): void {
    const error = context?.error;
    const ctx = { ...context };
    delete ctx.error;

    this.log('fatal', message, ctx, error);
  }

  /** Check if a level is enabled */
  isLevelEnabled(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.level];
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    if (!this.isLevelEnabled(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      logger: this.name,
      message,
      context: { ...this.defaultContext, ...context },
      requestId: this.requestId,
      traceId: this.traceId,
    };

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as Error & { code?: string }).code,
      };
    }

    for (const transport of this.transports) {
      try {
        transport.write(entry);
      } catch {
        // Logging should never throw
      }
    }
  }
}

// ── Global logger factory ─────────────────────────────────────────────────

let _globalConfig: LoggerConfig = {
  level: (process.env.LOG_LEVEL as LogLevel) ?? 'info',
  transports: [new ConsoleTransport()],
};

export function configureLogger(config: Partial<LoggerConfig>): void {
  _globalConfig = { ..._globalConfig, ...config };
}

export function getLogger(name: string): Logger {
  return new Logger(name, _globalConfig);
}

// ── Pre-configured loggers ────────────────────────────────────────────────

export const appLogger = getLogger('nezha');
