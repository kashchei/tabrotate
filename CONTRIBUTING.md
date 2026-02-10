# Contributing to Tab Rotator Pro

Thank you for considering contributing to Tab Rotator Pro! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful and constructive in all interactions. We aim to maintain a welcoming and inclusive community.

## Getting Started

### Prerequisites
- Git knowledge
- Chrome/Chromium browser
- Code editor (VS Code recommended)
- Node.js (optional, for running tests)

### Setup Development Environment

1. **Fork the Repository**  
   ```bash
   # Click "Fork" on GitHub
   ```

2. **Clone Your Fork**  
   ```bash
   git clone https://github.com/YOUR-USERNAME/tabrotate.git
   cd tabrotate
   ```

3. **Create Feature Branch**  
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Load Extension in Chrome**  
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `tabrotate` directory

5. **Make Changes**  
   - Edit files in your editor
   - After changes, click refresh (⟳) on the extension card in Chrome

## How to Contribute

### Reporting Bugs

1. **Check existing issues** to avoid duplicates
2. **Create a new issue** with:
   - Clear title
   - Detailed description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots/logs if relevant
   - System info (OS, Chrome version, extension version)

### Suggesting Features

1. **Discuss first**: Open an issue describing the feature
2. **Explain the use case**: Why is this feature needed?
3. **Consider alternatives**: Are there existing workarounds?
4. **Include examples**: Show how the feature would be used

### Submitting Code

#### Before You Start
- Check if there's already an issue or discussion about it
- Discuss major changes in an issue first
- Look at existing code to understand patterns

#### Pull Request Process

1. **Create Feature Branch**  
   ```bash
   git checkout -b feature/descriptive-name
   ```

2. **Make Your Changes**  
   - Follow code style guidelines
   - Add comments for complex logic
   - Keep changes focused and atomic
   - Test thoroughly

3. **Write Tests**  
   - Add/update tests in `tests/unit-tests.js`
   - Test edge cases
   - Ensure tests pass

4. **Update Documentation**  
   - Update README.md if needed
   - Add JSDoc comments
   - Update CHANGELOG.md

5. **Commit Changes**  
   ```bash
   git add .
   git commit -m "Brief description of change"
   ```  
   Use imperative mood: "Add feature" not "Added feature"

6. **Push to Your Fork**  
   ```bash
   git push origin feature/descriptive-name
   ```

7. **Create Pull Request**  
   - Provide clear description
   - Reference any related issues
   - Explain the reasoning behind changes
   - Include screenshots/demo if visual

## Code Guidelines

### JavaScript Style

- **Indentation**: 2 spaces (no tabs)
- **Semicolons**: Required
- **Quotes**: Single quotes for strings
- **Naming**: camelCase for variables/functions, UPPER_CASE for constants
- **Comments**: JSDoc format for functions

### JSDoc Format

```javascript
/**
 * Brief description of function
 * 
 * Longer description if needed, explaining what the function does,
 * any important behaviors, or edge cases.
 * 
 * @param {Type} paramName - Description of parameter
 * @returns {Type} Description of return value
 * @throws {ErrorType} Description of error
 * 
 * @example
 * // Example usage
 * const result = myFunction('input');
 */
function myFunction(paramName) {
  // Implementation
}
```

### File Organization

- **One module per file**
- **Related functions grouped together**
- **Constants at the top**
- **Exports at the bottom**
- **Meaningful file names**

### Error Handling

```javascript
try {
  // Operation that might fail
  await chrome.tabs.query({ currentWindow: true });
} catch (error) {
  logError('Operation failed', error);
  // Handle error appropriately
}
```

### Async/Await

```javascript
// Prefer async/await over promises
async function fetchData() {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    logError('Fetch failed', error);
  }
}
```

## Testing

### Unit Testing

1. **Add tests to `tests/unit-tests.js`**  
   ```javascript
   TestRunner.test('Feature name - scenario', () => {
     const result = myFunction(input);
     assert.equal(result, expected);
   });
   ```

2. **Run tests in browser console**  
   ```javascript
   TestRunner.run();
   ```

### Manual Testing

1. **Create test checklist**
2. **Test in Chrome and Edge**
3. **Test with different tab counts**
4. **Test keyboard shortcuts**
5. **Check DevTools for errors**

### Browser Compatibility

- Test in Chrome/Edge 93+
- Check for console errors
- Verify storage API works
- Test message passing

## Documentation

### README Updates

Update `README.md` when:
- Adding new features
- Changing configuration options
- Updating keyboard shortcuts
- Changing installation instructions

### Inline Comments

- Explain the "why", not the "what"
- Comment complex algorithms
- Document non-obvious decisions
- Keep comments up-to-date

### JSDoc Comments

- Required for all public functions
- Include @param, @returns, @throws
- Add @example for complex functions

## Commit Messages

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation
- **style**: Code style (formatting, missing semicolons)
- **refactor**: Code refactoring
- **perf**: Performance improvement
- **test**: Adding tests
- **chore**: Dependency updates, config changes

### Examples
```
feat(rotation): add random pattern support

Implements random tab selection for rotation.
Users can now choose between sequential and random patterns
in the settings menu.

Closes #123
```

```
fix(ui): prevent popup crash on empty tab list

Added validation to check if tabs exist before
accessing tab properties.

Fixes #456
```

## Pull Request Review

### What Reviewers Look For
- Code follows style guidelines
- Changes are focused and atomic
- Tests are included and pass
- Documentation is updated
- No breaking changes without discussion
- Performance impact is acceptable
- No security issues

### How to Handle Feedback
- Be open to suggestions
- Ask for clarification if needed
- Discuss disagreements respectfully
- Make requested changes
- Push updates to your branch (PR auto-updates)

## Release Process

(For maintainers)

1. Update version in `manifest.json`
2. Update `CHANGELOG.md`
3. Merge PR to main
4. Create GitHub release tag
5. Prepare Web Store submission

## Tools & Resources

### Useful Links
- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/)
- [JavaScript Best Practices](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)

### Extensions for Development
- VS Code: ESLint, Prettier, Thunder Client
- Chrome DevTools: Built-in debugger

## Common Tasks

### Adding a New Feature

1. Create issue first (discuss approach)
2. Create feature branch
3. Modify relevant files:
   - Service worker (core logic)
   - Popup.html (UI)
   - Popup.js (interactions)
   - Styles (CSS)
   - Utils (helper functions)
4. Add tests
5. Update documentation
6. Create PR

### Fixing a Bug

1. Create/link to bug issue
2. Create fix branch
3. Write failing test
4. Fix the bug
5. Verify test passes
6. Create PR

### Updating Dependencies

1. Update `manifest.json` if needed
2. Test thoroughly
3. Document changes
4. Create PR

### Documentation-Only Changes

- Use `[skip ci]` in commit message if no code changes
- Smaller PRs are often easier to review
- Include examples and explanations

## Questions?

- Open an issue with the "question" label
- Check GitHub Discussions
- Review existing documentation

## Recognition

Contributors will be:
- Listed in README.md
- Mentioned in release notes
- Credited for major features

Thank you for contributing! ❤️
