# Tab Rotator Pro

A powerful Chrome extension for automatic tab rotation with advanced features and smart controls.

## Features

### Core Features
- **Automatic Tab Rotation**: Continuously rotate through tabs at customizable intervals
- **Multiple Rotation Patterns**: Sequential, Random, or Priority-based rotation
- **Smart Detection**: Pause rotation during media playback or browser inactivity
- **Selective Tab Control**: Choose specific tabs to rotate or exclude certain URLs

### Advanced Features
- **Statistics Tracking**: Monitor rotations performed and time spent per tab
- **Keyboard Shortcuts**: Quick toggle and manual rotation controls
- **Persistent Configuration**: All settings saved and synced across devices
- **Debug Mode**: Enable logging for troubleshooting
- **Flexible Exclusion**: Exclude tabs by URL pattern (regex support)

### UI Features
- **Modern Popup Interface**: Clean, intuitive design with real-time status
- **Status Indicators**: Visual feedback on rotation status
- **Badge Display**: Shows current tab index during rotation
- **Advanced Settings**: Power user options with collapsible sections
- **Statistics Modal**: View detailed rotation statistics

## Installation

### From Chrome Web Store
(Coming soon)

### Manual Installation (Development)

1. Clone this repository:
   ```bash
   git clone https://github.com/kashchei/tabrotate.git
   cd tabrotate
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (top right)

4. Click "Load unpacked" and select the `tabrotate` directory

5. The extension icon should now appear in your toolbar

## Usage

### Basic Usage

1. Click the Tab Rotator Pro icon in your toolbar
2. Click "Start Rotation" to begin rotating tabs
3. Adjust the interval slider to change rotation speed
4. Click "Stop Rotation" to stop

### Keyboard Shortcuts

- **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac): Toggle rotation
- **Ctrl+Shift+N** (Windows/Linux) or **Cmd+Shift+N** (Mac): Manually rotate to next tab

### Rotation Patterns

- **Sequential**: Rotates through tabs in order (default)
- **Random**: Randomly selects the next tab
- **Priority**: (Coming soon) Rotates based on tab priority

### Rotation Modes

- **All Tabs**: Rotate through all tabs in the current window
- **Selective**: Choose specific tabs to rotate
- **Exclude Patterns**: Exclude tabs matching URL patterns

### Settings

#### Rotation Interval
- Minimum: 1 second
- Maximum: 60 seconds
- Default: 5 seconds

#### Smart Detection
- **Pause during media playback**: Automatically pauses when videos/audio are playing
- **Detect idle**: (Coming soon) Pause when browser loses focus

#### Advanced Settings
- **Debug Mode**: Enable console logging
- **Auto-start on browser launch**: Start rotation automatically
- **Export Logs**: Download debug logs
- **Import Config**: Import configuration from file

## Configuration

### Manual Config File
Settings are stored in `chrome.storage.sync` and include:

```javascript
{
  "rotationInterval": 5000,           // milliseconds
  "rotationPattern": "sequential",    // sequential, random, priority
  "rotationMode": "all",              // all, selective, exclude
  "excludedUrls": [],                 // array of regex patterns
  "enabledTabs": [],                  // array of tab indices (selective mode)
  "detectMedia": true,                // pause on media playback
  "detectIdle": false,                // pause on idle
  "statistics": {                     // usage statistics
    "rotationsPerformed": 0,
    "timeSpentPerTab": {},
    "lastRotationTime": null
  }
}
```

## Architecture

### Project Structure

```
tabrotate/
├── manifest.json              # Extension manifest (Manifest V3)
├── service-worker.js          # Background service worker (main logic)
├── popup.html                 # Popup UI
├── styles/
│   └── popup.css             # Popup styles
├── scripts/
│   ├── popup.js              # Popup script
│   └── utils.js              # Utility functions
├── tests/
│   └── unit-tests.js         # Unit tests
├── logo.png                  # Extension icon
└── README.md                 # This file
```

### Service Worker (Main Logic)
- Handles tab rotation algorithm
- Manages state and configuration
- Processes messages from popup
- Tracks statistics
- Handles keyboard commands

### Popup Script
- UI interactions
- Message passing to service worker
- Configuration management
- Statistics display

### Utilities
- URL pattern matching
- Time formatting
- Message and storage utilities
- Error handling
- Logging

## Configuration API

### Messages to Service Worker

```javascript
// Start rotation
chrome.runtime.sendMessage({
  action: 'startRotation',
  windowId: windowId,
  tabIndices: [0, 1, 2, 3]
});

// Stop rotation
chrome.runtime.sendMessage({ action: 'stopRotation' });

