/**
 * YouTube Video Download Command - Download video from YouTube
 */

const keyboards = require('../keyboards/menuKeyboard');
const lang = require('../lang/en.json');
const logger = require('../utils/logger');
const { canDownload, incrementDownloadCount } = require('../utils/dataManager');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'ytmp4',
    description: 'Download YouTube video',
    usage: '/ytmp4 <youtube_url>',
    category: 'download',
    
    async execute(ctx) {
        try {
            const args = ctx.message.text.split(' ');
            const url = args[1];
            
            if (!url) {
                await ctx.reply(
                    `🎬 *YouTube Video Download*\n\n` +
                    `Usage: \`/ytmp4 <youtube_url>\`\n\n` +
                    `Examples:\n` +
                    `\`/ytmp4 https://youtube.com/watch?v=dQw4w9WgXcQ\`\n` +
                    `\`/ytmp4 https://youtu.be/dQw4w9WgXcQ\`\n\n` +
                    `*Supported qualities:*\n` +
                    `• 720p HD (Premium)\n` +
                    `• 480p (Standard)\n` +
                    `• 360p (Mobile)\n` +
                    `• Auto-select best quality`,
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
            await this.downloadVideo(ctx, url);

        } catch (error) {
            logger.error('YouTube MP4 download error:', error);
            await ctx.reply(lang.errors.internalError);
        }
    },

    async downloadVideo(ctx, url) {
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
            
            // Check video duration (limit to 30 minutes for free users, 2 hours for premium)
            const maxDuration = ctx.user.isPremium ? 2 * 60 * 60 : 30 * 60; // seconds
            if (parseInt(videoDetails.lengthSeconds) > maxDuration) {
                const maxTime = ctx.user.isPremium ? '2 hours' : '30 minutes';
                await ctx.telegram.editMessageText(
                    statusMessage.chat.id,
                    statusMessage.message_id,
                    null,
                    `❌ *Video Too Long*\n\n` +
                    `The video is longer than ${maxTime}.\n\n` +
                    `${ctx.user.isPremium ? '' : '**Premium users** can download videos up to 2 hours long!'}`,
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            // Get available formats
            const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
            const qualities = this.getAvailableQualities(formats, ctx.user.isPremium);

            if (qualities.length === 0) {
                await ctx.telegram.editMessageText(
                    statusMessage.chat.id,
                    statusMessage.message_id,
                    null,
                    `❌ *No Compatible Formats*\n\n` +
                    `This video doesn't have compatible download formats.\n` +
                    `Please try a different video.`,
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            // Update status with video info
            await ctx.telegram.editMessageText(
                statusMessage.chat.id,
                statusMessage.message_id,
                null,
                `⏳ *Processing your request...*\n\n` +
                `🎬 **${videoDetails.title}**\n` +
                `⏱️ Duration: ${this.formatDuration(videoDetails.lengthSeconds)}\n` +
                `👀 Views: ${this.formatNumber(videoDetails.viewCount)}\n` +
                `📺 Channel: ${videoDetails.author?.name}\n\n` +
                `📥 Downloading video...`,
                { parse_mode: 'Markdown' }
            );

            // Select best quality (auto-select for now, can be enhanced with quality selection)
            const selectedFormat = this.selectBestFormat(qualities, ctx.user.isPremium);

            // Create temporary file path
            const tempDir = path.join(__dirname, '..', '..', 'temp');
            await fs.promises.mkdir(tempDir, { recursive: true });
            
            const fileName = `${Date.now()}_${ctx.from.id}.mp4`;
            const filePath = path.join(tempDir, fileName);

            // Download video stream
            const videoStream = ytdl(url, {
                format: selectedFormat,
                quality: selectedFormat.quality
            });

            const writeStream = fs.createWriteStream(filePath);
            videoStream.pipe(writeStream);

            let downloadedBytes = 0;
            let totalBytes = parseInt(selectedFormat.contentLength) || 0;

            videoStream.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                // Update progress occasionally (every 5MB)
                if (downloadedBytes % (5 * 1024 * 1024) < chunk.length && totalBytes > 0) {
                    const progress = Math.round((downloadedBytes / totalBytes) * 100);
                    // Could update progress here
                }
            });

            await new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
                videoStream.on('error', reject);
            });

            // Check file size (limit to 50MB for Telegram)
            const stats = await fs.promises.stat(filePath);
            const fileSizeMB = stats.size / (1024 * 1024);
            
            if (fileSizeMB > 50) {
                await ctx.telegram.editMessageText(
                    statusMessage.chat.id,
                    statusMessage.message_id,
                    null,
                    `❌ *File Too Large*\n\n` +
                    `The video file is ${fileSizeMB.toFixed(1)}MB, which exceeds Telegram's 50MB limit.\n\n` +
                    `Try downloading a shorter video or lower quality.`,
                    { parse_mode: 'Markdown' }
                );
                
                // Clean up
                fs.unlink(filePath, () => {});
                return;
            }

            // Update status
            await ctx.telegram.editMessageText(
                statusMessage.chat.id,
                statusMessage.message_id,
                null,
                `⏳ *Processing your request...*\n\n` +
                `🎬 **${videoDetails.title}**\n` +
                `✅ Download complete (${fileSizeMB.toFixed(1)}MB)\n` +
                `📤 Sending file...`,
                { parse_mode: 'Markdown' }
            );

            // Send the video file
            await ctx.replyWithVideo(
                { source: filePath },
                {
                    caption: `🎬 **${videoDetails.title}**\n\n` +
                            `👤 Channel: ${videoDetails.author?.name}\n` +
                            `⏱️ Duration: ${this.formatDuration(videoDetails.lengthSeconds)}\n` +
                            `📊 Quality: ${selectedFormat.qualityLabel || 'Auto'}\n` +
                            `📏 Size: ${fileSizeMB.toFixed(1)}MB\n` +
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
            }, 60000); // Delete after 1 minute

            logger.botLog(ctx.from.id, ctx.from.username, `/ytmp4 ${videoDetails.title}`, true);

        } catch (error) {
            logger.error('Video download error:', error);
            
            await ctx.telegram.editMessageText(
                statusMessage.chat.id,
                statusMessage.message_id,
                null,
                `❌ *Download Failed*\n\n` +
                `Failed to download the video. This might be due to:\n\n` +
                `• Video is private or deleted\n` +
                `• Age-restricted content\n` +
                `• Geographic restrictions\n` +
                `• Video too large for Telegram\n` +
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

    getAvailableQualities(formats, isPremium) {
        const qualityOrder = isPremium ? 
            ['720p', '480p', '360p', '240p'] : 
            ['480p', '360p', '240p'];
        
        const availableFormats = [];
        
        for (const quality of qualityOrder) {
            const format = formats.find(f => f.qualityLabel === quality);
            if (format) {
                availableFormats.push(format);
            }
        }
        
        // If no specific qualities found, get the best available
        if (availableFormats.length === 0 && formats.length > 0) {
            availableFormats.push(formats[0]);
        }
        
        return availableFormats;
    },

    selectBestFormat(qualities, isPremium) {
        // Select best quality based on user tier
        if (isPremium && qualities.length > 0) {
            return qualities[0]; // Highest quality for premium
        } else if (qualities.length > 1) {
            return qualities[1]; // Medium quality for free users
        } else if (qualities.length > 0) {
            return qualities[0]; // Best available
        }
        return null;
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