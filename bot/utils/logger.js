/**
 * Logger Utility - Enhanced logging for the bot
 */

const moment = require('moment');

class Logger {
    constructor() {
        this.logLevels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        
        this.currentLevel = process.env.LOG_LEVEL ? 
            this.logLevels[process.env.LOG_LEVEL.toUpperCase()] : 
            this.logLevels.INFO;
    }

    formatMessage(level, message, ...args) {
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        const levelStr = level.padEnd(5);
        
        let fullMessage = `[${timestamp}] ${levelStr} ${message}`;
        
        if (args.length > 0) {
            fullMessage += ' ' + args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
        }
        
        return fullMessage;
    }

    log(level, message, ...args) {
        if (this.logLevels[level] <= this.currentLevel) {
            const formattedMessage = this.formatMessage(level, message, ...args);
            
            switch (level) {
                case 'ERROR':
                    console.error('\x1b[31m%s\x1b[0m', formattedMessage); // Red
                    break;
                case 'WARN':
                    console.warn('\x1b[33m%s\x1b[0m', formattedMessage); // Yellow
                    break;
                case 'INFO':
                    console.info('\x1b[36m%s\x1b[0m', formattedMessage); // Cyan
                    break;
                case 'DEBUG':
                    console.log('\x1b[37m%s\x1b[0m', formattedMessage); // White
                    break;
                default:
                    console.log(formattedMessage);
            }
        }
    }

    error(message, ...args) {
        this.log('ERROR', message, ...args);
    }

    warn(message, ...args) {
        this.log('WARN', message, ...args);
    }

    info(message, ...args) {
        this.log('INFO', message, ...args);
    }

    debug(message, ...args) {
        this.log('DEBUG', message, ...args);
    }

    // Special method for bot interactions
    botLog(userId, username, command, success = true) {
        const status = success ? '✓' : '✗';
        const user = username ? `@${username}` : `ID:${userId}`;
        this.info(`${status} ${user} executed: ${command}`);
    }

    // Performance logging
    timeStart(label) {
        console.time(label);
    }

    timeEnd(label) {
        console.timeEnd(label);
    }
}

module.exports = new Logger();