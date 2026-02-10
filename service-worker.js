// TabRotate Service Worker - Manifest V3
// State machine: IDLE, ROTATING, PAUSED

const ALARM_NAME = 'TAB_ROTATION_ALARM';
const COUNTDOWN_ALARM_NAME = 'COUNTDOWN_ALARM';

// State machine states
const States = {
  IDLE: 'stopped',
  ROTATING: 'running',
  PAUSED: 'paused'
};

let refreshRegistry = {}; 

let state = {
  status: States.IDLE,
  currentIndex: 0,
  tabsConfig: {}, 
  globalConfig: {
    defaultInterval: 10,
    fullscreenEnabled: false,
    overlayEnabled: true,
    autoStart: false
  }
};

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
  try {
    await loadState();
    if (state.globalConfig.autoStart && state.status !== States.ROTATING) {
      await startRotation();
    }
  } catch (error) {
    console.error('Startup error:', error);
  }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  try {
    await loadState();
    await updateIcon('red');
    // Clean up any existing alarms
    await chrome.alarms.clearAll();
  } catch (error) {
    console.error('Install error:', error);
  }
});

// Load state from storage
async function loadState() {
  try {
    const data = await chrome.storage.local.get(['kioskState']);
    if (data.kioskState) {
      state = { 
        ...state, 
        ...data.kioskState,
        globalConfig: { ...state.globalConfig, ...data.kioskState.globalConfig }
      };
      const iconColor = state.status === States.ROTATING ? 'green' : 
                       state.status === States.PAUSED ? 'yellow' : 'red';
      await updateIcon(iconColor);
    }
  } catch (error) {
    console.error('Error loading state:', error);
  }
}

// Save state to storage
async function saveState() {
  try {
    await chrome.storage.local.set({ kioskState: state });
  } catch (error) {
    console.error('Error saving state:', error);
  }
}

// Update extension icon
async function updateIcon(color) {
  try {
    const canvas = new OffscreenCanvas(16, 16);
    const context = canvas.getContext('2d');
    context.beginPath();
    context.arc(8, 8, 6, 0, 2 * Math.PI);
    context.fillStyle = color === 'green' ? '#4CAF50' : 
                       color === 'yellow' ? '#FFC107' : '#F44336';
    context.fill();
    const imageData = context.getImageData(0, 0, 16, 16);
    await chrome.action.setIcon({ imageData });
  } catch (error) {
    console.error('Error updating icon:', error);
  }
}

