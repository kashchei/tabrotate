let rotationTimer = null;
let refreshRegistry = {}; 
let navigating = false; // Mutex to prevent concurrent navigation

let state = {
  status: 'stopped', 
  currentIndex: 0,
  tabsConfig: {}, 
  globalConfig: {
    defaultInterval: 10,
    fullscreenEnabled: false,
    overlayEnabled: true,
    autoStart: false // New feature flag
  }
};

// Helper function to ensure timer cleanup
function clearRotationTimer() {
  if (rotationTimer !== null) {
    clearTimeout(rotationTimer);
    rotationTimer = null;
  }
}

async function broadcastToAllTabs(message) {
  const tabs = await chrome.tabs.query({});
  tabs.forEach(tab => {
    chrome.tabs.sendMessage(tab.id, message).catch((err) => {
      console.log(`Failed to send message to tab ${tab.id}:`, err.message);
    });
  });
}

chrome.runtime.onStartup.addListener(async () => {
  await loadState();
  if (state.globalConfig.autoStart) {
    state.status = 'running';
    updateIcon('green');
    broadcastToAllTabs({ type: 'SHOW_OVERLAY' });
    rotate();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  loadState();
  updateIcon('red');
});

async function loadState() {
  const data = await chrome.storage.local.get(['kioskState']);
  if (data.kioskState) {
    state = { 
      ...state, 
      ...data.kioskState,
      globalConfig: { ...state.globalConfig, ...data.kioskState.globalConfig }
    };
    updateIcon(state.status === 'running' ? 'green' : state.status === 'paused' ? 'yellow' : 'red');
  }
}

async function saveState() {
  await chrome.storage.local.set({ kioskState: state });
}

function updateIcon(color) {
  const canvas = new OffscreenCanvas(16, 16);
  const context = canvas.getContext('2d');
  context.beginPath();
  context.arc(8, 8, 6, 0, 2 * Math.PI);
  context.fillStyle = color === 'green' ? '#4CAF50' : color === 'yellow' ? '#FFC107' : '#F44336';
  context.fill();
  const imageData = context.getImageData(0, 0, 16, 16);
  chrome.action.setIcon({ imageData });
}

async function navigate(direction) {
  // Prevent concurrent navigation calls
  if (navigating) {
    console.log("Navigation already in progress, skipping");
    return;
  }
  
  navigating = true;
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const activeTabs = tabs.filter(t => (state.tabsConfig[t.id]?.included !== false));

    if (activeTabs.length === 0) {
      navigating = false;
      return;
    }

    if (direction === 'next') {
      state.currentIndex = (state.currentIndex + 1) % activeTabs.length;
    } else if (direction === 'prev') {
      state.currentIndex = (state.currentIndex - 1 + activeTabs.length) % activeTabs.length;
    }

    const currentTab = activeTabs[state.currentIndex];
    const tabExists = await chrome.tabs.get(currentTab.id).catch(() => null);
    if (!tabExists) {
      state.currentIndex = 0;
      navigating = false;
      // Tab no longer exists, retry rotation with reset index
      return rotate();
    }

    await chrome.tabs.update(currentTab.id, { active: true });

    if (state.globalConfig.overlayEnabled) {
      setTimeout(() => ensureOverlay(currentTab.id), 100);
    }

    const nextIndex = (state.currentIndex + 1) % activeTabs.length;
    const nextTab = activeTabs[nextIndex];
    
    // Verify nextTab still exists before refreshing
    if (nextTab) {
      const nextTabExists = await chrome.tabs.get(nextTab.id).catch(() => null);
      if (nextTabExists) {
        const now = Date.now();
        const lastRefresh = refreshRegistry[nextTab.id] || 0;
        if (state.tabsConfig[nextTab.id]?.refreshBefore && (now - lastRefresh > 30000)) {
          chrome.tabs.reload(nextTab.id).catch((err) => {
            console.log(`Failed to reload tab ${nextTab.id}:`, err.message);
          });
          refreshRegistry[nextTab.id] = now;
        }
      }
    }

    if (state.globalConfig.fullscreenEnabled) {
      chrome.windows.getCurrent(win => {
        if (win.state !== 'fullscreen') chrome.windows.update(win.id, { state: 'fullscreen' });
      });
    }

    if (state.status === 'running') {
      startTimer(state.tabsConfig[currentTab.id]?.interval || state.globalConfig.defaultInterval);
    }
    await saveState();
  } catch (e) {
    console.error("Navigation error:", e);
  } finally {
    navigating = false;
  }
}

async function rotate() {
  if (state.status !== 'running') return;
  await navigate('next');
}

function ensureOverlay(tabId) {
  if (!state.globalConfig.overlayEnabled) return;
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['overlay.js']
  }).catch(() => {}); 
}

async function startTimer(seconds) {
  clearRotationTimer();
  
  let remaining = seconds;
  
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const activeTabs = tabs.filter(t => (state.tabsConfig[t.id]?.included !== false));
  const nextIdx = (state.currentIndex + 1) % activeTabs.length;
  const nextTitle = activeTabs[nextIdx]?.title || "Next Tab";

  const tick = () => {
    if (state.status !== 'running') {
      clearRotationTimer();
      return;
    }
    
    if (state.globalConfig.overlayEnabled) {
      chrome.tabs.query({ active: true, currentWindow: true }, (currentTabs) => {
        if (currentTabs[0]) {
          chrome.tabs.sendMessage(currentTabs[0].id, { 
            type: 'COUNTDOWN', 
            remaining,
            nextTitle: nextTitle,
            status: state.status
          }).catch((err) => {
            console.log(`Failed to send countdown to tab:`, err.message);
            ensureOverlay(currentTabs[0].id);
          });
        }
      });
    }

    if (remaining <= 0) {
      rotate();
    } else {
      remaining--;
      rotationTimer = setTimeout(tick, 1000);
    }
  };
  tick();
}

chrome.tabs.onActivated.addListener(activeInfo => {
  if (state.globalConfig.overlayEnabled) {
    ensureOverlay(activeInfo.tabId);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === 'START') {
        state.status = 'running';
        updateIcon('green');
        await broadcastToAllTabs({ type: 'SHOW_OVERLAY' });
        await rotate();
      } else if (message.type === 'PAUSE') {
        state.status = 'paused';
        updateIcon('yellow');
        clearRotationTimer();
      } else if (message.type === 'STOP') {
        state.status = 'stopped';
        updateIcon('red');
        clearRotationTimer();
        await broadcastToAllTabs({ type: 'HIDE_OVERLAY' });
      } else if (message.type === 'NAV_NEXT') {
        await navigate('next');
      } else if (message.type === 'NAV_PREV') {
        await navigate('prev');
      } else if (message.type === 'UPDATE_CONFIG') {
        state.globalConfig = message.config;
        state.tabsConfig = message.tabsConfig;
        if (!message.config.overlayEnabled) {
          await broadcastToAllTabs({ type: 'HIDE_OVERLAY' });
        } else if (state.status === 'running') {
          await broadcastToAllTabs({ type: 'SHOW_OVERLAY' });
        }
      } else if (message.type === 'GET_STATE') {
        sendResponse(state);
        return; // Don't save state for read-only operation
      }
      await saveState();
      sendResponse({ success: true });
    } catch (error) {
      console.error('Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  return true; // Keep message channel open for async response
});
