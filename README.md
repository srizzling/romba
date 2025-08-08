# 🤖 Romba Discord Bot

A self-hosted Discord bot that acts as a **download manager** for retro games from the [Myrient](https://myrient.erista.me) archive. 

## ⚠️ Important Disclaimer

**This application functions as a download manager tool only.** It does not host, include, distribute, or provide any ROM files. All content is sourced from [Myrient](https://myrient.erista.me), a publicly available ROM preservation archive.

**Legal Notice**: This software is provided as-is without any warranty. Users are solely responsible for complying with their local laws regarding ROM usage and intellectual property rights. Only use ROMs that you legally own or have the right to use.

## 🎯 Features

- **🎮 Interactive Game Search**: Search for retro games across multiple console systems
- **📱 Discord Integration**: Full slash command interface with interactive buttons
- **📂 ES-DE Compatible**: Downloads organized in `roms/<system>/` folder structure
- **🚫 Smart Filtering**: Automatically excludes demo, beta, and test ROMs
- **📄 Pagination**: Browse through large search results with navigation
- **⏬ Download Queue**: Manage multiple downloads with progress tracking
- **🔧 Self-Hosted**: Run your own instance with full control

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18 or higher
- **pnpm** package manager
- **Discord Application** with bot token
- **Git** (for cloning)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/srizzling/romba.git
   cd romba
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up your Discord bot**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application and bot
   - Copy the bot token
   - Enable these bot permissions:
     - `Send Messages`
     - `Use Slash Commands`
     - `Embed Links`
     - `Read Message History`

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Discord bot token
   ```

   ```env
   DISCORD_TOKEN=your_bot_token_here
   ```

5. **Build and start**
   ```bash
   pnpm build
   pnpm start
   ```

### Discord Server Setup

1. **Invite the bot** to your server using OAuth2 URL:
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_CLIENT_ID&permissions=274877971520&scope=bot%20applications.commands
   ```

2. **Use slash commands**:
   - `/download <console> <game>` - Search and download games
   - `/queue` - Check download status  
   - `/ping` - Test bot connectivity
   - `/stats` - View download statistics

## 🎮 Supported Consoles

- **Nintendo**: Game Boy, Game Boy Color, Game Boy Advance, NES, SNES, Nintendo 64
- **Sega**: Genesis/Mega Drive, Master System, Saturn, Dreamcast  
- **Sony**: PlayStation (PSX)

## 📁 Download Organization

ROMs are automatically organized using the ES-DE folder structure:

```
downloads/
└── roms/
    ├── gb/           # Game Boy ROMs
    ├── gba/          # Game Boy Advance ROMs  
    ├── nes/          # Nintendo Entertainment System ROMs
    ├── snes/         # Super Nintendo ROMs
    └── ...
```

This structure is compatible with EmulationStation Desktop Edition (ES-DE) and most retro gaming frontends.

## 🛠️ Development

### Running in Development

```bash
# Install dependencies
pnpm install

# Run in development mode with auto-reload
pnpm dev

# Run tests
pnpm test

# Run tests with UI
pnpm test:ui

# Build for production
pnpm build
```

### Git Conventions

This project uses conventional commits with emojis:

```bash
feat(search): ✨ add new console support
fix(download): 🐛 resolve download path issue
docs(readme): 📝 update setup instructions
```

### Testing

The project includes comprehensive unit tests:

```bash
# Run all tests
pnpm test:run

# Run tests in watch mode
pnpm test

# Run tests with UI
pnpm test:ui
```

## 📦 Docker Support (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Create downloads directory
RUN mkdir -p downloads

# Start the bot
CMD ["pnpm", "start"]
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Your Discord bot token | ✅ |
| `DOWNLOAD_PATH` | Download directory (default: `./downloads`) | ❌ |
| `MAX_CONCURRENT` | Max concurrent downloads (default: 3) | ❌ |

### Database

The bot uses LowDB for local storage. Data is stored in `romba-db.json` including:
- Download queue and history
- User preferences
- Bot settings

## 📖 Commands Reference

### `/download <console> <game>`

Search and download games from a specific console.

**Parameters:**
- `console`: Choose from dropdown list of supported systems
- `game`: Game name to search for (partial matches work)

**Example:**
```
/download console:Game Boy game:mario
```

### `/queue`

View your download queue and progress.

Shows:
- Queued downloads
- Currently downloading items with progress
- Recently completed downloads
- Failed downloads with error info

### `/stats`

Display download statistics:
- Total downloads
- Success/failure rates  
- Active downloads
- Storage usage

## 🔒 Security & Privacy

- **Self-Hosted**: You control your own data and downloads
- **No Telemetry**: The bot doesn't send usage data anywhere
- **Local Storage**: All data stored locally in JSON files
- **Open Source**: Full source code available for audit

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following the git conventions
4. Run tests: `pnpm test:run`
5. Commit changes: `git commit -m "feat(core): ✨ add amazing feature"`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Credits

- **[Myrient](https://myrient.erista.me)** - For providing the ROM archive
- **[Discord.js](https://discord.js.org)** - Discord API library
- **[ES-DE](https://es-de.org)** - Inspiration for folder organization

## ⚠️ Final Legal Notice

This software is a **tool for managing downloads** from publicly available archives. It does not:
- Host any copyrighted content
- Provide ROMs or game files
- Bypass any copy protection
- Facilitate piracy

Users must ensure they have the legal right to download and use any ROMs. The developers assume no responsibility for how this tool is used.
# CI/CD Status
Automated testing and releases are configured!
