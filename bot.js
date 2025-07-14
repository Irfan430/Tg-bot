const { Telegraf, Markup } = require('telegraf');
const fs = require('fs').promises;
const path = require('path');
const { RateLimiterMemory } = require('rate-limiter-flexible');
require('dotenv').config();

// Configuration
const config = require('./config.json');

// Rate limiter for flood control
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (ctx) => ctx.from.id,
  points: 1,
  duration: config.floodCooldown / 1000,
});

// Bot instance
const bot = new Telegraf(process.env.BOT_TOKEN);

// Language cache
const languages = {};

// Load all language files
async function loadLanguages() {
  try {
    const langFiles = ['en', 'bn', 'hi'];
    for (const lang of langFiles) {
      const langPath = path.join(__dirname, 'lang', `${lang}.json`);
      const langData = await fs.readFile(langPath, 'utf8');
      languages[lang] = JSON.parse(langData);
    }
    console.log('✅ Language files loaded successfully');
  } catch (error) {
    console.error('❌ Error loading language files:', error);
  }
}

// Utility functions
async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeJsonFile(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`❌ Error writing to ${filePath}:`, error);
    return false;
  }
}

// User management
async function getUser(userId) {
  const users = await readJsonFile('./data/users.json');
  return users.find(user => user.id === userId);
}

async function saveUser(userData) {
  const users = await readJsonFile('./data/users.json');
  const existingIndex = users.findIndex(user => user.id === userData.id);
  
  if (existingIndex !== -1) {
    users[existingIndex] = { ...users[existingIndex], ...userData };
  } else {
    users.push({
      id: userData.id,
      username: userData.username || '',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      language: userData.language || config.defaultLanguage,
      premium: userData.premium || false,
      joinDate: userData.joinDate || new Date().toISOString(),
      commandHistory: userData.commandHistory || []
    });
  }
  
  await writeJsonFile('./data/users.json', users);
  return users[existingIndex] || users[users.length - 1];
}

// Logging system
async function logCommand(userId, command, success = true) {
  const logs = await readJsonFile('./data/logs.json');
  const logEntry = {
    userId,
    command,
    timestamp: new Date().toISOString(),
    success
  };
  
  logs.push(logEntry);
  await writeJsonFile('./data/logs.json', logs);
  
  // Also add to user's command history
  const user = await getUser(userId);
  if (user) {
    user.commandHistory = user.commandHistory || [];
    user.commandHistory.push(logEntry);
    
    // Keep only last 10 commands
    if (user.commandHistory.length > config.maxHistoryEntries) {
      user.commandHistory = user.commandHistory.slice(-config.maxHistoryEntries);
    }
    
    await saveUser(user);
  }
}

// Get text in user's language
async function getText(userId, key, defaultLang = config.defaultLanguage) {
  const user = await getUser(userId);
  const userLang = user?.language || defaultLang;
  return languages[userLang]?.[key] || languages[defaultLang]?.[key] || key;
}

// Check if user is admin
function isAdmin(userId) {
  return config.admins.includes(userId.toString());
}

// Check if user is premium
async function isPremium(userId) {
  const user = await getUser(userId);
  return user?.premium || false;
}

// Flood control middleware
async function floodControlMiddleware(ctx, next) {
  try {
    await rateLimiter.consume(ctx.from.id);
    return next();
  } catch (rateLimiterRes) {
    await ctx.reply(await getText(ctx.from.id, 'flood_warning'));
    return;
  }
}

// Initialize user middleware
async function initUserMiddleware(ctx, next) {
  if (ctx.from) {
    await saveUser({
      id: ctx.from.id,
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name
    });
  }
  return next();
}

// Apply middleware
bot.use(initUserMiddleware);
bot.use(floodControlMiddleware);

// Commands
bot.start(async (ctx) => {
  const user = await getUser(ctx.from.id);
  await ctx.reply(await getText(ctx.from.id, 'welcome'), {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📋 Help', callback_data: 'show_help' },
          { text: '⚙️ Settings', callback_data: 'show_settings' }
        ],
        [
          { text: '🌐 Language', callback_data: 'show_language' },
          { text: 'ℹ️ About', callback_data: 'show_about' }
        ]
      ]
    }
  });
  await logCommand(ctx.from.id, '/start');
});

bot.help(async (ctx) => {
  await ctx.reply(await getText(ctx.from.id, 'help'), { parse_mode: 'Markdown' });
  await logCommand(ctx.from.id, '/help');
});

bot.command('about', async (ctx) => {
  await ctx.reply(await getText(ctx.from.id, 'about'), { parse_mode: 'Markdown' });
  await logCommand(ctx.from.id, '/about');
});