// Navigate to next/previous tab
async function navigate(direction) {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    
    // Boundary check: ensure we have tabs
    if (!tabs || tabs.length === 0) {
      console.warn('No tabs available for navigation');
      return;
    }

    const activeTabs = tabs.filter(t => (state.tabsConfig[t.id]?.included !== false));

    // Boundary check: ensure we have active tabs
    if (activeTabs.length === 0) {
      console.warn('No active tabs available for rotation');
      return;
    }

    // Update index with boundary checking
    if (direction === 'next') {
      state.currentIndex = (state.currentIndex + 1) % activeTabs.length;
    } else if (direction === 'prev') {
      state.currentIndex = (state.currentIndex - 1 + activeTabs.length) % activeTabs.length;
    }

    const currentTab = activeTabs[state.currentIndex];
    
    // Verify tab still exists before trying to activate it
    try {
      await chrome.tabs.get(currentTab.id);
    } catch (e) {
      console.warn('Tab no longer exists:', currentTab.id);
      // Tab was closed, reset to first tab
      state.currentIndex = 0;
      if (state.status === States.ROTATING) {
        await rotate();
      }
      return;
    }

    // Activate the tab
    try {
      await chrome.tabs.update(currentTab.id, { active: true });
      
      // Update badge to show current position
      if (state.status === States.ROTATING) {
        await chrome.action.setBadgeText({ 
          text: `${state.currentIndex + 1}/${activeTabs.length}` 
        });
        await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
      }
    } catch (error) {
      console.error('Error activating tab:', error);
      return;
    }
    
    // Check for error pages after a short delay
    setTimeout(async () => {
      try {
        const updatedTab = await chrome.tabs.get(currentTab.id);
        if (updatedTab && (updatedTab.title.includes("not found") || 
            updatedTab.title.includes("Error") || 
            updatedTab.title.includes("timed out"))) {
          if (state.status === States.ROTATING) {
            await rotate();
          }
        }
      } catch (e) {
        console.warn('Error checking tab status:', e);
      }
    }, 2000);

    // Inject overlay if enabled
    if (state.globalConfig.overlayEnabled) {
      setTimeout(() => ensureOverlay(currentTab.id), 100);
    }

    // Prefetch next tab (refresh if configured)
    const nextIndex = (state.currentIndex + 1) % activeTabs.length;
    const nextTab = activeTabs[nextIndex];
    const now = Date.now();
    const lastRefresh = refreshRegistry[nextTab.id] || 0;

    if (state.tabsConfig[nextTab.id]?.refreshBefore && (now - lastRefresh > 30000)) {
      try {
        await chrome.tabs.reload(nextTab.id);
        refreshRegistry[nextTab.id] = now;
      } catch (error) {
        console.warn('Error refreshing tab:', error);
      }
    }

    // Handle fullscreen mode
    if (state.globalConfig.fullscreenEnabled) {
      try {
        const win = await chrome.windows.getCurrent();
        if (win.state !== 'fullscreen') {
          await chrome.windows.update(win.id, { state: 'fullscreen' });
        }
      } catch (error) {
        console.warn('Error setting fullscreen:', error);
      }
    }

    // Schedule next rotation if in ROTATING state
    if (state.status === States.ROTATING) {
      const interval = state.tabsConfig[currentTab.id]?.interval || state.globalConfig.defaultInterval;
      await scheduleRotation(interval);
    }

    await saveState();
  } catch (error) {
    console.error('Navigation error:', error);
  }
}

// Start rotation
async function startRotation() {
  try {
    state.status = States.ROTATING;
    await updateIcon('green');
    await saveState();
    await rotate();
  } catch (error) {
    console.error('Error starting rotation:', error);
  }
}

// Pause rotation
async function pauseRotation() {
  try {
    state.status = States.PAUSED;
    await updateIcon('yellow');
    await chrome.alarms.clear(ALARM_NAME);
    await chrome.alarms.clear(COUNTDOWN_ALARM_NAME);
    await chrome.action.setBadgeText({ text: '' });
    await saveState();
  } catch (error) {
    console.error('Error pausing rotation:', error);
  }
}

// Stop rotation
async function stopRotation() {
  try {
    state.status = States.IDLE;
    await updateIcon('red');
    await chrome.alarms.clear(ALARM_NAME);
    await chrome.alarms.clear(COUNTDOWN_ALARM_NAME);
    await chrome.action.setBadgeText({ text: '' });
    await saveState();
  } catch (error) {
    console.error('Error stopping rotation:', error);
  }
}

// Rotate to next tab
async function rotate() {
  if (state.status !== States.ROTATING) return;
  await navigate('next');
}

// Inject overlay script
function ensureOverlay(tabId) {
  if (!state.globalConfig.overlayEnabled) return;
  
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['overlay.js']
  }).catch((error) => {
    // Silently fail for chrome:// pages and other restricted pages
    console.debug('Could not inject overlay:', error.message);
  }); 
}

// Schedule rotation using Chrome Alarms API
async function scheduleRotation(seconds) {
  try {
    // Clear existing alarms
    await chrome.alarms.clear(ALARM_NAME);
    await chrome.alarms.clear(COUNTDOWN_ALARM_NAME);
    
    // Schedule the main rotation alarm
    await chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: seconds / 60
    });

    // Schedule countdown updates (every second)
    await chrome.alarms.create(COUNTDOWN_ALARM_NAME, {
      periodInMinutes: 1 / 60 // 1 second
    });

    // Store rotation end time for countdown
    state.rotationEndTime = Date.now() + (seconds * 1000);
    
    // Send initial countdown
    await updateCountdown(seconds);
  } catch (error) {
    console.error('Error scheduling rotation:', error);
  }
}

