# 🤖 Premium Telegram Bot

A feature-rich, premium-quality Telegram bot built with Node.js and Telegraf. This bot provides advanced media downloading capabilities, user management, premium features, and much more.

## ✨ Features

### 🔥 Core Features
- **Auto-Command Loading**: Just drop `.js` files in `/bot/commands` - they're automatically loaded!
- **Premium System**: Built-in premium user management with different access levels
- **Rate Limiting**: Smart flood protection with per-user limits
- **Multi-language Support**: Extensible language system (currently English)
- **Comprehensive Logging**: Track all bot interactions and usage statistics
- **Interactive Menus**: Beautiful inline keyboards for easy navigation

### 📥 Download Features
- **YouTube Audio** (`/ytmp3`) - High-quality MP3 downloads
- **YouTube Video** (`/ytmp4`) - HD video downloads with quality selection
- **Facebook Videos** (`/fb`) - Download Facebook videos (planned)
- **Instagram Content** (`/ig`) - Download Instagram posts and reels (planned)
- **Download Limits**: 5 downloads/month for free users, 50 for premium
- **Quality Control**: Different quality limits based on user tier

### 👑 Premium Features
- **Advanced Statistics** (`/stats`) - Detailed usage analytics
- **Download History** (`/history`) - Complete download tracking
- **Higher Limits**: 50 downloads/month vs 5 for free users
- **Extended Duration**: Longer video downloads allowed
- **Priority Support**: Premium user priority

### 🛡️ Admin Features
- **User Promotion** (`/promote`) - Grant premium status
- **User Demotion** (`/demote`) - Remove premium status
- **Broadcasting** (`/broadcast`) - Send messages to all users
- **Admin Statistics** - Comprehensive bot analytics