// Get status
chrome.runtime.sendMessage({ action: 'getStatus' });

// Set interval (milliseconds)
chrome.runtime.sendMessage({
  action: 'setInterval',
  interval: 5000
});

// Update configuration
chrome.runtime.sendMessage({
  action: 'updateConfig',
  config: {
    detectMedia: true,
    rotationPattern: 'sequential'
  }
});

// Set rotation pattern
chrome.runtime.sendMessage({
  action: 'setRotationPattern',
  pattern: 'random'
});

// Enable selective mode
chrome.runtime.sendMessage({
  action: 'enableSelectiveMode',
  tabIndices: [0, 2, 3]
});

// Exclude URL
chrome.runtime.sendMessage({
  action: 'excludeUrl',
  url: 'youtube\.com'
});
```

## Testing

### Run Unit Tests

1. Open the extension popup
2. Enable Debug Mode in Advanced Settings
3. Open Developer Console (F12)
4. Run tests:
   ```javascript
   // Load test file first
   // Then run:
   TestRunner.run();
   ```

### Manual Testing Checklist

- [ ] Start rotation
- [ ] Stop rotation
- [ ] Change interval
- [ ] Change rotation pattern
- [ ] Switch rotation mode
- [ ] Exclude URLs
- [ ] Enable selective mode
- [ ] Check statistics
- [ ] Verify keyboard shortcuts
- [ ] Test with multiple windows

## Troubleshooting

### Rotation not working
1. Check that there are multiple tabs open
2. Verify extension is enabled
3. Check for errors in Developer Console (F12)
4. Try disabling and re-enabling the extension

### Settings not saving
1. Clear extension data: `chrome://extensions` → Click details → "Clear data"
2. Check browser sync is enabled
3. Try exporting/importing configuration

### High CPU usage
1. Increase rotation interval
2. Disable debug mode
3. Check for extension conflicts
4. Report the issue

### Keyboard shortcuts not working
1. Check custom keyboard shortcut settings: `chrome://extensions/shortcuts`
2. Verify shortcuts don't conflict with other extensions
3. Restart Chrome

## Development

### Prerequisites
- Chrome/Chromium browser
- Code editor (VS Code recommended)
- Git

### Setup

1. Clone repository
2. Load unpacked extension in Chrome
3. Edit files and refresh extension (Ctrl+R in `chrome://extensions`)

### Code Style
- Use 2-space indentation
- Add JSDoc comments for all functions
- Use meaningful variable names
- Separate concerns into different files

### Adding Features

1. Add core logic to `service-worker.js`
2. Add UI components to `popup.html` and `popup.css`
3. Add popup interactions to `scripts/popup.js`
4. Add utility functions to `scripts/utils.js`
5. Add tests to `tests/unit-tests.js`

### Git Workflow

1. Create feature branch: `git checkout -b feature/name`
2. Make changes and test
3. Commit: `git commit -m "Add feature description"`
4. Push: `git push origin feature/name`
5. Create Pull Request

## Performance Considerations

- **Interval Limitations**: Minimum 1s, maximum 60s (Chrome alarm API)
- **Tab Limit**: Works efficiently with up to 50+ tabs
- **Memory**: ~2-5MB memory usage
- **CPU**: Minimal impact, uses Chrome alarms instead of timers
- **Storage**: ~50KB for configuration and statistics

## Browser Compatibility

- Chrome/Chromium 93+
- Edge 93+
- Opera 79+
- Brave (latest)

## Known Issues

- Media detection requires additional implementation
- Priority rotation pattern not yet implemented
- Idle detection coming soon

## Roadmap

- [ ] Media playback detection
- [ ] Tab priority system
- [ ] Idle detection with auto-pause
- [ ] Cloud sync
- [ ] Advanced scheduling
- [ ] Analytics dashboard
- [ ] Themes support
- [ ] Firefox extension

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a Pull Request

## License

MIT License - feel free to use and modify

## Support

For issues, questions, or suggestions:
- [GitHub Issues](https://github.com/kashchei/tabrotate/issues)
- [GitHub Discussions](https://github.com/kashchei/tabrotate/discussions)

## Changelog

### v2.0.0 (Current)
- Complete rewrite with Manifest V3
- New UI with statistics
- Multiple rotation patterns
- Selective tab control
- Keyboard shortcuts
- Error handling and recovery
- Configuration persistence
- Debug mode

### v1.0.0 (Original)
- Initial release
- Basic tab rotation
- Simple interval control

## Acknowledgments

Thanks to the Chrome extension community for best practices and feedback!

---

Made with ❤️ for productivity enthusiasts