# Romba Bot Makefile
# Development and release automation

.PHONY: help install build test test-unit test-integration clean release pre-release docker-build docker-run

# Default target
help:
	@echo "🤖 Romba Bot - Available Commands"
	@echo "=================================="
	@echo ""
	@echo "📦 Development:"
	@echo "  make install           Install dependencies"
	@echo "  make build             Build the application"
	@echo "  make dev               Start development server"
	@echo "  make clean             Clean build artifacts"
	@echo ""
	@echo "🧪 Testing:"
	@echo "  make test              Run all tests (unit + integration)"
	@echo "  make test-unit         Run unit tests only"
	@echo "  make test-integration  Run integration tests (real downloads)"
	@echo "  make coverage          Generate test coverage report"
	@echo ""
	@echo "🚀 Release:"
	@echo "  make pre-release       Run pre-release validation"
	@echo "  make release           Create a new release (runs all checks)"
	@echo ""
	@echo "🐳 Docker:"
	@echo "  make docker-build      Build Docker image"
	@echo "  make docker-run        Run Docker container locally"

# Installation
install:
	@echo "📦 Installing dependencies..."
	pnpm install

# Build
build:
	@echo "🔨 Building application..."
	pnpm build

# Development
dev:
	@echo "🚀 Starting development server..."
	pnpm dev

# Unit tests
test-unit:
	@echo "🧪 Running unit tests..."
	pnpm test:run

# Integration tests (real downloads, no Discord)
test-integration:
	@echo "🔄 Running integration tests..."
	@echo "⚠️  Warning: This will download real ROM files for testing"
	@echo "📁 Test files will be cleaned up automatically"
	@echo ""
	@read -p "Continue? [y/N] " response && [[ $$response =~ ^[Yy]$$ ]] || (echo "Aborted." && exit 1)
	node scripts/integration-test.js

# Full Discord integration tests (requires Discord bot)
test-discord:
	@echo "🤖 Running full Discord integration tests..."
	@echo "⚠️  WARNING: This will:"
	@echo "   - Connect to Discord with your bot"
	@echo "   - Send messages to a test channel"
	@echo "   - Download real ROM files"
	@echo "   - Run CHD conversion if available"
	@echo ""
	@echo "📋 Prerequisites:"
	@echo "   - .env file with DISCORD_TOKEN and TEST_DISCORD_CHANNEL_ID"
	@echo "   - Bot invited to test server with proper permissions"
	@echo ""
	@read -p "Continue? [y/N] " response && [[ $$response =~ ^[Yy]$$ ]] || (echo "Aborted." && exit 1)
	node scripts/discord-integration-test.js

# All tests
test: test-unit test-integration

# Coverage report
coverage:
	@echo "📊 Generating coverage report..."
	pnpm test:run --coverage
	@echo "📋 Coverage report generated in coverage/"

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf dist/
	rm -rf coverage/
	rm -rf node_modules/.cache/
	@echo "✅ Clean completed"

# Pre-release validation
pre-release: clean install build test-unit
	@echo "🔍 Running pre-release validation..."
	@echo "✅ All pre-release checks passed!"
	@echo ""
	@echo "🚨 Ready for integration test?"
	@echo "   This will download real ROM files to verify everything works"
	@echo "   Run: make test-integration"

# Full release process
release: clean install build test-unit
	@echo "🚀 Starting release process..."
	@echo ""
	@echo "1️⃣  Unit tests: ✅ PASSED"
	@echo "2️⃣  Build: ✅ PASSED"
	@echo ""
	@echo "🔄 Running integration tests..."
	@$(MAKE) test-integration
	@echo ""
	@echo "✅ All tests passed!"
	@echo ""
	@echo "🏷️  Ready to create release tag?"
	@echo "   Current tags:"
	@git tag -l | tail -5
	@echo ""
	@read -p "Enter new version (e.g., v1.6.0): " version && \
		echo "Creating release $$version..." && \
		git tag $$version && \
		git push origin $$version && \
		echo "🎉 Release $$version created!"

# Docker targets
docker-build:
	@echo "🐳 Building Docker image..."
	docker build -t romba-bot .

docker-run: docker-build
	@echo "🐳 Running Docker container..."
	@echo "⚠️  Make sure you have a .env file with DISCORD_TOKEN"
	docker run -it --rm \
		--env-file .env \
		-v $(PWD)/downloads:/app/downloads \
		-v $(PWD)/data:/app/data \
		romba-bot

# Development helpers
lint:
	@echo "🔍 Running linter..."
	@echo "⚠️  No linter configured yet - add ESLint/Prettier if needed"

format:
	@echo "✨ Running formatter..."
	@echo "⚠️  No formatter configured yet - add Prettier if needed"