# Tab Rotation

A Chrome extension for automatic tab rotation with per-tab controls and an on-page overlay countdown.

## Features

### Core Features
- **Automatic Tab Rotation**: Continuously rotate through tabs in sequential order at configurable intervals
- **Per-Tab Control**: Include or exclude individual tabs from rotation, set per-tab interval overrides, and optionally refresh tabs before they are shown
- **Fullscreen Mode**: Automatically enter fullscreen during rotation
- **Auto-Start**: Optionally start rotation automatically when the browser launches

### UI Features
- **Popup Interface**: Clean design with Start/Pause/Stop controls and real-time status
- **Status Indicators**: Color-coded extension icon (green/yellow/red) and an animated status banner in the popup
- **Current Tab Highlighting**: The active tab in the rotation is highlighted in the popup tab list
- **Overlay Countdown**: An on-page overlay shows the countdown timer, next tab title, and prev/next/pause controls
- **Input Validation**: Interval inputs are validated (1–3600 seconds) with visual feedback
- **Error Notifications**: Toast-style error messages for configuration and connection issues

### Keyboard Shortcuts
- **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac): Toggle rotation on/off
- **Ctrl+Shift+N** (Windows/Linux) or **Cmd+Shift+N** (Mac): Rotate to next tab

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

1. Click the Tab Rotation icon in your toolbar
2. Adjust the default interval and toggle settings as needed
3. Use the per-tab checkboxes to include/exclude specific tabs or set per-tab intervals
4. Click **Start** to begin rotating tabs
5. Click **Pause** to temporarily pause or **Stop** to end rotation

### Settings

#### Global Settings
- **Default Interval**: 1–3600 seconds (default: 10 seconds)
- **Enable Fullscreen**: Enter fullscreen mode during rotation
- **Show Overlay Countdown**: Display an on-page overlay with countdown and controls
- **Start rotation on Start-up**: Automatically begin rotation when the browser starts

#### Per-Tab Overrides
Each tab in the current window is listed with:
- **Interval override**: Set a custom interval (in seconds) for that tab
- **Refresh before show**: Reload the tab in the background before switching to it
- **Include**: Uncheck to exclude the tab from rotation

## Configuration

Settings are stored in `chrome.storage.local` with the following structure:

```javascript
{
  "kioskState": {
    "status": "stopped",             // "running", "paused", or "stopped"
    "currentIndex": 0,               // index of the current tab in the rotation
    "tabsConfig": {                   // per-tab overrides, keyed by tab ID
      "<tabId>": {
        "interval": 15,              // per-tab interval in seconds (or null for default)
        "refreshBefore": false,      // reload tab before showing
        "included": true             // include tab in rotation
      }
    },
    "globalConfig": {
      "defaultInterval": 10,         // default interval in seconds
      "fullscreenEnabled": false,    // enter fullscreen during rotation
      "overlayEnabled": true,        // show on-page overlay countdown
      "autoStart": false             // start rotation on browser launch
    }
  }
}
```

## Architecture

### Project Structure

```
tabrotate/
├── manifest.json          # Extension manifest (Manifest V3)
├── service-worker.js      # Background service worker (rotation logic and state)
├── popup.html             # Popup UI and styles
├── popup.js               # Popup script (settings, controls, tab list)
├── overlay.js             # On-page overlay (countdown, navigation buttons)
├── logo.png               # Extension icon
└── README.md              # This file
```

### Service Worker (`service-worker.js`)
- Tab rotation algorithm (sequential, next/prev navigation)
- State management and persistence (`chrome.storage.local`)
- Message handling from popup and overlay
- Keyboard command handling
- Fullscreen management
- Race-condition-safe navigation via a mutex

### Popup (`popup.html` / `popup.js`)
- Start/Pause/Stop controls
- Global settings (interval, fullscreen, overlay, auto-start)
- Per-tab overrides (interval, refresh-before, include/exclude)
- Status banner and current-tab highlighting
- Input validation and error notifications

### Overlay (`overlay.js`)
- Countdown timer display
- Next tab title preview
- Previous/Next/Pause-Play controls
- State synchronization with the service worker

## Message API

The popup, overlay, and service worker communicate via `chrome.runtime.sendMessage`. The supported message types are:

