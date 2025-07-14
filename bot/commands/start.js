/**
 * Start Command - Welcome new users to the bot
 */

const keyboards = require('../keyboards/menuKeyboard');
const lang = require('../lang/en.json');
const logger = require('../utils/logger');

module.exports = {
    name: 'start',
    description: 'Start the bot and see welcome message',
    usage: '/start',
    category: 'basic',
    
    async execute(ctx) {
        try {
            const user = ctx.user;
            const welcomeMessage = 
                `${lang.welcome.title}\n\n` +
                `${lang.welcome.description}\n\n` +
                `*Features:*\n` +
                lang.welcome.features.map(feature => `• ${feature}`).join('\n') + '\n\n' +
                `${lang.welcome.getStarted}\n\n` +
                `*Your Status:* ${user.isPremium ? '👑 Premium' : '👤 Free'}\n` +
                `*User ID:* \`${user.id}\``;

            await ctx.reply(welcomeMessage, {
                parse_mode: 'Markdown',
                reply_markup: keyboards.mainMenu()
            });

            logger.botLog(ctx.from.id, ctx.from.username, '/start', true);

        } catch (error) {
            logger.error('Start command error:', error);
            await ctx.reply(lang.errors.internalError);
        }
    }
};