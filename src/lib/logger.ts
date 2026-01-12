/**
 * Logging utility for Faith & Harmony application.
 * Provides environment-aware logging that can be disabled in production.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
    enabled: boolean;
    minLevel: LogLevel;
    prefix: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

// Default configuration - disable debug/info in production
// Use type assertion to handle Vite's import.meta.env
const isProd = typeof (import.meta as { env?: { PROD?: boolean } }).env?.PROD === 'boolean'
    ? (import.meta as { env?: { PROD?: boolean } }).env?.PROD
    : false;

const defaultConfig: LoggerConfig = {
    enabled: true,
    minLevel: isProd ? 'warn' : 'debug',
    prefix: '[F&H]',
};

let config: LoggerConfig = { ...defaultConfig };

/**
 * Configure the logger
 */
export function configureLogger(newConfig: Partial<LoggerConfig>): void {
    config = { ...config, ...newConfig };
}

/**
 * Check if a log level should be displayed
 */
function shouldLog(level: LogLevel): boolean {
    if (!config.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

/**
 * Format the log message with prefix and timestamp
 */
function formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString().substring(11, 23);
    return `${config.prefix} [${timestamp}] [${level.toUpperCase()}] ${message}`;
}

/**
 * Logger object with methods for each log level
 */
export const logger = {
    debug(message: string, ...args: unknown[]): void {
        if (shouldLog('debug')) {
            console.log(formatMessage('debug', message), ...args);
        }
    },

    info(message: string, ...args: unknown[]): void {
        if (shouldLog('info')) {
            console.info(formatMessage('info', message), ...args);
        }
    },

    warn(message: string, ...args: unknown[]): void {
        if (shouldLog('warn')) {
            console.warn(formatMessage('warn', message), ...args);
        }
    },

    error(message: string, ...args: unknown[]): void {
        if (shouldLog('error')) {
            console.error(formatMessage('error', message), ...args);
        }
    },

    /**
     * Log an error with stack trace
     */
    exception(message: string, error: unknown): void {
        if (shouldLog('error')) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const stack = error instanceof Error ? error.stack : undefined;
            console.error(formatMessage('error', `${message}: ${errorMessage}`));
            if (stack) {
                console.error(stack);
            }
        }
    },

    /**
     * Create a child logger with a specific context
     */
    child(context: string) {
        return {
            debug: (message: string, ...args: unknown[]) =>
                logger.debug(`[${context}] ${message}`, ...args),
            info: (message: string, ...args: unknown[]) =>
                logger.info(`[${context}] ${message}`, ...args),
            warn: (message: string, ...args: unknown[]) =>
                logger.warn(`[${context}] ${message}`, ...args),
            error: (message: string, ...args: unknown[]) =>
                logger.error(`[${context}] ${message}`, ...args),
            exception: (message: string, error: unknown) =>
                logger.exception(`[${context}] ${message}`, error),
        };
    },
};

export default logger;
