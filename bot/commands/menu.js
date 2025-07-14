/**
 * Menu Command - Display interactive main menu
 */

const keyboards = require('../keyboards/menuKeyboard');
const lang = require('../lang/en.json');
const logger = require('../utils/logger');

module.exports = {
    name: 'menu',
    description: 'Open interactive main menu',
    usage: '/menu',
    category: 'basic',
    
    async execute(ctx) {
        try {
            const user = ctx.user;
            const userName = user.firstName || user.username || 'User';
            
            const menuMessage = 
                `👋 Hello ${userName}!\n\n` +
                `${lang.menu.main}\n\n` +
                `*Account Info:*\n` +
                `• Status: ${user.isPremium ? '👑 Premium' : '👤 Free User'}\n` +
                `• Downloads: ${user.downloadCount || 0}\n` +
                `• Member since: ${new Date(user.joinedAt).toLocaleDateString()}\n\n` +
                `Select an option below:`;

            await ctx.reply(menuMessage, {
                parse_mode: 'Markdown',
                reply_markup: keyboards.mainMenu()
            });

            logger.botLog(ctx.from.id, ctx.from.username, '/menu', true);

        } catch (error) {
            logger.error('Menu command error:', error);
            await ctx.reply(lang.errors.internalError);
        }
    }
};