```javascript
// Start rotation
chrome.runtime.sendMessage({ type: 'START' });

// Pause rotation
chrome.runtime.sendMessage({ type: 'PAUSE' });

// Stop rotation
chrome.runtime.sendMessage({ type: 'STOP' });

// Navigate to next tab
chrome.runtime.sendMessage({ type: 'NAV_NEXT' });

// Navigate to previous tab
chrome.runtime.sendMessage({ type: 'NAV_PREV' });

// Get current state (returns state object via sendResponse)
chrome.runtime.sendMessage({ type: 'GET_STATE' });

// Update configuration
chrome.runtime.sendMessage({
  type: 'UPDATE_CONFIG',
  config: {
    defaultInterval: 10,
    fullscreenEnabled: false,
    overlayEnabled: true,
    autoStart: false
  },
  tabsConfig: {
    "<tabId>": { interval: 15, refreshBefore: false, included: true }
  }
});
```

## Testing

### Manual Testing Checklist

- [ ] Start rotation with multiple tabs open
- [ ] Pause and resume rotation
- [ ] Stop rotation
- [ ] Change global interval
- [ ] Set a per-tab interval override
- [ ] Exclude a tab and verify it is skipped
- [ ] Enable "refresh before show" and verify reload
- [ ] Toggle fullscreen mode
- [ ] Toggle overlay display
- [ ] Verify overlay countdown and next-tab title
- [ ] Use overlay prev/next/pause buttons
- [ ] Verify keyboard shortcuts (Ctrl+Shift+R, Ctrl+Shift+N)
- [ ] Enable auto-start, restart browser, verify rotation starts
- [ ] Test with a single tab (rotation should have no effect)

## Troubleshooting

### Rotation not working
1. Check that there are multiple tabs open
2. Verify extension is enabled
3. Check for errors in Developer Console (F12)
4. Try disabling and re-enabling the extension

### Settings not saving
1. Clear extension data: `chrome://extensions` → Click details → "Clear data"
2. Try removing and re-loading the extension

### High CPU usage
1. Increase rotation interval
2. Check for extension conflicts
3. Report the issue

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
2. Add UI components and styles to `popup.html`
3. Add popup interactions to `popup.js`
4. Add overlay features to `overlay.js`
5. Update `manifest.json` if new permissions are needed

### Git Workflow

1. Create feature branch: `git checkout -b feature/name`
2. Make changes and test
3. Commit: `git commit -m "Add feature description"`
4. Push: `git push origin feature/name`
5. Create Pull Request

## Performance Considerations

- **Interval Range**: 1–3600 seconds
- **Tab Limit**: Works efficiently with many open tabs
- **Memory**: Lightweight; uses `setTimeout` for rotation timing
- **Storage**: Small footprint for configuration in `chrome.storage.local`

## Browser Compatibility

- Chrome/Chromium 93+
- Edge 93+
- Opera 79+
- Brave (latest)

## Known Issues

- Priority and random rotation patterns are not yet implemented
- Media playback detection is not yet implemented
- Idle detection is not yet implemented

## Recently Fixed (v2.0.0)

- ✅ Race conditions in tab navigation
- ✅ Memory leaks from timers
- ✅ State synchronization issues
- ✅ Duplicate event listeners
- ✅ Silent error failures
- ✅ Async/await handling bugs

For details, see [STABILITY_FIXES.md](STABILITY_FIXES.md)

## Roadmap

- [ ] Random and shuffle rotation modes
- [ ] Priority-based rotation
- [ ] Media playback detection (auto-pause)
- [ ] Idle detection with auto-pause
- [ ] URL pattern exclusion (regex)
- [ ] Statistics tracking (rotation count, time per tab)
- [ ] Debug mode with exportable logs
- [ ] Import/export configuration
- [ ] Badge counter showing rotation position
- [ ] Dark mode
- [ ] Cloud sync
- [ ] Advanced scheduling
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

### v2.0.0 (Current - Stability Release)
- **Critical Stability Fixes**
  - Fixed race condition in tab navigation preventing concurrent calls
  - Fixed async/await handling in message handlers
  - Fixed timer memory leaks with proper cleanup
  - Fixed duplicate event listeners in overlay
  - Fixed state synchronization between popup and overlay
- **Error Handling Improvements**
  - Added comprehensive error logging for debugging
  - Added user-friendly error messages in popup
  - All message passing now has proper error handlers
- **UI Improvements**
  - Added status banner with animated indicator
  - Added input validation (1–3600 seconds) with visual feedback
  - Added current tab highlighting in popup
  - Added auto-start on browser launch option
- **Documentation**
  - Added STABILITY_FIXES.md with detailed fix descriptions
  - Added TESTING_GUIDE.md with comprehensive test cases
  - Added SUMMARY.md with complete overview

### v1.0.0 (Original)
- Initial release
- Basic tab rotation
- Simple interval control

## Acknowledgments

Thanks to the Chrome extension community for best practices and feedback!

---

Made with ❤️ for productivity enthusiasts