// Update countdown overlay
async function updateCountdown(remaining) {
  if (!state.globalConfig.overlayEnabled) return;
  
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const activeTabs = tabs.filter(t => (state.tabsConfig[t.id]?.included !== false));
    
    if (activeTabs.length === 0) return;
    
    const nextIdx = (state.currentIndex + 1) % activeTabs.length;
    const nextTitle = activeTabs[nextIdx]?.title || "Next Tab";

    const currentTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (currentTabs && currentTabs[0]) {
      chrome.tabs.sendMessage(currentTabs[0].id, { 
        type: 'COUNTDOWN', 
        remaining,
        nextTitle: nextTitle,
        status: state.status
      }).catch((error) => {
        // Overlay might not be injected yet, try to inject it
        ensureOverlay(currentTabs[0].id);
      });
    }
  } catch (error) {
    console.debug('Error updating countdown:', error);
  }
}

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    if (alarm.name === ALARM_NAME) {
      // Main rotation alarm
      await rotate();
    } else if (alarm.name === COUNTDOWN_ALARM_NAME) {
      // Countdown update alarm
      if (state.status === States.ROTATING && state.rotationEndTime) {
        const remaining = Math.max(0, Math.ceil((state.rotationEndTime - Date.now()) / 1000));
        await updateCountdown(remaining);
        
        // Clear countdown alarm if rotation is complete
        if (remaining === 0) {
          await chrome.alarms.clear(COUNTDOWN_ALARM_NAME);
        }
      } else {
        // Clear countdown alarm if not rotating
        await chrome.alarms.clear(COUNTDOWN_ALARM_NAME);
      }
    }
  } catch (error) {
    console.error('Alarm handler error:', error);
  }
});

// Handle tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  try {
    if (state.globalConfig.overlayEnabled) {
      ensureOverlay(activeInfo.tabId);
    }
  } catch (error) {
    console.error('Tab activation handler error:', error);
  }
});

// Handle tab removal - cleanup and adjust index
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  try {
    // Remove tab from config
    if (state.tabsConfig[tabId]) {
      delete state.tabsConfig[tabId];
    }
    
    // Remove from refresh registry
    if (refreshRegistry[tabId]) {
      delete refreshRegistry[tabId];
    }
    
    // Adjust current index if needed
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const activeTabs = tabs.filter(t => (state.tabsConfig[t.id]?.included !== false));
    
    if (activeTabs.length > 0 && state.currentIndex >= activeTabs.length) {
      state.currentIndex = Math.max(0, activeTabs.length - 1);
    }
    
    await saveState();
  } catch (error) {
    console.error('Tab removal handler error:', error);
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === 'START') {
        await startRotation();
      } else if (message.type === 'PAUSE') {
        await pauseRotation();
      } else if (message.type === 'STOP') {
        await stopRotation();
      } else if (message.type === 'NAV_NEXT') {
        await navigate('next');
      } else if (message.type === 'NAV_PREV') {
        await navigate('prev');
      } else if (message.type === 'UPDATE_CONFIG') {
        state.globalConfig = message.config;
        state.tabsConfig = message.tabsConfig;
        await saveState();
      } else if (message.type === 'GET_STATE') {
        sendResponse(state);
        return;
      }
      await saveState();
      sendResponse({ success: true });
    } catch (error) {
      console.error('Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  // Return true to indicate async response
  return true;
});

// Handle keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
  try {
    if (command === 'toggle-rotation') {
      if (state.status === States.ROTATING) {
        await pauseRotation();
      } else {
        await startRotation();
      }
    } else if (command === 'next-tab') {
      await navigate('next');
    }
  } catch (error) {
    console.error('Command handler error:', error);
  }
});

// Cleanup on suspend
chrome.runtime.onSuspend.addListener(async () => {
  try {
    // Save current state
    await saveState();
    // Clear all alarms
    await chrome.alarms.clearAll();
  } catch (error) {
    console.error('Suspend handler error:', error);
  }
});
