/**
 * Premium Check Middleware - Verifies user premium status
 */

const { getUser, saveUser, isPremiumUser } = require('../utils/dataManager');
const logger = require('../utils/logger');

module.exports = async (ctx, next) => {
    try {
        if (!ctx.from) {
            return next();
        }
        
        const userId = ctx.from.id;
        const username = ctx.from.username;
        const firstName = ctx.from.first_name;
        const lastName = ctx.from.last_name;
        
        // Get or create user
        let user = await getUser(userId);
        
        if (!user) {
            // New user, create entry
            user = {
                id: userId,
                username: username || null,
                firstName: firstName || null,
                lastName: lastName || null,
                isPremium: false,
                joinedAt: new Date().toISOString(),
                downloadCount: 0,
                totalCommands: 0
            };
            
            await saveUser(userId, user);
            logger.info(`New user registered: ${username || firstName || userId}`);
        } else {
            // Update user info if changed
            let updated = false;
            
            if (user.username !== username) {
                user.username = username;
                updated = true;
            }
            
            if (user.firstName !== firstName) {
                user.firstName = firstName;
                updated = true;
            }
            
            if (user.lastName !== lastName) {
                user.lastName = lastName;
                updated = true;
            }
            
            if (updated) {
                await saveUser(userId, user);
            }
        }
        
        // Add user info to context
        ctx.user = user;
        ctx.isPremium = user.isPremium;
        
        // Helper function to check if command requires premium
        ctx.requirePremium = async (commandName = 'this command') => {
            if (!user.isPremium) {
                const premiumMessage = 
                    `🔒 *Premium Required*\n\n` +
                    `${commandName} is available only for premium users.\n\n` +
                    `*Premium Benefits:*\n` +
                    `• Higher download limits\n` +
                    `• Advanced statistics\n` +
                    `• Priority support\n` +
                    `• Access to all features\n\n` +
                    `Contact admin to upgrade to premium.`;
                
                await ctx.reply(premiumMessage, { parse_mode: 'Markdown' });
                return false;
            }
            return true;
        };
        
        return next();
        
    } catch (error) {
        logger.error('Premium check middleware error:', error);
        return next(); // Continue on error
    }
};