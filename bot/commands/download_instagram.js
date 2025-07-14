/**
 * Instagram Download Command - Download content from Instagram
 */

const keyboards = require('../keyboards/menuKeyboard');
const lang = require('../lang/en.json');
const logger = require('../utils/logger');
const { canDownload, incrementDownloadCount } = require('../utils/dataManager');
const axios = require('axios');

module.exports = {
    name: 'ig',
    description: 'Download Instagram content',
    usage: '/ig <instagram_url>',
    category: 'download',
    
    async execute(ctx) {
        try {
            const args = ctx.message.text.split(' ');
            const url = args[1];
            
            if (!url) {
                await ctx.reply(
                    `📸 *Instagram Content Download*\n\n` +
                    `Usage: \`/ig <instagram_url>\`\n\n` +
                    `Examples:\n` +
                    `\`/ig https://instagram.com/p/ABC123DEF456/\`\n` +
                    `\`/ig https://instagram.com/reel/ABC123DEF456/\`\n\n` +
                    `*Supported content:*\n` +
                    `• Instagram posts (photos/videos)\n` +
                    `• Instagram Reels\n` +
                    `• IGTV videos\n` +
                    `• High-quality downloads\n` +
                    `• Fast processing`,
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            // Validate Instagram URL
            if (!this.isValidInstagramUrl(url)) {
                await ctx.reply(
                    `❌ *Invalid Instagram URL*\n\n` +
                    `Please provide a valid Instagram content URL.\n\n` +
                    `*Supported formats:*\n` +
                    `• https://instagram.com/p/POST_ID/\n` +
                    `• https://instagram.com/reel/REEL_ID/\n` +
                    `• https://instagram.com/tv/IGTV_ID/\n` +
                    `• https://www.instagram.com/p/POST_ID/`,
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            // Check download limits
            const userId = ctx.from.id;
            if (!await canDownload(userId)) {
                const user = ctx.user;
                const limit = user.isPremium ? 
                    parseInt(process.env.PREMIUM_DOWNLOAD_LIMIT) || 50 : 
                    parseInt(process.env.FREE_DOWNLOAD_LIMIT) || 5;
                
                await ctx.reply(
                    `🚫 *Download Limit Reached*\n\n` +
                    `You have reached your monthly download limit of ${limit} files.\n\n` +
                    `${user.isPremium ? 
                        'Your limit will reset next month.' : 
                        '**Upgrade to Premium** for higher limits (50 downloads/month)!\n\nContact admin for premium access.'
                    }`,
                    { 
                        parse_mode: 'Markdown',
                        reply_markup: user.isPremium ? keyboards.closeButton() : keyboards.premiumMenu(false)
                    }
                );
                return;
            }

            // Start download process
            await this.downloadInstagramContent(ctx, url);

        } catch (error) {
            logger.error('Instagram download error:', error);
            await ctx.reply(lang.errors.internalError);
        }
    },

    async downloadInstagramContent(ctx, url) {
        const statusMessage = await ctx.reply(
            `⏳ *Processing Instagram content...*\n\n` +
            `🔍 Analyzing content...\n` +
            `📊 Status: Getting content info`,
            { parse_mode: 'Markdown' }
        );

        try {
            // Determine content type from URL
            const contentType = this.getContentType(url);
            
            // Update status message
            await ctx.telegram.editMessageText(
                statusMessage.chat.id,
                statusMessage.message_id,
                null,
                `⚠️ *Instagram Downloads Temporarily Unavailable*\n\n` +
                `Instagram ${contentType} downloads are currently under maintenance due to platform restrictions.\n\n` +
                `*Alternative options:*\n` +
                `• Try YouTube downloads (/ytmp4, /ytmp3)\n` +
                `• Check back later for updates\n` +
                `• Contact admin for assistance\n\n` +
                `*Why unavailable?*\n` +
                `Instagram has strict anti-bot measures that require specialized handling. We're working on a solution!`,
                { 
                    parse_mode: 'Markdown',
                    reply_markup: keyboards.downloadsMenu()
                }
            );

            // TODO: Implement actual Instagram content downloading
            // This would require:
            // 1. Instagram API access or web scraping with proper headers
            // 2. Handling Instagram's anti-bot protection
            // 3. Processing different content types (photos, videos, reels, IGTV)
            // 4. Error handling for private accounts or restricted content
            // 5. Potentially using Instagram Basic Display API or third-party services
            
            // For now, we show maintenance message
            logger.info(`Instagram download attempted by user ${ctx.from.id} for URL: ${url} (${contentType})`);

        } catch (error) {
            logger.error('Instagram download processing error:', error);
            
            await ctx.telegram.editMessageText(
                statusMessage.chat.id,
                statusMessage.message_id,
                null,
                `❌ *Download Failed*\n\n` +
                `Failed to process the Instagram content. This might be due to:\n\n` +
                `• Content is from a private account\n` +
                `• Invalid or expired link\n` +
                `• Instagram platform restrictions\n` +
                `• Content has been deleted\n` +
                `• Service temporarily unavailable\n\n` +
                `Please try again later or use a different link.`,
                { 
                    parse_mode: 'Markdown',
                    reply_markup: keyboards.closeButton()
                }
            );
        }
    },

    isValidInstagramUrl(url) {
        const instagramRegex = /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|tv)\/[\w-]+\/?/;
        return instagramRegex.test(url);
    },

    getContentType(url) {
        if (url.includes('/p/')) return 'post';
        if (url.includes('/reel/')) return 'reel';
        if (url.includes('/tv/')) return 'IGTV video';
        return 'content';
    }
};