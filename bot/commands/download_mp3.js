/**
 * YouTube MP3 Download Command - Download audio from YouTube
 */

const keyboards = require('../keyboards/menuKeyboard');
const lang = require('../lang/en.json');
const logger = require('../utils/logger');
const { canDownload, incrementDownloadCount } = require('../utils/dataManager');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'ytmp3',
    description: 'Download YouTube audio',
    usage: '/ytmp3 <youtube_url>',
    category: 'download',
    
    async execute(ctx) {
        try {
            const args = ctx.message.text.split(' ');
            const url = args[1];
            
            if (!url) {
                await ctx.reply(
                    `🎵 *YouTube Audio Download*\n\n` +
                    `Usage: \`/ytmp3 <youtube_url>\`\n\n` +
                    `Examples:\n` +
                    `\`/ytmp3 https://youtube.com/watch?v=dQw4w9WgXcQ\`\n` +
                    `\`/ytmp3 https://youtu.be/dQw4w9WgXcQ\`\n\n` +
                    `*Supported formats:*\n` +
                    `• MP3 audio (320kbps, 256kbps, 128kbps)\n` +
                    `• Automatic quality selection\n` +
                    `• Fast processing`,
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            // Validate YouTube URL
            if (!this.isValidYouTubeUrl(url)) {
                await ctx.reply(
                    `❌ *Invalid YouTube URL*\n\n` +
                    `Please provide a valid YouTube URL.\n\n` +
                    `*Supported formats:*\n` +
                    `• https://youtube.com/watch?v=VIDEO_ID\n` +
                    `• https://youtu.be/VIDEO_ID\n` +
                    `• https://m.youtube.com/watch?v=VIDEO_ID`,
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
            await this.downloadAudio(ctx, url);

        } catch (error) {
            logger.error('YouTube MP3 download error:', error);
            await ctx.reply(lang.errors.internalError);
        }
    },

    async downloadAudio(ctx, url) {
        const statusMessage = await ctx.reply(
            `⏳ *Processing your request...*\n\n` +
            `🔍 Analyzing video...\n` +
            `📊 Status: Getting video info`,
            { parse_mode: 'Markdown' }
        );

        try {
            // Get video info
            const info = await ytdl.getInfo(url);
            const videoDetails = info.videoDetails;
            
            // Check video duration (limit to 1 hour for free users, 3 hours for premium)
            const maxDuration = ctx.user.isPremium ? 3 * 60 * 60 : 60 * 60; // seconds
            if (parseInt(videoDetails.lengthSeconds) > maxDuration) {
                const maxTime = ctx.user.isPremium ? '3 hours' : '1 hour';
                await ctx.telegram.editMessageText(
                    statusMessage.chat.id,
                    statusMessage.message_id,
                    null,
                    `❌ *Video Too Long*\n\n` +
                    `The video is longer than ${maxTime}.\n\n` +
                    `${ctx.user.isPremium ? '' : '**Premium users** can download videos up to 3 hours long!'}`,
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            // Update status
            await ctx.telegram.editMessageText(
                statusMessage.chat.id,
                statusMessage.message_id,
                null,
                `⏳ *Processing your request...*\n\n` +
                `🎵 **${videoDetails.title}**\n` +
                `⏱️ Duration: ${this.formatDuration(videoDetails.lengthSeconds)}\n` +
                `👀 Views: ${this.formatNumber(videoDetails.viewCount)}\n\n` +
                `📥 Downloading audio...`,
                { parse_mode: 'Markdown' }
            );

            // Create temporary file path
            const tempDir = path.join(__dirname, '..', '..', 'temp');
            await fs.promises.mkdir(tempDir, { recursive: true });
            
            const fileName = `${Date.now()}_${ctx.from.id}.mp3`;
            const filePath = path.join(tempDir, fileName);

            // Download audio stream
            const audioStream = ytdl(url, {
                filter: 'audioonly',
                quality: 'highestaudio',
                format: 'mp3'
            });

            const writeStream = fs.createWriteStream(filePath);
            audioStream.pipe(writeStream);

            let downloadedBytes = 0;
            audioStream.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                // Update progress occasionally
            });

            await new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
                audioStream.on('error', reject);
            });

            // Update status
            await ctx.telegram.editMessageText(
                statusMessage.chat.id,
                statusMessage.message_id,
                null,
                `⏳ *Processing your request...*\n\n` +
                `🎵 **${videoDetails.title}**\n` +
                `✅ Download complete\n` +
                `📤 Sending file...`,
                { parse_mode: 'Markdown' }
            );

            // Send the audio file
            await ctx.replyWithAudio(
                { source: filePath },
                {
                    title: videoDetails.title,
                    performer: videoDetails.author?.name || 'Unknown Artist',
                    caption: `🎵 **${videoDetails.title}**\n\n` +
                            `👤 Channel: ${videoDetails.author?.name}\n` +
                            `⏱️ Duration: ${this.formatDuration(videoDetails.lengthSeconds)}\n` +
                            `🔗 [Original Video](${url})`,
                    parse_mode: 'Markdown'
                }
            );

            // Delete status message
            await ctx.telegram.deleteMessage(statusMessage.chat.id, statusMessage.message_id);

            // Increment download count
            await incrementDownloadCount(ctx.from.id);

            // Clean up temp file
            setTimeout(() => {
                fs.unlink(filePath, (err) => {
                    if (err) logger.warn('Failed to delete temp file:', err);
                });
            }, 30000); // Delete after 30 seconds

            logger.botLog(ctx.from.id, ctx.from.username, `/ytmp3 ${videoDetails.title}`, true);

        } catch (error) {
            logger.error('Audio download error:', error);
            
            await ctx.telegram.editMessageText(
                statusMessage.chat.id,
                statusMessage.message_id,
                null,
                `❌ *Download Failed*\n\n` +
                `Failed to download the audio. This might be due to:\n\n` +
                `• Video is private or deleted\n` +
                `• Age-restricted content\n` +
                `• Geographic restrictions\n` +
                `• Server overload\n\n` +
                `Please try again with a different video.`,
                { 
                    parse_mode: 'Markdown',
                    reply_markup: keyboards.closeButton()
                }
            );
        }
    },

    isValidYouTubeUrl(url) {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|m\.youtube\.com\/watch\?v=)[\w-]+(&[\w=]*)?$/;
        return youtubeRegex.test(url) && ytdl.validateURL(url);
    },

    formatDuration(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
};