/**
 * Demote Command - Remove premium status from users (Admin only)
 */

const keyboards = require('../keyboards/menuKeyboard');
const lang = require('../lang/en.json');
const logger = require('../utils/logger');
const { getUser, setPremiumStatus } = require('../utils/dataManager');

module.exports = {
    name: 'demote',
    description: 'Remove premium status from user',
    usage: '/demote <user_id>',
    category: 'admin',
    adminOnly: true,
    
    async execute(ctx) {
        try {
            // Check if user is admin
            if (ctx.from.id.toString() !== process.env.ADMIN_ID) {
                await ctx.reply(lang.errors.noPermission);
                return;
            }

            const args = ctx.message.text.split(' ');
            const userId = args[1];
            
            if (!userId || isNaN(userId)) {
                await ctx.reply(
                    `👥 *Demote User*\n\n` +
                    `Usage: \`/demote <user_id>\`\n\n` +
                    `Example: \`/demote 123456789\`\n\n` +
                    `This will remove premium status from the specified user.`,
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            // Check if user exists
            const user = await getUser(userId);
            if (!user) {
                await ctx.reply(`❌ User with ID \`${userId}\` not found.`, {
                    parse_mode: 'Markdown'
                });
                return;
            }

            // Check if user is premium
            if (!user.isPremium) {
                await ctx.reply(
                    `👤 User is already a free user!\n\n` +
                    `*User Info:*\n` +
                    `• ID: \`${user.id}\`\n` +
                    `• Name: ${user.firstName || user.username || 'N/A'}\n` +
                    `• Status: 👤 Free User\n` +
                    `• Member since: ${new Date(user.joinedAt).toLocaleDateString()}`,
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            // Confirm demotion
            const confirmMessage = 
                `⚠️ *Confirm User Demotion*\n\n` +
                `*User Info:*\n` +
                `• ID: \`${user.id}\`\n` +
                `• Name: ${user.firstName || user.username || 'N/A'}\n` +
                `• Current Status: 👑 Premium\n` +
                `• Premium since: ${new Date(user.premiumUpdated || user.joinedAt).toLocaleDateString()}\n\n` +
                `Are you sure you want to remove premium status from this user?`;

            await ctx.reply(confirmMessage, {
                parse_mode: 'Markdown',
                reply_markup: keyboards.confirmAction('demote', userId)
            });

            logger.botLog(ctx.from.id, ctx.from.username, '/demote (preparing)', true);

        } catch (error) {
            logger.error('Demote command error:', error);
            await ctx.reply(lang.errors.internalError);
        }
    },

    async confirmDemotion(ctx, userId) {
        try {
            const user = await getUser(userId);
            if (!user) {
                await ctx.reply('❌ User not found.');
                return;
            }

            // Demote user
            const success = await setPremiumStatus(userId, false);
            
            if (success) {
                const successMessage = 
                    `✅ *User Demoted Successfully!*\n\n` +
                    `*User Info:*\n` +
                    `• ID: \`${user.id}\`\n` +
                    `• Name: ${user.firstName || user.username || 'N/A'}\n` +
                    `• Previous Status: 👑 Premium\n` +
                    `• New Status: 👤 Free User\n` +
                    `• Demoted by: ${ctx.from.first_name || ctx.from.username}\n` +
                    `• Date: ${new Date().toLocaleDateString()}`;

                await ctx.editMessageText(successMessage, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboards.closeButton()
                });

                // Notify the user (try to send them a message)
                try {
                    await ctx.telegram.sendMessage(
                        userId,
                        `📢 *Account Status Update*\n\n` +
                        `Your premium status has been removed.\n\n` +
                        `*Current Status:* 👤 Free User\n\n` +
                        `*Free User Limits:*\n` +
                        `• Download limit: 5 per month\n` +
                        `• Basic features only\n\n` +
                        `Contact admin if you believe this was a mistake.`,
                        { parse_mode: 'Markdown' }
                    );
                } catch (notifyError) {
                    logger.warn(`Could not notify user ${userId} about demotion:`, notifyError.message);
                }

                logger.info(`User ${userId} demoted from premium by admin ${ctx.from.id}`);

            } else {
                await ctx.editMessageText('❌ Failed to demote user. Please try again.');
            }

        } catch (error) {
            logger.error('Demote execution error:', error);
            await ctx.reply('❌ Demotion failed. Please try again.');
        }
    }
};