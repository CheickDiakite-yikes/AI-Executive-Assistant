
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const root = typeof window !== 'undefined' ? window : globalThis;

const getDefaultLevel = (): LogLevel => {
    if (typeof window !== 'undefined') {
        const host = window.location?.hostname;
        if (host === 'localhost' || host === '127.0.0.1') {
            return 'debug';
        }
    }
    return 'info';
};

const resolveLogLevel = (): LogLevel => {
    const explicit = (root as any).__MAYA_LOG_LEVEL || (typeof process !== 'undefined' && process?.env?.MAYA_LOG_LEVEL);
    const normalized = typeof explicit === 'string' ? explicit.toLowerCase() : '';
    if (normalized in LOG_LEVELS) {
        return normalized as LogLevel;
    }
    return getDefaultLevel();
};

const safeStringify = (data: unknown) => {
    const seen = new WeakSet();
    return JSON.stringify(
        data,
        (_key, value) => {
            if (value instanceof Error) {
                return { name: value.name, message: value.message, stack: value.stack };
            }
            if (typeof value === 'bigint') {
                return value.toString();
            }
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '[Circular]';
                }
                seen.add(value);
            }
            return value;
        },
        2,
    );
};

const shouldLog = (level: LogLevel) => {
    const current = resolveLogLevel();
    return LOG_LEVELS[level] >= LOG_LEVELS[current];
};

class Logger {
    private static formatMessage(level: LogLevel, category: string, message: string, data?: any) {
        const timestamp = new Date().toISOString();
        const dataString = data ? `\nData: ${safeStringify(data)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] [${category}] ${message}${dataString}`;
    }

    static info(category: string, message: string, data?: any) {
        if (!shouldLog('info')) return;
        console.log(this.formatMessage('info', category, message, data));
    }

    static warn(category: string, message: string, data?: any) {
        if (!shouldLog('warn')) return;
        console.warn(this.formatMessage('warn', category, message, data));
    }

    static error(category: string, message: string, data?: any) {
        if (!shouldLog('error')) return;
        console.error(this.formatMessage('error', category, message, data));
    }

    static debug(category: string, message: string, data?: any) {
        if (!shouldLog('debug')) return;
        console.debug(this.formatMessage('debug', category, message, data));
    }
}

export default Logger;
