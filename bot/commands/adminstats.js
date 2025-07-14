/**
 * Admin Statistics Command - Show comprehensive bot analytics (Admin only)
 */

const keyboards = require('../keyboards/menuKeyboard');
const lang = require('../lang/en.json');
const logger = require('../utils/logger');
const { getAllUsers, getUserStats, getCommandStats } = require('../utils/dataManager');
const moment = require('moment');

module.exports = {
    name: 'adminstats',
    description: 'View comprehensive bot statistics',
    usage: '/adminstats',
    category: 'admin',
    adminOnly: true,
    
    async execute(ctx) {
        try {
            // Check if user is admin
            if (ctx.from.id.toString() !== process.env.ADMIN_ID) {
                await ctx.reply(lang.errors.noPermission);
                return;
            }

            const statusMessage = await ctx.reply(
                `📊 *Generating Statistics...*\n\nPlease wait while we compile the data...`,
                { parse_mode: 'Markdown' }
            );

            // Get all data
            const users = await getAllUsers();
            const userStats = await getUserStats();
            const commandStats = await getCommandStats();
            
            // Calculate comprehensive statistics
            const stats = this.calculateAdminStats(users, userStats, commandStats);
            
            const statsMessage = 
                `📊 *Bot Administration Statistics*\n\n` +
                
                `👥 *User Statistics:*\n` +
                `• Total Users: ${stats.totalUsers}\n` +
                `• Premium Users: ${stats.premiumUsers} (${stats.premiumPercentage}%)\n` +
                `• Free Users: ${stats.freeUsers}\n` +
                `• Active Today: ${stats.activeToday}\n` +
                `• Active This Week: ${stats.activeWeek}\n` +
                `• New Users Today: ${stats.newToday}\n\n` +
                
                `📈 *Usage Statistics:*\n` +
                `• Total Commands: ${stats.totalCommands}\n` +
                `• Commands Today: ${stats.commandsToday}\n` +
                `• Commands This Week: ${stats.commandsWeek}\n` +
                `• Total Downloads: ${stats.totalDownloads}\n` +
                `• Downloads Today: ${stats.downloadsToday}\n` +
                `• Average per User: ${stats.avgCommandsPerUser}\n\n` +
                
                `🎯 *Top Commands:*\n` +
                stats.topCommands.slice(0, 5).map((cmd, i) => 
                    `${i + 1}. ${cmd.command} (${cmd.count}×)`
                ).join('\n') + '\n\n' +
                
                `📊 *Growth Metrics:*\n` +
                `• Users This Month: ${stats.usersThisMonth}\n` +
                `• Growth Rate: ${stats.growthRate}%\n` +
                `• Retention Rate: ${stats.retentionRate}%\n` +
                `• Premium Conversion: ${stats.premiumConversion}%\n\n` +
                
                `🔄 *System Stats:*\n` +
                `• Bot Uptime: ${this.getUptime()}\n` +
                `• Data Last Updated: ${moment(userStats.lastUpdated).fromNow()}\n` +
                `• Last Command: ${moment(commandStats.lastUpdated).fromNow()}\n\n` +
                
                `📅 *Today's Activity:*\n` +
                `${stats.todayActivity}`;

            await ctx.telegram.editMessageText(
                statusMessage.chat.id,
                statusMessage.message_id,
                null,
                statsMessage,
                {
                    parse_mode: 'Markdown',
                    reply_markup: keyboards.adminMenu()
                }
            );

            logger.botLog(ctx.from.id, ctx.from.username, '/adminstats', true);

        } catch (error) {
            logger.error('Admin stats command error:', error);
            await ctx.reply(lang.errors.internalError);
        }
    },

    calculateAdminStats(users, userStats, commandStats) {
        const now = moment();
        const userIds = Object.keys(users);
        
        let premiumUsers = 0;
        let activeToday = 0;
        let activeWeek = 0;
        let newToday = 0;
        let usersThisMonth = 0;
        let totalDownloads = 0;
        
        // Analyze users
        for (const userId of userIds) {
            const user = users[userId];
            const joinDate = moment(user.joinedAt);
            const lastSeen = moment(user.lastSeen);
            
            if (user.isPremium) premiumUsers++;
            if (lastSeen.isSame(now, 'day')) activeToday++;
            if (lastSeen.isSame(now, 'week')) activeWeek++;
            if (joinDate.isSame(now, 'day')) newToday++;
            if (joinDate.isSame(now, 'month')) usersThisMonth++;
            
            totalDownloads += user.downloadCount || 0;
        }
        
        // Command statistics
        const totalCommands = commandStats.totalCommands || 0;
        const commandsToday = this.getCommandsInPeriod(commandStats, 'day');
        const commandsWeek = this.getCommandsInPeriod(commandStats, 'week');
        const downloadsToday = this.getDownloadsInPeriod(commandStats, 'day');
        
        // Top commands
        const topCommands = Object.entries(commandStats.commandStats || {})
            .map(([command, count]) => ({ command, count }))
            .sort((a, b) => b.count - a.count);
        
        // Calculate percentages
        const totalUsers = userIds.length;
        const freeUsers = totalUsers - premiumUsers;
        const premiumPercentage = totalUsers > 0 ? Math.round((premiumUsers / totalUsers) * 100) : 0;
        const avgCommandsPerUser = totalUsers > 0 ? Math.round(totalCommands / totalUsers) : 0;
        
        // Growth and retention metrics
        const growthRate = this.calculateGrowthRate(users);
        const retentionRate = this.calculateRetentionRate(users);
        const premiumConversion = totalUsers > 0 ? Math.round((premiumUsers / totalUsers) * 100) : 0;
        
        // Today's activity summary
        const todayActivity = this.generateTodayActivity(commandsToday, activeToday, newToday, downloadsToday);
        
        return {
            totalUsers,
            premiumUsers,
            freeUsers,
            premiumPercentage,
            activeToday,
            activeWeek,
            newToday,
            usersThisMonth,
            totalCommands,
            commandsToday,
            commandsWeek,
            totalDownloads,
            downloadsToday,
            avgCommandsPerUser,
            topCommands,
            growthRate,
            retentionRate,
            premiumConversion,
            todayActivity
        };
    },

    getCommandsInPeriod(commandStats, period) {
        // This is a simplified version - in a real implementation,
        // you'd store timestamps for each command to calculate this accurately
        return Math.round((commandStats.totalCommands || 0) * 0.1); // Approximate
    },

    getDownloadsInPeriod(commandStats, period) {
        const downloadCommands = ['/ytmp3', '/ytmp4', '/fb', '/ig'];
        let downloads = 0;
        
        for (const cmd of downloadCommands) {
            downloads += (commandStats.commandStats && commandStats.commandStats[cmd]) || 0;
        }
        
        return Math.round(downloads * 0.1); // Approximate for today
    },

    calculateGrowthRate(users) {
        const now = moment();
        const lastMonth = now.clone().subtract(1, 'month');
        
        let thisMonth = 0;
        let previousMonth = 0;
        
        for (const user of Object.values(users)) {
            const joinDate = moment(user.joinedAt);
            
            if (joinDate.isSame(now, 'month')) {
                thisMonth++;
            } else if (joinDate.isSame(lastMonth, 'month')) {
                previousMonth++;
            }
        }
        
        if (previousMonth === 0) return thisMonth > 0 ? 100 : 0;
        return Math.round(((thisMonth - previousMonth) / previousMonth) * 100);
    },

    calculateRetentionRate(users) {
        const now = moment();
        const lastWeek = now.clone().subtract(1, 'week');
        
        let activeLastWeek = 0;
        let stillActive = 0;
        
        for (const user of Object.values(users)) {
            const lastSeen = moment(user.lastSeen);
            const joinDate = moment(user.joinedAt);
            
            // Users who were active last week
            if (lastSeen.isBetween(lastWeek.clone().subtract(1, 'week'), lastWeek)) {
                activeLastWeek++;
                
                // And are still active this week
                if (lastSeen.isSame(now, 'week')) {
                    stillActive++;
                }
            }
        }
        
        return activeLastWeek > 0 ? Math.round((stillActive / activeLastWeek) * 100) : 0;
    },

    generateTodayActivity(commands, users, newUsers, downloads) {
        let activity = '';
        
        if (commands > 0) activity += `• ${commands} commands executed\n`;
        if (users > 0) activity += `• ${users} active users\n`;
        if (newUsers > 0) activity += `• ${newUsers} new registrations\n`;
        if (downloads > 0) activity += `• ${downloads} files downloaded\n`;
        
        return activity || '• No activity recorded today';
    },

    getUptime() {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
};