bot.command('settings', async (ctx) => {
  await ctx.reply(await getText(ctx.from.id, 'settings_menu'), {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🌐 Language', callback_data: 'show_language' },
          { text: '👤 Profile', callback_data: 'show_profile' }
        ]
      ]
    }
  });
  await logCommand(ctx.from.id, '/settings');
});

bot.command('language', async (ctx) => {
  await ctx.reply(await getText(ctx.from.id, 'language_select'), {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🇺🇸 English', callback_data: 'lang_en' },
          { text: '🇧🇩 বাংলা', callback_data: 'lang_bn' }
        ],
        [
          { text: '🇮🇳 हिंदी', callback_data: 'lang_hi' }
        ]
      ]
    }
  });
  await logCommand(ctx.from.id, '/language');
});

// Premium features
bot.command('history', async (ctx) => {
  if (!(await isPremium(ctx.from.id))) {
    await ctx.reply(await getText(ctx.from.id, 'premium_required'));
    return;
  }
  
  const user = await getUser(ctx.from.id);
  const history = user?.commandHistory || [];
  
  if (history.length === 0) {
    await ctx.reply(await getText(ctx.from.id, 'no_history'));
  } else {
    let historyText = `${await getText(ctx.from.id, 'history_title')}\n\n`;
    history.slice(-10).forEach((entry, index) => {
      const date = new Date(entry.timestamp).toLocaleString();
      historyText += `${index + 1}. ${entry.command} - ${date}\n`;
    });
    await ctx.reply(historyText);
  }
  
  await logCommand(ctx.from.id, '/history');
});

bot.command('stats', async (ctx) => {
  if (!(await isPremium(ctx.from.id))) {
    await ctx.reply(await getText(ctx.from.id, 'premium_required'));
    return;
  }
  
  const users = await readJsonFile('./data/users.json');
  const logs = await readJsonFile('./data/logs.json');
  
  const totalUsers = users.length;
  const premiumUsers = users.filter(user => user.premium).length;
  const totalCommands = logs.length;
  const todayCommands = logs.filter(log => {
    const logDate = new Date(log.timestamp).toDateString();
    const today = new Date().toDateString();
    return logDate === today;
  }).length;
  
  const statsText = `${await getText(ctx.from.id, 'stats_title')}\n\n` +
    `👥 Total Users: ${totalUsers}\n` +
    `👑 Premium Users: ${premiumUsers}\n` +
    `📊 Total Commands: ${totalCommands}\n` +
    `📅 Today's Commands: ${todayCommands}`;
  
  await ctx.reply(statsText);
  await logCommand(ctx.from.id, '/stats');
});

// Admin commands
bot.command('promote', async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply(await getText(ctx.from.id, 'admin_required'));
    return;
  }
  
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    await ctx.reply('Usage: /promote <user_id>');
    return;
  }
  
  const targetUserId = parseInt(args[1]);
  const user = await getUser(targetUserId);
  
  if (!user) {
    await ctx.reply(await getText(ctx.from.id, 'user_not_found'));
    return;
  }
  
  user.premium = true;
  await saveUser(user);
  await ctx.reply(await getText(ctx.from.id, 'user_promoted'));
  await logCommand(ctx.from.id, '/promote');
});

bot.command('demote', async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply(await getText(ctx.from.id, 'admin_required'));
    return;
  }
  
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    await ctx.reply('Usage: /demote <user_id>');
    return;
  }
  
  const targetUserId = parseInt(args[1]);
  const user = await getUser(targetUserId);
  
  if (!user) {
    await ctx.reply(await getText(ctx.from.id, 'user_not_found'));
    return;
  }
  
  user.premium = false;
  await saveUser(user);
  await ctx.reply(await getText(ctx.from.id, 'user_demoted'));
  await logCommand(ctx.from.id, '/demote');
});

bot.command('broadcast', async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply(await getText(ctx.from.id, 'admin_required'));
    return;
  }
  
  const message = ctx.message.text.replace('/broadcast ', '');
  if (!message) {
    await ctx.reply('Usage: /broadcast <message>');
    return;
  }
  
  const users = await readJsonFile('./data/users.json');
  let successCount = 0;
  let failCount = 0;
  
  for (const user of users) {
    try {
      await bot.telegram.sendMessage(user.id, message);
      successCount++;
    } catch (error) {
      failCount++;
    }
  }
  
  await ctx.reply(`📢 Broadcast completed!\n✅ Success: ${successCount}\n❌ Failed: ${failCount}`);
  await logCommand(ctx.from.id, '/broadcast');
});

