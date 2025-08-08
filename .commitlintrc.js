module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'core',        // Core bot functionality
        'commands',    // Discord slash commands
        'download',    // Download service and functionality  
        'search',      // Search and filtering
        'db',          // Database operations
        'config',      // Configuration changes
        'ui',          // Discord UI/embeds/buttons
        'deps',        // Dependencies
        'build',       // Build system, scripts
        'docs',        // Documentation
        'test',        // Testing
        'myrient',     // Myrient service integration
        'pagination',  // Pagination functionality
        'filter',      // Filtering functionality
      ]
    ],
    'type-enum': [
      2,
      'always',
      [
        'feat',        // ✨ New features or functionality
        'fix',         // 🐛 Bug fixes
        'docs',        // 📝 Documentation changes
        'style',       // 🎨 Code style changes
        'refactor',    // ♻️ Code refactoring
        'test',        // ✅ Tests
        'chore',       // 🧹 Maintenance tasks
        'perf',        // ⚡ Performance improvements
        'ci',          // 👷 CI/CD changes
        'wip',         // 🚧 Work in progress
      ]
    ],
    // Allow emoji in commit messages
    'subject-case': [0],
    'subject-empty': [0]
  }
};