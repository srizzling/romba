# Docker Image Size Optimization

## Before vs After Optimization

### Original Dockerfile Issues:
- **Multiple unnecessary package managers**: npm + pnpm in production
- **Large base image**: Full Node.js alpine with build tools
- **Bloated context**: All files sent to Docker daemon
- **Health check overhead**: Extra processes running

### Optimized Dockerfile Benefits:

#### 🎯 **Multi-stage Build Optimization**
- **Builder stage**: Only for compilation (discarded)
- **Deps stage**: Clean production dependencies
- **Production stage**: Minimal runtime only

#### 📦 **Size Reduction Techniques**
- **Corepack**: Native pnpm support (no npm install -g pnpm)
- **pnpm store prune**: Remove unused packages
- **Selective copying**: Only essential files
- **Optimized .dockerignore**: Exclude dev files

#### 🔒 **Security & Performance**
- **Non-root user**: Custom nodejs user (UID 1001)
- **Signal handling**: dumb-init for graceful shutdowns
- **Direct node execution**: No pnpm overhead in production
- **Minimal attack surface**: Fewer packages installed

### Expected Size Comparison:

| Component | Before | After | Savings |
|-----------|--------|-------|---------|
| **Base Image** | node:20-alpine | node:20-alpine | Same |
| **Package Managers** | npm + pnpm | None (production) | ~30MB |
| **Build Tools** | Included | Excluded | ~50MB |
| **Layer Optimization** | Poor | Optimized | ~20MB |
| **Dependencies** | All | Production only | ~100MB |

#### 🎯 **Estimated Total Savings: ~200MB+ (50-60% reduction)**

### Build Performance:
- **Better caching**: Package files copied before source
- **Parallel stages**: Dependencies and build run separately  
- **Smaller context**: Faster uploads to Docker daemon

### Commands to Test:

```bash
# Build optimized image
docker build -t romba-optimized .

# Check size
docker images romba-optimized

# Compare with previous builds
docker images | grep romba
```

### Production Usage:
```bash
# Run optimized container
docker run -d \
  --name romba-bot \
  --env-file .env \
  -v $(pwd)/downloads:/app/downloads \
  romba-optimized
```

## Implementation Notes:

1. **Three-stage build** for maximum optimization
2. **Production dependencies** isolated and pruned
3. **Security-first** with non-root user
4. **Signal handling** with dumb-init
5. **Comprehensive .dockerignore** for smaller build context