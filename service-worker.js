let rotationTimer = null;
let refreshRegistry = {}; 

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

async function broadcastToAllTabs(message) {
  const tabs = await chrome.tabs.query({});
  tabs.forEach(tab => {
    chrome.tabs.sendMessage(tab.id, message).catch(() => {});
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
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const activeTabs = tabs.filter(t => (state.tabsConfig[t.id]?.included !== false));

    if (activeTabs.length === 0) return;

    if (direction === 'next') {
      state.currentIndex = (state.currentIndex + 1) % activeTabs.length;
    } else if (direction === 'prev') {
      state.currentIndex = (state.currentIndex - 1 + activeTabs.length) % activeTabs.length;
    }

    const currentTab = activeTabs[state.currentIndex];
    const tabExists = await chrome.tabs.get(currentTab.id).catch(() => null);
    if (!tabExists) {
      state.currentIndex = 0; 
      return rotate();
    }

    await chrome.tabs.update(currentTab.id, { active: true });
    
    setTimeout(async () => {
      const updatedTab = await chrome.tabs.get(currentTab.id).catch(() => null);
      if (updatedTab && (updatedTab.title.includes("not found") || updatedTab.title.includes("Error") || updatedTab.title.includes("timed out"))) {
        rotate();
      }
    }, 2000);

    if (state.globalConfig.overlayEnabled) {
      setTimeout(() => ensureOverlay(currentTab.id), 100);
    }

    const nextIndex = (state.currentIndex + 1) % activeTabs.length;
    const nextTab = activeTabs[nextIndex];
    const now = Date.now();
    const lastRefresh = refreshRegistry[nextTab.id] || 0;

    if (state.tabsConfig[nextTab.id]?.refreshBefore && (now - lastRefresh > 30000)) {
      chrome.tabs.reload(nextTab.id).catch(() => {});
      refreshRegistry[nextTab.id] = now;
    }

    if (state.globalConfig.fullscreenEnabled) {
      chrome.windows.getCurrent(win => {
        if (win.state !== 'fullscreen') chrome.windows.update(win.id, { state: 'fullscreen' });
      });
    }

    if (state.status === 'running') {
      startTimer(state.tabsConfig[currentTab.id]?.interval || state.globalConfig.defaultInterval);
    }
    saveState();
  } catch (e) {
    console.error("Navigation error:", e);
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
  clearTimeout(rotationTimer);
  let remaining = seconds;
  
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const activeTabs = tabs.filter(t => (state.tabsConfig[t.id]?.included !== false));
  const nextIdx = (state.currentIndex + 1) % activeTabs.length;
  const nextTitle = activeTabs[nextIdx]?.title || "Next Tab";

  const tick = () => {
    if (state.status !== 'running') return;
    
    if (state.globalConfig.overlayEnabled) {
      chrome.tabs.query({ active: true, currentWindow: true }, (currentTabs) => {
        if (currentTabs[0]) {
          chrome.tabs.sendMessage(currentTabs[0].id, { 
            type: 'COUNTDOWN', 
            remaining,
            nextTitle: nextTitle 
          }).catch(() => {
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
  if (message.type === 'START') {
    state.status = 'running';
    updateIcon('green');
    broadcastToAllTabs({ type: 'SHOW_OVERLAY' });
    rotate();
  } else if (message.type === 'PAUSE') {
    state.status = 'paused';
    updateIcon('yellow');
    clearTimeout(rotationTimer);
  } else if (message.type === 'STOP') {
    state.status = 'stopped';
    updateIcon('red');
    clearTimeout(rotationTimer);
    broadcastToAllTabs({ type: 'HIDE_OVERLAY' });
  } else if (message.type === 'NAV_NEXT') {
    navigate('next');
  } else if (message.type === 'NAV_PREV') {
    navigate('prev');
  } else if (message.type === 'UPDATE_CONFIG') {
    state.globalConfig = message.config;
    state.tabsConfig = message.tabsConfig;
    if (!message.config.overlayEnabled) {
      broadcastToAllTabs({ type: 'HIDE_OVERLAY' });
    } else if (message.config.overlayEnabled && state.status === 'running') {
      broadcastToAllTabs({ type: 'SHOW_OVERLAY' });
    }
  } else if (message.type === 'GET_STATE') {
    sendResponse(state);
  }
  saveState();
  return true;
});