# 🤖 Romba Discord Bot

A high-performance, self-hosted Discord bot for downloading retro games from multiple ROM archives. Features ultra-fast builds, unified search across sources, and intelligent caching. 

## ⚠️ Important Disclaimer

**This application functions as a download manager tool only.** It does not host, include, distribute, or provide any ROM files. All content is sourced from [Myrient](https://myrient.erista.me), a publicly available ROM preservation archive.

**Legal Notice**: This software is provided as-is without any warranty. Users are solely responsible for complying with their local laws regarding ROM usage and intellectual property rights. Only use ROMs that you legally own or have the right to use.

## 🎯 Features

### 🎮 **Core Functionality**
- **🔍 Unified Search**: Single `/download` command searches both Myrient and Vimm's Lair
- **📱 Discord Integration**: Full slash command interface with interactive buttons
- **📂 ES-DE Compatible**: Downloads organized in `roms/<system>/` folder structure
- **🚫 Smart Filtering**: Automatically excludes demo, beta, and test ROMs
- **📄 Pagination**: Browse through large search results with navigation
- **⏬ Download Queue**: Manage multiple downloads with progress tracking
- **💾 CHD Conversion**: Automatic compression for CD-based systems (PS1, PS2, Saturn, Dreamcast)

### ⚡ **Performance & Development**
- **🚀 Ultra-Fast Builds**: ~29ms compilation with esbuild (100x faster than tsc)
- **⚡ Instant Development**: tsx for immediate TypeScript execution
- **🧪 Fast Testing**: Vitest with esbuild integration (12 tests in <3s)
- **📦 Optimized Bundling**: 25.6kb production bundle with tree shaking

### 🐳 **Deployment & Infrastructure**
- **📦 50-60% Smaller Docker Images**: Multi-stage builds with size optimization
- **🔒 Security-First**: Non-root user, proper signal handling, minimal attack surface
- **📁 Persistent Storage**: Proper volume mounting for downloads and data
- **🏥 Health Monitoring**: Built-in health checks and resource optimization
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

## 💾 CHD Conversion

The bot automatically compresses CD-based ROM images to CHD (Compressed Hunks of Data) format for significant space savings:

### **Supported Systems**
- **PlayStation (PSX)**: .iso, .bin/cue → .chd
- **PlayStation 2 (PS2)**: .iso, .bin/cue → .chd  
- **Sega Saturn**: .iso, .bin/cue → .chd
- **Sega Dreamcast**: .iso, .bin/cue → .chd
- **Sega CD**: .iso, .bin/cue → .chd

### **Benefits**
- **🗜️ Space Savings**: Typically 30-50% reduction in file size
- **🔧 Emulator Compatible**: Supported by RetroArch, PCSX2, Redream, and more
- **🤖 Automatic**: No manual intervention required
- **📊 Progress Tracking**: Real-time compression progress in Discord

### **Technical Details**
- Uses MAME's `chdman` tool for industry-standard compression
- Preserves all track and audio data
- Docker images include `chdman` by default
- Original files can optionally be kept or removed after conversion

## 🔄 Complete Workflow

Here's the complete workflow from Discord command to handheld gaming:

```mermaid
flowchart TD
    A[📱 Discord Command] --> B{Choose Source}
    B -->|Fast & Reliable| C[/my snes mario]
    B -->|Alternative Source| D[/vm snes mario]
    
    C --> E[🔍 Search Myrient]
    D --> F[🏛️ Search Vimm's Lair]
    
    E --> G[📋 Interactive Selection]
    F --> G
    
    G --> H[⏳ Queue Download]
    H --> I[📥 Download ROM]
    
    I --> J[💾 Save to Server]
    J --> K[📁 downloads/roms/snes/mario.zip]
    
    K --> L[🔄 Syncthing Auto-Sync]
    L --> M[📱 Android /sdcard/ROMs/snes/]
    
    M --> N[🎮 Emulator Ready]
    N --> O[🕹️ Game Time!]
    
    I --> P[📨 Discord Notification]
    P --> Q[✅ "Mario downloaded!"]
    
    style A fill:#7289da
    style K fill:#43a047
    style M fill:#ff9800
    style O fill:#e91e63
```

### 📡 Sync Setup Guide

**1. Server Setup (Where bot runs):**
```bash
# Bot downloads here
/home/user/romba/downloads/roms/
├── gb/           # Game Boy ROMs
├── gba/          # Game Boy Advance ROMs  
├── nes/          # Nintendo ROMs
├── snes/         # Super Nintendo ROMs
└── ...
```

**2. Syncthing Configuration:**
```yaml
Server Side:
  - Folder: /home/user/romba/downloads/roms
  - Send Only: true
  - Auto Accept: true

Android Side:  
  - Folder: /sdcard/ROMs
  - Receive Only: true
  - Auto Accept: true
```

**3. Android Emulator Setup:**
- **RetroArch**: Point to `/sdcard/ROMs/`
- **MyBoy! (GBA)**: Scan `/sdcard/ROMs/gba/`
- **John GBAC (GB/GBC)**: Scan `/sdcard/ROMs/gb/` & `/sdcard/ROMs/gbc/`

### 🎯 Usage Patterns

**Quick Downloads:**
```
/download console:Game Boy game:tetris    # Unified search (both sources)
/queue                                    # Check progress
```

**Batch Downloads:**
1. Queue multiple games from Discord
2. Let bot download overnight
3. Wake up → ROMs synced to handheld
4. Instant gaming! 🎮

## 🛠️ Development

### Running in Development

```bash
# Install dependencies
pnpm install

# Development (instant execution with tsx)
pnpm dev              # Run directly with tsx (no build needed)
pnpm dev:watch        # Auto-reload with nodemon + tsx

# Building (ultra-fast with esbuild)
pnpm build            # Production build (~29ms)
pnpm build:dev        # Development build with source maps
pnpm build:watch      # Watch mode for continuous building

# Testing (fast with vitest + esbuild)
pnpm test             # Run tests in watch mode
pnpm test:run         # Run tests once
pnpm test:ui          # Interactive test UI

# Production
pnpm start            # Start built application
```

### Performance Highlights

- **⚡ Build Speed**: ~29ms (vs 1000ms+ with tsc)
- **🚀 Dev Startup**: Instant with tsx (no build step)
- **🧪 Test Speed**: 12 tests in <3 seconds
- **📦 Bundle Size**: 25.6kb optimized output

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

## 🐳 Docker Support

### 📦 **Optimized Images (50-60% Smaller)**

Docker images are automatically built with multi-stage optimization:

```bash
# Pull the latest optimized version
docker pull ghcr.io/srizzling/romba:latest

# Or pull a specific version  
docker pull ghcr.io/srizzling/romba:v1.3.0
```

**Image Optimizations:**
- **🏗️ Multi-stage builds**: Builder → Dependencies → Production
- **📦 Minimal footprint**: ~200MB+ smaller than standard builds
- **🔒 Security-first**: Non-root user (UID 1001), minimal attack surface
- **⚡ Fast startup**: No unnecessary package managers in production
- **💾 CHD Support**: Built-in `chdman` for automatic CD-ROM compression

### Quick Start with Docker

#### **Option 1: Docker Compose (Recommended)**

1. **Create environment and start**:
   ```bash
   # Create .env file
   echo "DISCORD_TOKEN=your_bot_token_here" > .env
   
   # Start with docker-compose
   docker-compose up -d
   
   # View logs
   docker-compose logs -f romba
   ```

#### **Option 2: Docker Run**

1. **Manual container setup**:
   ```bash
   docker run -d \
     --name romba-bot \
     --restart unless-stopped \
     --user 1001:1001 \
     --env-file .env \
     -v $(pwd)/downloads:/app/downloads \
     -v $(pwd)/data:/app/data \
     ghcr.io/srizzling/romba:latest
   ```

3. **View logs**:
   ```bash
   docker logs -f romba-bot
   ```

### Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  romba:
    image: ghcr.io/srizzling/romba:latest
    container_name: romba-bot
    restart: unless-stopped
    environment:
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - DOWNLOAD_PATH=/app/downloads
      # CHD conversion automatically enabled (chdman included)
    volumes:
      - ./downloads:/app/downloads
      - ./romba-data:/app/romba-data
    # Optional: Health check endpoint
    # ports:
    #   - "8080:8080"
```

Then run:
```bash
docker-compose up -d
```

### Building Your Own Image

If you want to build locally:

```bash
# Build the image
docker build -t romba-bot .

# Run locally built image
docker run -d \
  --name romba-bot \
  --env-file .env \
  -v $(pwd)/downloads:/app/downloads \
  romba-bot
```

### Available Tags

- `ghcr.io/srizzling/romba:latest` - Latest stable release
- `ghcr.io/srizzling/romba:v1.1.0` - Specific version
- `ghcr.io/srizzling/romba:v1` - Latest v1.x release
- `ghcr.io/srizzling/romba:v1.1` - Latest v1.1.x release

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

**Unified search** across both Myrient and Vimm's Lair archives.

**Parameters:**
- `console`: Choose from dropdown list of supported systems  
- `game`: Game name to search for (partial matches work)

**Features:**
- 🔍 **Dual-source search**: Results from both Myrient and Vimm's Lair
- 🏷️ **Source labels**: Clear indication of which archive each ROM comes from
- ⚡ **Parallel search**: Both sources searched simultaneously for speed
- 🎯 **Smart filtering**: Excludes demos, betas, and test ROMs
- 📄 **Pagination**: Navigate through large result sets

**Example:**
```
/download console:Game Boy game:mario
```

**Results show:**
```
🎮 Super Mario Land [Myrient]
🎮 Super Mario Land 2 [Vimm's Lair] 
🎮 Super Mario World [Myrient]
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