// Callback query handlers
bot.action('show_help', async (ctx) => {
  await ctx.editMessageText(await getText(ctx.from.id, 'help'), { parse_mode: 'Markdown' });
});

bot.action('show_about', async (ctx) => {
  await ctx.editMessageText(await getText(ctx.from.id, 'about'), { parse_mode: 'Markdown' });
});

bot.action('show_settings', async (ctx) => {
  await ctx.editMessageText(await getText(ctx.from.id, 'settings_menu'), {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🌐 Language', callback_data: 'show_language' },
          { text: '👤 Profile', callback_data: 'show_profile' }
        ]
      ]
    }
  });
});

bot.action('show_language', async (ctx) => {
  await ctx.editMessageText(await getText(ctx.from.id, 'language_select'), {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🇺🇸 English', callback_data: 'lang_en' },
          { text: '🇧🇩 বাংলা', callback_data: 'lang_bn' }
        ],
        [
          { text: '🇮🇳 हिंदी', callback_data: 'lang_hi' }
        ]
      ]
    }
  });
});

bot.action('show_profile', async (ctx) => {
  const user = await getUser(ctx.from.id);
  const profileText = `👤 **Profile Information**\n\n` +
    `🆔 ID: ${user.id}\n` +
    `👤 Name: ${user.firstName} ${user.lastName}\n` +
    `🔗 Username: @${user.username || 'N/A'}\n` +
    `👑 Premium: ${user.premium ? 'Yes' : 'No'}\n` +
    `🌐 Language: ${user.language}\n` +
    `📅 Joined: ${new Date(user.joinDate).toLocaleDateString()}`;
  
  await ctx.editMessageText(profileText, { parse_mode: 'Markdown' });
});

// Language selection handlers
bot.action(/lang_(.+)/, async (ctx) => {
  const language = ctx.match[1];
  const user = await getUser(ctx.from.id);
  
  user.language = language;
  await saveUser(user);
  
  await ctx.editMessageText(await getText(ctx.from.id, 'language_changed'));
});

// Inline mode
bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query;
  
  const results = [
    {
      type: 'article',
      id: '1',
      title: await getText(ctx.from.id, 'inline_result_title'),
      description: await getText(ctx.from.id, 'inline_result_description'),
      input_message_content: {
        message_text: await getText(ctx.from.id, 'inline_result_message')
      }
    }
  ];
  
  if (query) {
    results.push({
      type: 'article',
      id: '2',
      title: `Echo: ${query}`,
      description: 'Send your message',
      input_message_content: {
        message_text: `🔄 **Echo:** ${query}\n\n_Sent via Premium Bot_`
      }
    });
  }
  
  await ctx.answerInlineQuery(results);
});

// Error handling
bot.catch((err, ctx) => {
  console.error('❌ Bot error:', err);
  if (ctx) {
    getText(ctx.from?.id, 'error_occurred').then(text => {
      ctx.reply(text).catch(() => {});
    }).catch(() => {});
  }
});

// Initialize and start bot
async function startBot() {
  try {
    await loadLanguages();
    
    // Check if we should use webhook or polling
    const PORT = process.env.PORT || 3000;
    const WEBHOOK_URL = process.env.WEBHOOK_URL;
    
    if (WEBHOOK_URL) {
      // Webhook mode for production
      console.log('🔗 Starting bot in webhook mode...');
      await bot.telegram.setWebhook(`${WEBHOOK_URL}/webhook`);
      
      const express = require('express');
      const app = express();
      
      app.use(express.json());
      app.post('/webhook', (req, res) => {
        bot.handleUpdate(req.body, res);
      });
      
      app.get('/', (req, res) => {
        res.json({ 
          status: 'Bot is running!',
          name: config.botName,
          version: config.version
        });
      });
      
      app.listen(PORT, () => {
        console.log(`🚀 Bot webhook server running on port ${PORT}`);
      });
    } else {
      // Polling mode for development
      console.log('🔄 Starting bot in polling mode...');
      await bot.launch();
      console.log('🤖 Bot started successfully!');
    }
    
    // Bot info
    const botInfo = await bot.telegram.getMe();
    console.log(`✅ Bot @${botInfo.username} is running!`);
    console.log(`📊 Languages loaded: ${Object.keys(languages).join(', ')}`);
    console.log(`👮‍♂️ Admins: ${config.admins.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('\n🛑 Shutting down bot...');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  console.log('\n🛑 Shutting down bot...');
  bot.stop('SIGTERM');
});

// Start the bot
startBot();