### 🎯 Advanced Features
- **Inline Mode**: Use `@YourBot search` for inline queries
- **Error Handling**: Robust error handling prevents crashes
- **Automatic Cleanup**: Temporary files auto-deleted
- **Progress Updates**: Real-time download progress
- **File Size Limits**: Respects Telegram's 50MB limit

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- Telegram Bot Token from [@BotFather](https://t.me/BotFather)
- Basic knowledge of JavaScript/Node.js

### 1. Get Bot Token from BotFather

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/start` and then `/newbot`
3. Follow the instructions to create your bot
4. Copy the bot token (looks like `123456789:ABC123DEF456...`)
5. **Important**: Send `/setinline` to BotFather and enable inline mode

### 2. Setup Project

```bash
# Clone or download this project
git clone <your-repo-url>
cd premium-telegram-bot

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 3. Configure Environment

Edit `.env` file with your settings:

```env
# Required
BOT_TOKEN=YOUR_BOT_TOKEN_FROM_BOTFATHER
ADMIN_ID=YOUR_TELEGRAM_USER_ID

# Optional (with defaults)
BOT_USERNAME=your_bot_username
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=10
PREMIUM_DOWNLOAD_LIMIT=50
FREE_DOWNLOAD_LIMIT=5
NODE_ENV=development
```

**How to get your Telegram User ID:**
1. Send a message to [@userinfobot](https://t.me/userinfobot)
2. Copy your numeric ID and put it in `ADMIN_ID`

### 4. Run the Bot

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

You should see:
```
[2024-01-01 12:00:00] INFO  ✓ Data files initialized successfully
[2024-01-01 12:00:00] INFO  Loading 8 commands...
[2024-01-01 12:00:00] INFO  ✓ Loaded command: /start from start.js
[2024-01-01 12:00:00] INFO  Bot started in polling mode
[2024-01-01 12:00:00] INFO  Bot @YourBotUsername is running!
```

### 5. Test Your Bot

1. Find your bot on Telegram using the username from BotFather
2. Send `/start` to test basic functionality
3. Try `/help` to see all available commands
4. Use `/menu` for the interactive interface

## 📁 Project Structure

```
premium-telegram-bot/
├── bot/
│   ├── commands/           # Auto-loaded commands
│   │   ├── start.js       # Welcome command
│   │   ├── help.js        # Help system
│   │   ├── menu.js        # Interactive menu
│   │   ├── stats.js       # Premium statistics
│   │   ├── history.js     # Download history
│   │   ├── broadcast.js   # Admin broadcasting
│   │   ├── promote.js     # User promotion
│   │   ├── demote.js      # User demotion
│   │   ├── download_mp3.js    # YouTube audio
│   │   ├── download_video.js  # YouTube video
│   │   ├── download_facebook.js  # Facebook videos
│   │   └── download_instagram.js # Instagram content
│   ├── middlewares/        # Bot middlewares
│   │   ├── rateLimiter.js # Rate limiting
│   │   └── premiumCheck.js # Premium verification
│   ├── keyboards/          # Inline keyboards
│   │   └── menuKeyboard.js # Menu layouts
│   ├── utils/             # Utilities
│   │   ├── dataManager.js # JSON data handling
│   │   └── logger.js      # Enhanced logging
│   ├── lang/              # Language files
│   │   └── en.json        # English messages
│   └── data/              # Local data storage
│       ├── users.json     # User database
│       └── logs.json      # Command logs
├── temp/                  # Temporary downloads (auto-created)
├── index.js              # Main bot file
├── package.json          # Dependencies
├── .env.example          # Environment template
└── README.md            # This file
```

## 🎨 Adding New Commands

Adding new commands is incredibly easy! Just create a new file in `/bot/commands/`:

```javascript
// bot/commands/example.js
module.exports = {
    name: 'example',
    description: 'Example command',
    usage: '/example',
    category: 'basic',
    
    async execute(ctx) {
        await ctx.reply('Hello from example command!');
    }
};
```

The bot will automatically load it on restart. No need to edit any other files!

### Command Structure

```javascript
module.exports = {
    name: 'commandname',        // Command name (without /)
    description: 'Description', // Help text
    usage: '/commandname args', // Usage example
    category: 'basic',          // Category for organization
    premium: false,             // true = premium only
    adminOnly: false,           // true = admin only
    
    async execute(ctx) {
        // Your command logic here
        // ctx.user - User info
        // ctx.isPremium - Premium status
        // ctx.requirePremium() - Check premium access
        await ctx.reply('Command response');
    }
};
```

## 🌐 Deployment

### Option 1: VPS/Server Deployment

```bash
# On your server
git clone <your-repo>
cd premium-telegram-bot
npm install --production
cp .env.example .env
# Edit .env with your settings

# Using PM2 (recommended)
npm install -g pm2
pm2 start index.js --name "telegram-bot"
pm2 startup
pm2 save

# Or using screen/tmux
screen -S telegram-bot
npm start
# Ctrl+A+D to detach
```

### Option 2: Render Deployment

1. Fork this repository to your GitHub
2. Connect to [Render](https://render.com)
3. Create new Web Service
4. Connect your GitHub repo
5. Set environment variables in Render dashboard
6. Deploy!

**Important for Render:**
- Add `WEBHOOK_URL` environment variable with your Render app URL
- Set `NODE_ENV=production`

### Option 3: Railway Deployment

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Deploy: `railway deploy`
4. Set environment variables in Railway dashboard

### Option 4: Heroku Deployment

```bash
# Install Heroku CLI
heroku create your-bot-name
heroku config:set BOT_TOKEN=your_token
heroku config:set ADMIN_ID=your_id
# Set other environment variables
git push heroku main
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BOT_TOKEN` | ✅ | - | Bot token from BotFather |
| `ADMIN_ID` | ✅ | - | Your Telegram user ID |
| `BOT_USERNAME` | ❌ | - | Bot username (optional) |
| `RATE_LIMIT_WINDOW` | ❌ | 60000 | Rate limit window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | ❌ | 10 | Max requests per window |
| `PREMIUM_DOWNLOAD_LIMIT` | ❌ | 50 | Premium download limit |
| `FREE_DOWNLOAD_LIMIT` | ❌ | 5 | Free user download limit |
| `NODE_ENV` | ❌ | development | Environment mode |
| `WEBHOOK_URL` | ❌ | - | Webhook URL for production |
| `LOG_LEVEL` | ❌ | INFO | Logging level |

### Webhook vs Polling

- **Development**: Uses polling (default)
- **Production**: Set `WEBHOOK_URL` to use webhooks (recommended for deployed bots)

## 🛠️ Development

### Adding New Download Sources

1. Create new command file in `/bot/commands/`
2. Follow the existing download command structure
3. Add URL validation
4. Implement download logic
5. Handle errors gracefully

### Extending Premium Features

1. Add feature check in command: `if (!await ctx.requirePremium('Feature name')) return;`
2. Update language files with premium messages
3. Add feature to premium menu in `menuKeyboard.js`

### Adding Language Support

1. Create new language file in `/bot/lang/` (e.g., `es.json`)
2. Copy structure from `en.json`
3. Translate all messages
4. Update language selection in keyboards

## 📊 Data Storage

This bot uses **local JSON files** for data storage:

- **`bot/data/users.json`**: User profiles, premium status, download counts
- **`bot/data/logs.json`**: Command logs, usage statistics

### Data Structure

```javascript
// users.json
{
  "users": {
    "123456789": {
      "id": 123456789,
      "username": "johndoe",
      "firstName": "John",
      "isPremium": false,
      "joinedAt": "2024-01-01T00:00:00.000Z",
      "downloadCount": 3,
      "lastSeen": "2024-01-01T12:00:00.000Z"
    }
  },
  "stats": {
    "totalUsers": 1,
    "premiumUsers": 0
  }
}

// logs.json
{
  "logs": [
    {
      "userId": 123456789,
      "command": "/ytmp3 https://youtube.com/watch?v=...",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "metadata": {
        "title": "Video Title"
      }
    }
  ],
  "stats": {
    "totalCommands": 1,
    "commandStats": {
      "/ytmp3": 1
    }
  }
}
```

## 🔒 Security Features

- **Rate Limiting**: Prevents spam and abuse
- **Admin Protection**: Admin commands only accessible by admin
- **Premium Verification**: Secure premium feature access
- **Input Validation**: All URLs and inputs validated
- **Error Isolation**: Errors don't crash the bot
- **Temporary Files**: Auto-deleted for security

## 🐛 Troubleshooting

### Bot Not Starting
```bash
# Check your .env file
cat .env

# Verify bot token
curl -X GET "https://api.telegram.org/bot$BOT_TOKEN/getMe"

# Check logs
npm start
```

### Commands Not Working
- Verify bot has correct permissions
- Check if inline mode is enabled in BotFather
- Ensure environment variables are set correctly

### Downloads Failing
- Check internet connection
- Verify ytdl-core is up to date: `npm update ytdl-core`
- Check YouTube restrictions in your region

### Rate Limiting Issues
- Adjust `RATE_LIMIT_MAX_REQUESTS` in `.env`
- Admin users bypass rate limits

## 📝 License

This project is licensed under the MIT License. See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## 💡 Tips & Best Practices

1. **Keep your bot token secret** - Never commit it to version control
2. **Monitor usage** - Check logs regularly for errors or abuse
3. **Update dependencies** - Keep packages updated for security
4. **Backup data** - Regularly backup your JSON data files
5. **Use PM2** - For production deployments with auto-restart
6. **Set up monitoring** - Use tools like UptimeRobot for availability monitoring

## 📞 Support

- **Documentation**: This README covers most use cases
- **Issues**: Open GitHub issues for bugs
- **Telegram**: Contact the admin configured in your bot

---

**Made with ❤️ for the Telegram Bot community**

*This bot is production-ready and includes all the advanced features you need for a premium bot service!*