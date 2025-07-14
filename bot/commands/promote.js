/**
 * Promote Command - Grant premium status to users (Admin only)
 */

const keyboards = require('../keyboards/menuKeyboard');
const lang = require('../lang/en.json');
const logger = require('../utils/logger');
const { getUser, setPremiumStatus } = require('../utils/dataManager');

module.exports = {
    name: 'promote',
    description: 'Promote user to premium status',
    usage: '/promote <user_id>',
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
                    `👑 *Promote User*\n\n` +
                    `Usage: \`/promote <user_id>\`\n\n` +
                    `Example: \`/promote 123456789\`\n\n` +
                    `This will grant premium status to the specified user.`,
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

            // Check if user is already premium
            if (user.isPremium) {
                await ctx.reply(
                    `👑 User is already premium!\n\n` +
                    `*User Info:*\n` +
                    `• ID: \`${user.id}\`\n` +
                    `• Name: ${user.firstName || user.username || 'N/A'}\n` +
                    `• Status: 👑 Premium\n` +
                    `• Premium since: ${new Date(user.premiumUpdated || user.joinedAt).toLocaleDateString()}`,
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            // Promote user
            const success = await setPremiumStatus(userId, true);
            
            if (success) {
                const successMessage = 
                    `✅ *User Promoted Successfully!*\n\n` +
                    `*User Info:*\n` +
                    `• ID: \`${user.id}\`\n` +
                    `• Name: ${user.firstName || user.username || 'N/A'}\n` +
                    `• Previous Status: 👤 Free\n` +
                    `• New Status: 👑 Premium\n` +
                    `• Promoted by: ${ctx.from.first_name || ctx.from.username}\n` +
                    `• Date: ${new Date().toLocaleDateString()}`;

                await ctx.reply(successMessage, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboards.closeButton()
                });

                // Notify the user (try to send them a message)
                try {
                    await ctx.telegram.sendMessage(
                        userId,
                        `🎉 *Congratulations!*\n\n` +
                        `You have been promoted to *Premium* status!\n\n` +
                        `*Premium Benefits:*\n` +
                        `• Higher download limits (50 vs 5)\n` +
                        `• Advanced statistics\n` +
                        `• Download history\n` +
                        `• Priority support\n` +
                        `• Access to all features\n\n` +
                        `Thank you for using our bot! 🚀`,
                        { parse_mode: 'Markdown' }
                    );
                } catch (notifyError) {
                    logger.warn(`Could not notify user ${userId} about promotion:`, notifyError.message);
                }

                logger.info(`User ${userId} promoted to premium by admin ${ctx.from.id}`);

            } else {
                await ctx.reply('❌ Failed to promote user. Please try again.');
            }

        } catch (error) {
            logger.error('Promote command error:', error);
            await ctx.reply(lang.errors.internalError);
        }
    }
};