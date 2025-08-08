# Contributing to Romba Bot

## Git Commit Conventions

This project combines conventional commits with emoji-based git conventions. Format your commit messages as:

```
<type>(<scope>): <emoji> <description>

[optional body]

[optional footer]
```

### Types & Emojis
| Type | Emoji | Description |
|------|-------|-------------|
| `feat` | ✨ | New features or functionality |
| `fix` | 🐛 | Bug fixes |
| `docs` | 📝 | Documentation changes |
| `style` | 🎨 | Code style changes (formatting, etc.) |
| `refactor` | ♻️ | Code refactoring without functionality changes |
| `test` | ✅ | Adding or modifying tests |
| `chore` | 🧹 | Build process, tooling, or maintenance tasks |
| `perf` | ⚡ | Performance improvements |
| `ci` | 👷 | Continuous integration changes |
| `wip` | 🚧 | Work in progress |

### Scopes
- `core`: Core bot functionality
- `commands`: Discord slash commands
- `download`: Download service and functionality
- `search`: Search and filtering
- `db`: Database operations
- `config`: Configuration changes
- `ui`: Discord UI/embeds/buttons
- `deps`: Dependencies
- `build`: Build system, scripts
- `docs`: Documentation
- `test`: Testing
- `myrient`: Myrient service integration
- `pagination`: Pagination functionality
- `filter`: Filtering functionality

### Examples
```bash
feat(search): ✨ add filter to exclude demo games
fix(download): 🐛 resolve ES-DE folder structure mapping
docs(readme): 📝 update installation instructions
refactor(commands): ♻️ improve pagination button logic
chore(deps): ⬆️ upgrade discord.js to v14.21.0
perf(myrient): ⚡ optimize search query performance
```

### Special Dependency Commits
- `chore(deps): ⬆️ <message>` - Dependency upgrades
- `chore(deps): ⬇️ <message>` - Dependency downgrades

## Development Workflow

1. Use `pnpm` for package management
2. Build: `pnpm build`
3. Start: `pnpm start`
4. Development: `pnpm dev`
5. Clean: `pnpm clean`

## Code Style
- Use TypeScript
- Follow existing code patterns
- Add JSDoc comments for public methods
- Keep functions focused and small