/**
 * Logger structuré.
 * En production, seuls les niveaux error et warn sont affichés.
 * En développement, tous les niveaux sont affichés.
 * Configurable via la variable d'environnement LOG_LEVEL.
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 } as const;
type LogLevel = keyof typeof LEVELS;

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 
    (process.env.NODE_ENV === 'production' ? 'warn' : 'debug');

const shouldLog = (level: LogLevel): boolean => LEVELS[level] <= LEVELS[currentLevel];

const timestamp = (): string => new Date().toISOString();

export const logger = {
    error: (...args: any[]) => {
        if (shouldLog('error')) console.error(`[${timestamp()}] [ERROR]`, ...args);
    },
    warn: (...args: any[]) => {
        if (shouldLog('warn')) console.warn(`[${timestamp()}] [WARN]`, ...args);
    },
    info: (...args: any[]) => {
        if (shouldLog('info')) console.log(`[${timestamp()}] [INFO]`, ...args);
    },
    debug: (...args: any[]) => {
        if (shouldLog('debug')) console.log(`[${timestamp()}] [DEBUG]`, ...args);
    },
};
