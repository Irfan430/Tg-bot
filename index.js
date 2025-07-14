/**
 * Premium Telegram Bot - Main Entry Point
 * Features auto-command loading, premium system, and advanced media downloads
 */

const { Telegraf } = require('telegraf');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Import middlewares
const rateLimiter = require('./bot/middlewares/rateLimiter');
const premiumCheck = require('./bot/middlewares/premiumCheck');

// Import utilities
const { initializeData, logCommand } = require('./bot/utils/dataManager');
const logger = require('./bot/utils/logger');

class PremiumBot {
    constructor() {
        this.bot = new Telegraf(process.env.BOT_TOKEN);
        this.commands = new Map();
        this.middlewares = [];
    }

    async initialize() {
        try {
            // Initialize data files
            await initializeData();
            
            // Load middlewares
            this.loadMiddlewares();
            
            // Load all commands automatically
            await this.loadCommands();
            
            // Setup inline mode
            this.setupInlineMode();
            
            // Setup callback query handlers
            this.setupCallbackHandlers();
            
            // Setup error handlers
            this.setupErrorHandlers();
            
            // Start bot
            await this.start();
            
        } catch (error) {
            logger.error('Failed to initialize bot:', error);
            process.exit(1);
        }
    }

    loadMiddlewares() {
        // Apply rate limiting
        this.bot.use(rateLimiter);
        
        // Apply premium check (will be used by commands that need it)
        this.bot.use(premiumCheck);
        
        // Log all commands
        this.bot.use(async (ctx, next) => {
            if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/')) {
                await logCommand(ctx.from.id, ctx.message.text);
            }
            return next();
        });
    }

    async loadCommands() {
        const commandsPath = path.join(__dirname, 'bot', 'commands');
        
        try {
            const commandFiles = await fs.readdir(commandsPath);
            const jsFiles = commandFiles.filter(file => file.endsWith('.js'));
            
            logger.info(`Loading ${jsFiles.length} commands...`);
            
            for (const file of jsFiles) {
                try {
                    const commandPath = path.join(commandsPath, file);
                    const command = require(commandPath);
                    
                    if (command && command.name && command.execute) {
                        // Register command with bot
                        this.bot.command(command.name, command.execute);
                        
                        // Store command info
                        this.commands.set(command.name, {
                            ...command,
                            file: file
                        });
                        
                        logger.info(`✓ Loaded command: /${command.name} from ${file}`);
                    } else {
                        logger.warn(`⚠ Invalid command structure in ${file}`);
                    }
                } catch (error) {
                    logger.error(`✗ Failed to load command from ${file}:`, error.message);
                }
            }
            
            logger.info(`Successfully loaded ${this.commands.size} commands`);
            
        } catch (error) {
            logger.error('Failed to load commands directory:', error);
        }
    }

    setupInlineMode() {
        this.bot.on('inline_query', async (ctx) => {
            try {
                const query = ctx.inlineQuery.query;
                const results = [];
                
                // Search through available commands
                for (const [name, command] of this.commands) {
                    if (command.description && name.toLowerCase().includes(query.toLowerCase())) {
                        results.push({
                            type: 'article',
                            id: name,
                            title: `/${name}`,
                            description: command.description,
                            input_message_content: {
                                message_text: `/${name}`
                            }
                        });
                    }
                }
                
                await ctx.answerInlineQuery(results.slice(0, 10));
                
            } catch (error) {
                logger.error('Inline query error:', error);
            }
        });
    }

    setupCallbackHandlers() {
        const keyboards = require('./bot/keyboards/menuKeyboard');
        
        this.bot.on('callback_query', async (ctx) => {
            try {
                const data = ctx.callbackQuery.data;
                const user = ctx.user;
                
                // Handle menu navigation
                if (data === 'menu_main') {
                    await ctx.editMessageText(
                        `👋 Hello ${user.firstName || user.username || 'User'}!\n\n` +
                        `🏠 Main Menu - Choose an option:\n\n` +
                        `*Account Info:*\n` +
                        `• Status: ${user.isPremium ? '👑 Premium' : '👤 Free User'}\n` +
                        `• Downloads: ${user.downloadCount || 0}\n` +
                        `• Member since: ${new Date(user.joinedAt).toLocaleDateString()}\n\n` +
                        `Select an option below:`,
                        {
                            parse_mode: 'Markdown',
                            reply_markup: keyboards.mainMenu()
                        }
                    );
                } else if (data === 'menu_downloads') {
                    await ctx.editMessageText(
                        `📥 Download Options\n\n` +
                        `Choose what you want to download:\n\n` +
                        `*Available Services:*\n` +
                        `• YouTube Audio/Video\n` +
                        `• Facebook Videos (coming soon)\n` +
                        `• Instagram Content (coming soon)\n\n` +
                        `Select a download option:`,
                        {
                            parse_mode: 'Markdown',
                            reply_markup: keyboards.downloadsMenu()
                        }
                    );
                } else if (data === 'menu_premium') {
                    await ctx.editMessageText(
                        `👑 Premium Features\n\n` +
                        `${user.isPremium ? 
                            `You are a **Premium** user! 🎉\n\n*Your Benefits:*\n• Higher download limits\n• Advanced statistics\n• Download history\n• Priority support` :
                            `Upgrade to **Premium** for enhanced features!\n\n*Premium Benefits:*\n• 50 downloads/month (vs 5 free)\n• Advanced statistics\n• Download history\n• Priority support\n• Extended video length limits`
                        }`,
                        {
                            parse_mode: 'Markdown',
                            reply_markup: keyboards.premiumMenu(user.isPremium)
                        }
                    );
                } else if (data === 'menu_help') {
                    // Trigger help command
                    const helpCommand = this.commands.get('help');
                    if (helpCommand) {
                        await helpCommand.execute(ctx);
                    }
                } else if (data === 'close_message') {
                    await ctx.deleteMessage();
                } else if (data.startsWith('confirm_broadcast_')) {
                    // Handle broadcast confirmation
                    const broadcastCommand = this.commands.get('broadcast');
                    if (broadcastCommand && ctx.from.id.toString() === process.env.ADMIN_ID) {
                        const encodedMessage = data.replace('confirm_broadcast_', '');
                        const message = Buffer.from(encodedMessage, 'base64').toString();
                        await broadcastCommand.confirmBroadcast(ctx, message);
                    }
                } else if (data.startsWith('confirm_demote_')) {
                    // Handle demote confirmation
                    const demoteCommand = this.commands.get('demote');
                    if (demoteCommand && ctx.from.id.toString() === process.env.ADMIN_ID) {
                        const userId = data.replace('confirm_demote_', '');
                        await demoteCommand.confirmDemotion(ctx, userId);
                    }
                }
                
                // Answer callback query to remove loading state
                await ctx.answerCbQuery();
                
            } catch (error) {
                logger.error('Callback query error:', error);
                try {
                    await ctx.answerCbQuery('An error occurred');
                } catch (e) {}
            }
        });
    }

    setupErrorHandlers() {
        this.bot.catch((err, ctx) => {
            logger.error('Bot error:', err);
            
            if (ctx && ctx.reply) {
                ctx.reply('❌ An error occurred. Please try again later.')
                    .catch(() => {}); // Ignore reply errors
            }
        });

        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception:', error);
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled rejection at:', promise, 'reason:', reason);
        });
    }

    async start() {
        try {
            // Start bot with webhook or polling
            if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
                // Webhook mode for production
                const webhookUrl = process.env.WEBHOOK_URL;
                await this.bot.telegram.setWebhook(webhookUrl);
                logger.info(`Bot started with webhook: ${webhookUrl}`);
            } else {
                // Polling mode for development
                await this.bot.launch();
                logger.info('Bot started in polling mode');
            }
            
            // Get bot info
            const botInfo = await this.bot.telegram.getMe();
            logger.info(`Bot @${botInfo.username} is running!`);
            
        } catch (error) {
            logger.error('Failed to start bot:', error);
            process.exit(1);
        }
    }

    stop() {
        this.bot.stop('SIGINT');
        this.bot.stop('SIGTERM');
        logger.info('Bot stopped gracefully');
    }
}

// Initialize and start the bot
const bot = new PremiumBot();
bot.initialize();

// Graceful shutdown
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());