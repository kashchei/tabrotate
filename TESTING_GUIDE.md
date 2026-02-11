# Stability Testing Guide

This guide helps test the stability fixes applied to Tab Rotator Pro.

## Prerequisites
- Chrome/Chromium browser with Developer Mode enabled
- Multiple tabs open (at least 5-10 for thorough testing)

## Installation
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select the tabrotate directory
4. The extension icon should appear in your toolbar

## Test Cases

### 1. Basic Rotation Test
**Purpose:** Verify basic rotation works without crashes

**Steps:**
1. Click the extension icon
2. Set default interval to 5 seconds
3. Click "Start Rotation"
4. Observe rotation through 5-10 tabs
5. Click "Pause" then "Start" again
6. Click "Stop"

**Expected:** Smooth rotation with no errors in console

### 2. Rapid Control Test
**Purpose:** Test race condition fixes

**Steps:**
1. Rapidly click Start/Stop/Pause buttons in quick succession (5-10 times)
2. Check console for errors
3. Verify rotation continues normally after clicking Start

**Expected:** No crashes, no duplicate rotations, clean state transitions

### 3. Tab Closure During Rotation
**Purpose:** Test error handling when tabs are closed

**Steps:**
1. Start rotation with 10+ tabs
2. Manually close 2-3 tabs while rotation is running
3. Observe rotation continues with remaining tabs
4. Check console for error messages (should be logged, not silent)

**Expected:** Rotation continues smoothly, errors logged but handled gracefully

### 4. Overlay State Synchronization
**Purpose:** Test overlay pause/play button stays in sync

**Steps:**
1. Start rotation with overlay enabled
2. Use popup to pause rotation
3. Check overlay button shows correct state (▶)
4. Click overlay play button
5. Check popup shows rotation is running
6. Click overlay pause button
7. Verify both UIs stay synchronized

**Expected:** Overlay and popup always show same state

### 5. Multiple Tab Switches
**Purpose:** Test overlay injection and cleanup

**Steps:**
1. Start rotation
2. Manually switch between tabs 10-15 times
3. Open console on each tab and check for errors
4. Look for duplicate countdown messages

**Expected:** Only one countdown per second, no duplicate overlays

### 6. Configuration Save Test
**Purpose:** Test async save operations

**Steps:**
1. Change default interval to 15
2. Toggle fullscreen checkbox multiple times rapidly
3. Change tab-specific intervals for several tabs
4. Close and reopen popup
5. Verify all settings preserved

**Expected:** All changes saved correctly, no race conditions

### 7. Error Boundary Test
**Purpose:** Test error handling doesn't crash extension

**Steps:**
1. Open browser console (F12)
2. Go to Extension service worker console
3. Start rotation
4. Look for any errors
5. Verify errors are logged with context (tab IDs, operation names)

**Expected:** Errors logged with helpful messages, no silent failures

### 8. Memory Leak Test
**Purpose:** Verify timer cleanup

**Steps:**
1. Start rotation
2. Let run for 2-3 minutes
3. Click Stop
4. Start again
5. Stop again
6. Repeat 5-10 times
7. Check Chrome Task Manager (Shift+Esc) for memory usage

**Expected:** Memory usage stays stable, doesn't grow with each start/stop

### 9. Long-Running Stability Test
**Purpose:** Test stability over extended period

**Steps:**
1. Set interval to 3 seconds
2. Start rotation
3. Let run for 30+ minutes
4. Monitor console for errors
5. Verify rotation continues smoothly

**Expected:** Stable operation, no memory leaks, no errors

### 10. Concurrent Navigation Test
**Purpose:** Test navigation mutex

**Steps:**
1. Start rotation with 3 second interval
2. Rapidly click Next/Previous buttons in overlay
3. Simultaneously change tabs manually
4. Verify no tabs are skipped or repeated
5. Check console for "Navigation already in progress" messages

**Expected:** Navigation mutex prevents concurrent calls, smooth operation

## Console Messages to Expect

### Normal Operation
- No errors during normal rotation
- Occasional info messages about overlay injection

### Expected Logged Errors (Not Silent)
- "Failed to send message to tab X: ..." (when tab closes)
- "Failed to send countdown to tab: ..." (when overlay not ready)
- "Navigation already in progress, skipping" (if concurrent nav attempted)
- "Failed to reload tab X: ..." (if tab closed before refresh)

### Red Flags (Should NOT Appear)
- Uncaught exceptions
- "Cannot read property of null"
- Stack traces from service-worker.js
- Duplicate countdown messages in same tab

## Performance Benchmarks

### Memory Usage
- Initial load: ~2-5 MB
- After 30 min rotation: Should not exceed 10 MB

### CPU Usage
- Idle: 0%
- During rotation: <1% (brief spikes during tab switch)

### Response Time
- Button clicks: Immediate (<100ms)
- Tab rotation: Within 200ms of scheduled time

## Common Issues and Solutions

### Issue: Rotation stops unexpectedly
**Check:** 
- Console for errors
- All tabs still exist
- Browser didn't lose focus (if idle detection enabled)

### Issue: Overlay not appearing
**Check:**
- Overlay enabled in settings
- Console for injection errors
- Page allows content scripts

### Issue: Settings not saving
**Check:**
- No validation errors shown
- Service worker running (check chrome://extensions)
- Console for save errors

## Reporting Issues

If you find issues during testing, report with:
1. Steps to reproduce
2. Console error messages
3. Chrome version
4. Number of tabs
5. Extension settings

## Success Criteria

All tests should pass with:
- ✓ No uncaught exceptions
- ✓ All errors logged with context
- ✓ Smooth rotation with no skipped/duplicate tabs
- ✓ UI always in sync
- ✓ Stable memory usage
- ✓ No duplicate event listeners
