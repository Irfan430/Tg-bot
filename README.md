# 🤖 Premium Telegram Bot

A feature-rich, premium-quality Telegram bot built with Node.js and Telegraf. This bot includes advanced features like multi-language support, premium user system, flood protection, inline mode, and comprehensive admin tools.

## ✨ Features

### 🔧 General Commands
- `/start` - Welcome message with interactive buttons
- `/help` - Show all available commands
- `/about` - Information about the bot
- `/settings` - Access user settings
- `/language` - Change bot language

### 👑 Premium Features
- `/history` - View last 10 commands (Premium only)
- `/stats` - View bot usage statistics (Premium only)

### 👮‍♂️ Admin Commands
- `/promote <user_id>` - Grant premium status to a user
- `/demote <user_id>` - Remove premium status from a user
- `/broadcast <message>` - Send message to all users

### 🌟 Advanced Features
- **Multi-language support** - English, Bengali, Hindi
- **Premium user system** - Two-tier access control
- **Flood protection** - 3-second cooldown between commands
- **Inline mode** - Use `@YourBot query` in any chat
- **Interactive buttons** - Rich inline keyboard menus
- **Usage logging** - Track all commands and user activity
- **Local JSON storage** - No database required
- **Webhook + Polling** - Ready for production deployment

## 🚀 Quick Start

### 1. Get Bot Token from BotFather

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Copy the bot token (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)
5. **Important**: Send `/setinline` to BotFather and enable inline mode for your bot

### 2. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd premium-telegram-bot

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### 3. Configure Environment

Edit `.env` file:
```env
BOT_TOKEN=your_bot_token_here
# Leave WEBHOOK_URL empty for local development
WEBHOOK_URL=
PORT=3000
```

### 4. Configure Admin Settings

Edit `config.json`:
```json
{
  "admins": [
    "YOUR_TELEGRAM_USER_ID"
  ],
  "defaultLanguage": "en",
  "floodCooldown": 3000,
  "maxHistoryEntries": 10,
  "botName": "Premium Bot",
  "version": "1.0.0"
}
```

**To find your Telegram User ID:**
1. Send a message to your bot
2. Check the console logs - your user ID will be displayed

### 5. Run the Bot

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## 📁 Project Structure

```
premium-telegram-bot/
├── bot.js              # Main bot file
├── package.json        # Dependencies and scripts
├── config.json         # Bot configuration
├── .env.example        # Environment variables template
├── data/              # JSON data storage
│   ├── users.json     # User data
│   └── logs.json      # Command logs
├── lang/              # Language files
│   ├── en.json        # English translations
│   ├── bn.json        # Bengali translations
│   └── hi.json        # Hindi translations
└── README.md          # This file
```

## 🌐 Multi-language Support

The bot supports three languages:
- 🇺🇸 English (`en`)
- 🇧🇩 Bengali (`bn`)
- 🇮🇳 Hindi (`hi`)

Users can switch languages using:
- `/language` command
- Settings menu button
- Inline language selection

## 👑 Premium System

### For Users:
- Regular users can use basic commands
- Premium users get access to `/history` and `/stats`
- Premium status is displayed in profile

### For Admins:
- Add admin user IDs to `config.json`
- Use `/promote <user_id>` to grant premium
- Use `/demote <user_id>` to remove premium
- Use `/broadcast <message>` to message all users

## 🔒 Security Features

- **Flood Protection**: 3-second cooldown between commands
- **Admin Verification**: Admin-only commands are protected
- **Error Handling**: Graceful error handling prevents crashes
- **User Validation**: All user inputs are validated

## 📊 Data Storage

The bot uses local JSON files for data storage:

### `data/users.json`
```json
[
  {
    "id": 123456789,
    "username": "john_doe",
    "firstName": "John",
    "lastName": "Doe",
    "language": "en",
    "premium": false,
    "joinDate": "2024-01-01T00:00:00.000Z",
    "commandHistory": [...]
  }
]
```

### `data/logs.json`
```json
[
  {
    "userId": 123456789,
    "command": "/start",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "success": true
  }
]
```

## 🚀 Production Deployment

### Deploy on Render

1. Create a new web service on [Render](https://render.com)
2. Connect your GitHub repository
3. Set environment variables:
   - `BOT_TOKEN`: Your bot token
   - `WEBHOOK_URL`: Your Render app URL (e.g., `https://your-app.onrender.com`)
   - `NODE_ENV`: `production`
4. Deploy!

### Deploy on Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project directory
3. Set environment variables in Vercel dashboard
4. The bot will run in webhook mode automatically

### Deploy on Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Set environment variables
4. Deploy!

## 🧪 Testing

### Test Commands
```bash
# Test basic commands
/start
/help
/about
/settings

# Test language switching
/language

# Test premium features (need premium status)
/history
/stats

# Test admin commands (need admin privileges)
/promote 123456789
/demote 123456789
/broadcast Hello everyone!
```

### Test Inline Mode
1. Go to any chat
2. Type `@YourBotUsername hello`
3. Select from the results

## 🐛 Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check if BOT_TOKEN is correct
   - Verify bot is not stopped in BotFather
   - Check console for errors

2. **Webhook not working**
   - Ensure WEBHOOK_URL is accessible
   - Check if SSL certificate is valid
   - Verify webhook URL in Telegram

3. **Commands not working**
   - Check user permissions
   - Verify command syntax
   - Check logs for errors

4. **File permissions**
   - Ensure write permissions for `data/` directory
   - Check file paths are correct

### Debug Mode

Add debug logging:
```javascript
// In bot.js, add after bot creation
bot.use((ctx, next) => {
  console.log('📨 Received:', ctx.message?.text || ctx.callbackQuery?.data);
  return next();
});
```

## 📝 Customization

### Adding New Languages

1. Create new language file in `lang/` directory
2. Add language to `loadLanguages()` function
3. Update language selection buttons
4. Add flag emoji to language selector

### Adding New Commands

1. Add command handler:
```javascript
bot.command('newcommand', async (ctx) => {
  await ctx.reply('New command response');
  await logCommand(ctx.from.id, '/newcommand');
});
```

2. Add translations to language files
3. Update help text

### Custom Flood Protection

Modify rate limiter settings:
```javascript
const rateLimiter = new RateLimiterMemory({
  points: 5,        // Number of requests
  duration: 60,     // Per 60 seconds
  blockDuration: 300 // Block for 5 minutes
});
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:
1. Check the troubleshooting section
2. Review the console logs
3. Verify your configuration
4. Create an issue in the repository

## 🙏 Acknowledgments

- [Telegraf](https://telegraf.js.org/) - Modern Telegram Bot Framework
- [rate-limiter-flexible](https://github.com/animir/node-rate-limiter-flexible) - Rate limiting
- [dotenv](https://github.com/motdotla/dotenv) - Environment variables

---

**Built with ❤️ using Node.js and Telegraf**