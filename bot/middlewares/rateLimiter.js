/**
 * Rate Limiter Middleware - Prevents spam and abuse
 */

const logger = require('../utils/logger');

class RateLimiter {
    constructor() {
        this.userRequests = new Map();
        this.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW) || 60000; // 1 minute
        this.maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10;
        
        // Clean up old entries every 5 minutes
        setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }

    async checkRateLimit(userId) {
        const now = Date.now();
        const userKey = userId.toString();
        
        if (!this.userRequests.has(userKey)) {
            this.userRequests.set(userKey, []);
        }
        
        const requests = this.userRequests.get(userKey);
        
        // Remove old requests outside the time window
        const validRequests = requests.filter(timestamp => 
            now - timestamp < this.windowMs
        );
        
        this.userRequests.set(userKey, validRequests);
        
        // Check if user has exceeded the rate limit
        if (validRequests.length >= this.maxRequests) {
            const oldestRequest = Math.min(...validRequests);
            const resetTime = oldestRequest + this.windowMs;
            const waitTime = Math.ceil((resetTime - now) / 1000);
            
            return {
                allowed: false,
                resetTime: waitTime
            };
        }
        
        // Add current request
        validRequests.push(now);
        this.userRequests.set(userKey, validRequests);
        
        return {
            allowed: true,
            remaining: this.maxRequests - validRequests.length
        };
    }

    cleanup() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [userId, requests] of this.userRequests.entries()) {
            const validRequests = requests.filter(timestamp => 
                now - timestamp < this.windowMs
            );
            
            if (validRequests.length === 0) {
                this.userRequests.delete(userId);
                cleanedCount++;
            } else {
                this.userRequests.set(userId, validRequests);
            }
        }
        
        if (cleanedCount > 0) {
            logger.debug(`Cleaned up ${cleanedCount} rate limit entries`);
        }
    }

    getStats() {
        return {
            activeUsers: this.userRequests.size,
            windowMs: this.windowMs,
            maxRequests: this.maxRequests
        };
    }
}

const rateLimiter = new RateLimiter();

module.exports = async (ctx, next) => {
    try {
        // Skip rate limiting for admin
        if (ctx.from && ctx.from.id.toString() === process.env.ADMIN_ID) {
            return next();
        }
        
        const userId = ctx.from ? ctx.from.id : null;
        if (!userId) {
            return next();
        }
        
        const result = await rateLimiter.checkRateLimit(userId);
        
        if (!result.allowed) {
            logger.warn(`Rate limit exceeded for user ${userId}. Reset in ${result.resetTime}s`);
            
            await ctx.reply(
                `⚠️ *Rate limit exceeded*\n\n` +
                `Please wait ${result.resetTime} seconds before sending another command.\n\n` +
                `*Limit:* ${rateLimiter.maxRequests} requests per ${Math.floor(rateLimiter.windowMs / 1000)} seconds`,
                { parse_mode: 'Markdown' }
            );
            return;
        }
        
        // Add rate limit info to context
        ctx.rateLimit = {
            remaining: result.remaining,
            windowMs: rateLimiter.windowMs,
            maxRequests: rateLimiter.maxRequests
        };
        
        return next();
        
    } catch (error) {
        logger.error('Rate limiter error:', error);
        return next(); // Continue on error to avoid blocking users
    }
};