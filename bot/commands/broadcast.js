/**
 * Broadcast Command - Send message to all users (Admin only)
 */

const keyboards = require('../keyboards/menuKeyboard');
const lang = require('../lang/en.json');
const logger = require('../utils/logger');
const { getAllUsers } = require('../utils/dataManager');

module.exports = {
    name: 'broadcast',
    description: 'Send message to all users',
    usage: '/broadcast <message>',
    category: 'admin',
    adminOnly: true,
    
    async execute(ctx) {
        try {
            // Check if user is admin
            if (ctx.from.id.toString() !== process.env.ADMIN_ID) {
                await ctx.reply(lang.errors.noPermission);
                return;
            }

            const message = ctx.message.text.split(' ').slice(1).join(' ');
            
            if (!message || message.trim().length === 0) {
                await ctx.reply(
                    `📢 *Broadcast Command*\n\n` +
                    `Usage: \`/broadcast <message>\`\n\n` +
                    `Example: \`/broadcast 🎉 New features coming soon!\`\n\n` +
                    `This will send the message to all bot users.`,
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            // Get all users
            const users = await getAllUsers();
            const userIds = Object.keys(users);
            
            if (userIds.length === 0) {
                await ctx.reply('❌ No users found to broadcast to.');
                return;
            }

            // Confirm broadcast
            const confirmMessage = 
                `📢 *Confirm Broadcast*\n\n` +
                `*Message:*\n${message}\n\n` +
                `*Recipients:* ${userIds.length} users\n\n` +
                `Are you sure you want to send this message to all users?`;

            await ctx.reply(confirmMessage, {
                parse_mode: 'Markdown',
                reply_markup: keyboards.confirmAction('broadcast', Buffer.from(message).toString('base64'))
            });

            logger.botLog(ctx.from.id, ctx.from.username, '/broadcast (preparing)', true);

        } catch (error) {
            logger.error('Broadcast command error:', error);
            await ctx.reply(lang.errors.internalError);
        }
    },

    async confirmBroadcast(ctx, message) {
        try {
            const users = await getAllUsers();
            const userIds = Object.keys(users);
            
            let successCount = 0;
            let failCount = 0;
            
            // Send status message
            const statusMsg = await ctx.reply(
                `📡 *Broadcasting...*\n\n` +
                `Sending to ${userIds.length} users...\n` +
                `Progress: 0/${userIds.length}`,
                { parse_mode: 'Markdown' }
            );

            // Broadcast to all users
            for (let i = 0; i < userIds.length; i++) {
                const userId = userIds[i];
                
                try {
                    await ctx.telegram.sendMessage(userId, `📢 *Broadcast Message*\n\n${message}`, {
                        parse_mode: 'Markdown'
                    });
                    successCount++;
                } catch (error) {
                    logger.warn(`Failed to send broadcast to user ${userId}:`, error.message);
                    failCount++;
                }
                
                // Update progress every 10 users
                if ((i + 1) % 10 === 0 || i === userIds.length - 1) {
                    try {
                        await ctx.telegram.editMessageText(
                            statusMsg.chat.id,
                            statusMsg.message_id,
                            null,
                            `📡 *Broadcasting...*\n\n` +
                            `Progress: ${i + 1}/${userIds.length}\n` +
                            `✅ Sent: ${successCount}\n` +
                            `❌ Failed: ${failCount}`,
                            { parse_mode: 'Markdown' }
                        );
                    } catch (editError) {
                        // Ignore edit errors
                    }
                }
            }
            
            // Final status
            const finalMessage = 
                `✅ *Broadcast Complete*\n\n` +
                `📊 *Results:*\n` +
                `• Total users: ${userIds.length}\n` +
                `• Successfully sent: ${successCount}\n` +
                `• Failed: ${failCount}\n` +
                `• Success rate: ${Math.round((successCount / userIds.length) * 100)}%\n\n` +
                `*Message:* ${message}`;

            await ctx.telegram.editMessageText(
                statusMsg.chat.id,
                statusMsg.message_id,
                null,
                finalMessage,
                { 
                    parse_mode: 'Markdown',
                    reply_markup: keyboards.closeButton()
                }
            );

            logger.info(`Broadcast completed: ${successCount}/${userIds.length} sent successfully`);

        } catch (error) {
            logger.error('Broadcast execution error:', error);
            await ctx.reply('❌ Broadcast failed. Please try again.');
        }
    }
};