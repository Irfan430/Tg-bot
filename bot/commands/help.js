/**
 * Help Command - Show available commands and usage
 */

const keyboards = require('../keyboards/menuKeyboard');
const lang = require('../lang/en.json');
const logger = require('../utils/logger');

module.exports = {
    name: 'help',
    description: 'Show available commands and usage',
    usage: '/help',
    category: 'basic',
    
    async execute(ctx) {
        try {
            const user = ctx.user;
            const isAdmin = ctx.from.id.toString() === process.env.ADMIN_ID;
            
            // Basic commands
            let helpMessage = `${lang.help.title}\n\n`;
            
            for (const [command, description] of Object.entries(lang.help.commands)) {
                helpMessage += `/${command} - ${description}\n`;
            }
            
            // Premium commands (only show if user is premium)
            if (user.isPremium) {
                helpMessage += `\n${lang.help.premium.title}\n`;
                for (const [command, description] of Object.entries(lang.help.premium.commands)) {
                    helpMessage += `/${command} - ${description}\n`;
                }
            }
            
            // Admin commands (only show to admin)
            if (isAdmin) {
                helpMessage += `\n👨‍💼 *Admin Commands*\n`;
                helpMessage += `/promote <user_id> - Promote user to premium\n`;
                helpMessage += `/demote <user_id> - Remove premium from user\n`;
                helpMessage += `/broadcast <message> - Send message to all users\n`;
                helpMessage += `/adminstats - View detailed bot statistics\n`;
            }
            
            helpMessage += `\n💡 *Tips:*\n`;
            helpMessage += `• Use /menu for interactive interface\n`;
            helpMessage += `• Premium users get higher download limits\n`;
            helpMessage += `• All downloads are temporary and auto-deleted\n`;
            
            if (!user.isPremium) {
                helpMessage += `\n${lang.premium.contact}`;
            }

            await ctx.reply(helpMessage, {
                parse_mode: 'Markdown',
                reply_markup: keyboards.backButton('menu_main')
            });

            logger.botLog(ctx.from.id, ctx.from.username, '/help', true);

        } catch (error) {
            logger.error('Help command error:', error);
            await ctx.reply(lang.errors.internalError);
        }
    }
};