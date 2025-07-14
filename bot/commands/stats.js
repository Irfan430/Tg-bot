/**
 * Stats Command - Show user statistics (Premium only)
 */

const keyboards = require('../keyboards/menuKeyboard');
const lang = require('../lang/en.json');
const logger = require('../utils/logger');
const { getUserLogs } = require('../utils/dataManager');
const moment = require('moment');

module.exports = {
    name: 'stats',
    description: 'View your usage statistics',
    usage: '/stats',
    category: 'premium',
    premium: true,
    
    async execute(ctx) {
        try {
            // Check if user is premium
            if (!await ctx.requirePremium('/stats command')) {
                return;
            }

            const user = ctx.user;
            const logs = await getUserLogs(user.id, 1000);
            
            // Calculate statistics
            const stats = this.calculateStats(user, logs);
            
            const statsMessage = 
                `${lang.stats.title}\n\n` +
                `👤 *User Information:*\n` +
                `• Name: ${user.firstName || user.username || 'N/A'}\n` +
                `• Status: ${user.isPremium ? '👑 Premium' : '👤 Free'}\n` +
                `• User ID: \`${user.id}\`\n\n` +
                
                `📊 *Usage Statistics:*\n` +
                `• ${lang.stats.totalDownloads}: ${stats.totalDownloads}\n` +
                `• ${lang.stats.memberSince}: ${stats.memberSince}\n` +
                `• ${lang.stats.lastActivity}: ${stats.lastActivity}\n` +
                `• Total Commands: ${stats.totalCommands}\n\n` +
                
                `📈 *This Month:*\n` +
                `• Downloads: ${stats.monthlyDownloads}\n` +
                `• Commands: ${stats.monthlyCommands}\n` +
                `• Most Used: ${stats.mostUsedCommand}\n\n` +
                
                `📅 *Recent Activity:*\n` +
                `• Today: ${stats.todayCommands} commands\n` +
                `• This Week: ${stats.weeklyCommands} commands\n` +
                `• Average per day: ${stats.avgPerDay}\n\n` +
                
                `🎯 *Top Commands:*\n` +
                stats.topCommands.slice(0, 5).map((cmd, i) => 
                    `${i + 1}. ${cmd.command} (${cmd.count}×)`
                ).join('\n');

            await ctx.reply(statsMessage, {
                parse_mode: 'Markdown',
                reply_markup: keyboards.backButton('menu_main')
            });

            logger.botLog(ctx.from.id, ctx.from.username, '/stats', true);

        } catch (error) {
            logger.error('Stats command error:', error);
            await ctx.reply(lang.errors.internalError);
        }
    },

    calculateStats(user, logs) {
        const now = moment();
        const joinDate = moment(user.joinedAt);
        const lastSeen = moment(user.lastSeen);
        
        // Group logs by command
        const commandCounts = {};
        let monthlyCommands = 0;
        let monthlyDownloads = 0;
        let todayCommands = 0;
        let weeklyCommands = 0;
        
        logs.forEach(log => {
            const logDate = moment(log.timestamp);
            const command = log.command.split(' ')[0];
            
            commandCounts[command] = (commandCounts[command] || 0) + 1;
            
            if (logDate.isSame(now, 'month')) {
                monthlyCommands++;
                if (command.includes('mp3') || command.includes('mp4') || command.includes('fb') || command.includes('ig')) {
                    monthlyDownloads++;
                }
            }
            
            if (logDate.isSame(now, 'day')) {
                todayCommands++;
            }
            
            if (logDate.isSame(now, 'week')) {
                weeklyCommands++;
            }
        });
        
        // Sort commands by usage
        const topCommands = Object.entries(commandCounts)
            .map(([command, count]) => ({ command, count }))
            .sort((a, b) => b.count - a.count);
        
        const mostUsedCommand = topCommands.length > 0 ? topCommands[0].command : 'None';
        
        // Calculate averages
        const daysSinceJoin = now.diff(joinDate, 'days') || 1;
        const avgPerDay = Math.round(logs.length / daysSinceJoin * 10) / 10;
        
        return {
            totalDownloads: user.downloadCount || 0,
            memberSince: joinDate.format('MMM DD, YYYY'),
            lastActivity: lastSeen.fromNow(),
            totalCommands: logs.length,
            monthlyCommands,
            monthlyDownloads,
            todayCommands,
            weeklyCommands,
            mostUsedCommand,
            topCommands,
            avgPerDay
        };
    }
};