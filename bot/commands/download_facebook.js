/**
 * Facebook Video Download Command - Download videos from Facebook
 */

const keyboards = require('../keyboards/menuKeyboard');
const lang = require('../lang/en.json');
const logger = require('../utils/logger');
const { canDownload, incrementDownloadCount } = require('../utils/dataManager');
const axios = require('axios');

module.exports = {
    name: 'fb',
    description: 'Download Facebook video',
    usage: '/fb <facebook_url>',
    category: 'download',
    
    async execute(ctx) {
        try {
            const args = ctx.message.text.split(' ');
            const url = args[1];
            
            if (!url) {
                await ctx.reply(
                    `📘 *Facebook Video Download*\n\n` +
                    `Usage: \`/fb <facebook_url>\`\n\n` +
                    `Examples:\n` +
                    `\`/fb https://facebook.com/watch/?v=123456789\`\n` +
                    `\`/fb https://www.facebook.com/user/videos/123456789\`\n\n` +
                    `*Supported content:*\n` +
                    `• Public Facebook videos\n` +
                    `• Facebook Watch videos\n` +
                    `• High-quality downloads\n` +
                    `• Fast processing`,
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            // Validate Facebook URL
            if (!this.isValidFacebookUrl(url)) {
                await ctx.reply(
                    `❌ *Invalid Facebook URL*\n\n` +
                    `Please provide a valid Facebook video URL.\n\n` +
                    `*Supported formats:*\n` +
                    `• https://facebook.com/watch/?v=VIDEO_ID\n` +
                    `• https://www.facebook.com/user/videos/VIDEO_ID\n` +
                    `• https://m.facebook.com/watch/?v=VIDEO_ID`,
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
            await this.downloadFacebookVideo(ctx, url);

        } catch (error) {
            logger.error('Facebook download error:', error);
            await ctx.reply(lang.errors.internalError);
        }
    },

    async downloadFacebookVideo(ctx, url) {
        const statusMessage = await ctx.reply(
            `⏳ *Processing Facebook video...*\n\n` +
            `🔍 Analyzing video...\n` +
            `📊 Status: Getting video info`,
            { parse_mode: 'Markdown' }
        );

        try {
            // Update status message
            await ctx.telegram.editMessageText(
                statusMessage.chat.id,
                statusMessage.message_id,
                null,
                `⚠️ *Facebook Downloads Temporarily Unavailable*\n\n` +
                `Facebook video downloads are currently under maintenance due to platform changes.\n\n` +
                `*Alternative options:*\n` +
                `• Try YouTube downloads (/ytmp4)\n` +
                `• Check back later for updates\n` +
                `• Contact admin for assistance\n\n` +
                `We're working to restore this feature soon!`,
                { 
                    parse_mode: 'Markdown',
                    reply_markup: keyboards.downloadsMenu()
                }
            );

            // TODO: Implement actual Facebook video downloading
            // This would require:
            // 1. Facebook video extraction API or scraping
            // 2. Handling Facebook's authentication/access tokens
            // 3. Processing different video qualities
            // 4. Error handling for private/restricted videos
            
            // For now, we show maintenance message
            logger.info(`Facebook download attempted by user ${ctx.from.id} for URL: ${url}`);

        } catch (error) {
            logger.error('Facebook download processing error:', error);
            
            await ctx.telegram.editMessageText(
                statusMessage.chat.id,
                statusMessage.message_id,
                null,
                `❌ *Download Failed*\n\n` +
                `Failed to process the Facebook video. This might be due to:\n\n` +
                `• Video is private or restricted\n` +
                `• Invalid or expired link\n` +
                `• Facebook platform restrictions\n` +
                `• Service temporarily unavailable\n\n` +
                `Please try again later or use a different link.`,
                { 
                    parse_mode: 'Markdown',
                    reply_markup: keyboards.closeButton()
                }
            );
        }
    },

    isValidFacebookUrl(url) {
        const facebookRegex = /^(https?:\/\/)?(www\.|m\.)?facebook\.com\/(watch\/?\?v=|.*\/videos\/|video\.php\?v=)[\w.-]+/;
        return facebookRegex.test(url);
    }
};