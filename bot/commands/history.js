/**
 * History Command - Show download history (Premium only)
 */

const keyboards = require('../keyboards/menuKeyboard');
const lang = require('../lang/en.json');
const logger = require('../utils/logger');
const { getUserLogs } = require('../utils/dataManager');
const moment = require('moment');

module.exports = {
    name: 'history',
    description: 'View your download history',
    usage: '/history [page]',
    category: 'premium',
    premium: true,
    
    async execute(ctx) {
        try {
            // Check if user is premium
            if (!await ctx.requirePremium('/history command')) {
                return;
            }

            const args = ctx.message.text.split(' ');
            const page = parseInt(args[1]) || 1;
            
            const user = ctx.user;
            const logs = await getUserLogs(user.id, 1000); // Get more logs for history
            
            // Filter download commands only
            const downloadLogs = logs.filter(log => 
                log.command.includes('ytmp3') || 
                log.command.includes('ytmp4') || 
                log.command.includes('fb') || 
                log.command.includes('ig')
            );
            
            if (downloadLogs.length === 0) {
                await ctx.reply(
                    `📋 *Download History*\n\n` +
                    `You haven't made any downloads yet.\n\n` +
                    `*Available download commands:*\n` +
                    `• /ytmp3 - YouTube audio\n` +
                    `• /ytmp4 - YouTube video\n` +
                    `• /fb - Facebook video\n` +
                    `• /ig - Instagram content\n\n` +
                    `Start downloading to build your history!`,
                    { 
                        parse_mode: 'Markdown',
                        reply_markup: keyboards.downloadsMenu()
                    }
                );
                return;
            }

            // Pagination
            const itemsPerPage = 10;
            const totalPages = Math.ceil(downloadLogs.length / itemsPerPage);
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pageItems = downloadLogs.slice(startIndex, endIndex);

            // Build history message
            let historyMessage = `📋 *Download History* (Page ${page}/${totalPages})\n\n`;
            
            pageItems.forEach((log, index) => {
                const date = moment(log.timestamp).format('MMM DD, HH:mm');
                const command = log.command.split(' ')[0];
                const url = log.command.split(' ')[1] || '';
                
                // Extract title from metadata if available
                let title = 'Unknown';
                if (log.metadata && log.metadata.title) {
                    title = log.metadata.title;
                } else if (url) {
                    // Try to extract video ID for YouTube links
                    if (url.includes('youtube.com') || url.includes('youtu.be')) {
                        const videoId = this.extractYouTubeId(url);
                        title = videoId ? `Video: ${videoId}` : 'YouTube Video';
                    } else if (url.includes('facebook.com')) {
                        title = 'Facebook Video';
                    } else if (url.includes('instagram.com')) {
                        title = 'Instagram Content';
                    }
                }

                const emoji = this.getCommandEmoji(command);
                const shortTitle = title.length > 30 ? title.substring(0, 27) + '...' : title;
                
                historyMessage += `${startIndex + index + 1}. ${emoji} ${shortTitle}\n`;
                historyMessage += `   📅 ${date} | ${command.toUpperCase()}\n\n`;
            });

            // Add statistics
            const stats = this.calculateHistoryStats(downloadLogs);
            historyMessage += `📊 *Statistics:*\n`;
            historyMessage += `• Total Downloads: ${downloadLogs.length}\n`;
            historyMessage += `• This Month: ${stats.thisMonth}\n`;
            historyMessage += `• Most Used: ${stats.mostUsed}\n`;
            historyMessage += `• First Download: ${stats.firstDownload}`;

            // Create keyboard with pagination
            let keyboard;
            if (totalPages > 1) {
                keyboard = keyboards.pagination(page, totalPages, 'history');
            } else {
                keyboard = keyboards.backButton('menu_main');
            }

            await ctx.reply(historyMessage, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });

            logger.botLog(ctx.from.id, ctx.from.username, `/history page ${page}`, true);

        } catch (error) {
            logger.error('History command error:', error);
            await ctx.reply(lang.errors.internalError);
        }
    },

    calculateHistoryStats(logs) {
        const now = moment();
        let thisMonth = 0;
        const commandCounts = {};
        
        logs.forEach(log => {
            const logDate = moment(log.timestamp);
            const command = log.command.split(' ')[0];
            
            if (logDate.isSame(now, 'month')) {
                thisMonth++;
            }
            
            commandCounts[command] = (commandCounts[command] || 0) + 1;
        });
        
        // Find most used command
        let mostUsed = 'None';
        let maxCount = 0;
        for (const [command, count] of Object.entries(commandCounts)) {
            if (count > maxCount) {
                maxCount = count;
                mostUsed = command.toUpperCase() + ` (${count}×)`;
            }
        }
        
        const firstDownload = logs.length > 0 ? 
            moment(logs[logs.length - 1].timestamp).format('MMM DD, YYYY') : 
            'N/A';
        
        return {
            thisMonth,
            mostUsed,
            firstDownload
        };
    },

    extractYouTubeId(url) {
        const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
    },

    getCommandEmoji(command) {
        switch (command) {
            case '/ytmp3': return '🎵';
            case '/ytmp4': return '🎬';
            case '/fb': return '📘';
            case '/ig': return '📸';
            default: return '📥';
        }
    }
};