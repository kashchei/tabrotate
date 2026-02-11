(function() {
  if (document.getElementById('kiosk-tab-overlay')) return;

  const style = document.createElement('style');
  style.id = 'kiosk-overlay-style';
  style.textContent = `
    #kiosk-tab-overlay {
      position: fixed;
      bottom: 60px;
      right: 20px;
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 12px 20px;
      border-radius: 40px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 15px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.2);
      pointer-events: auto;
      backdrop-filter: blur(8px);
      max-width: 450px;
    }
    #kiosk-tab-overlay b { 
      color: inherit; 
      font-size: inherit; 
      min-width: 1.5ch; 
      display: inline-block; 
      text-align: center; 
      font-weight: bold;
    }
    .kiosk-btn {
      background: #333;
      border: none;
      color: white;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, transform 0.1s;
    }
    .kiosk-btn:hover { background: #555; }
    .kiosk-btn:active { transform: scale(0.9); }
    .kiosk-nav-group { display: flex; gap: 8px; border-left: 1px solid #444; padding-left: 12px; }
    .kiosk-info-text { display: flex; flex-direction: column; line-height: 1.3; }
    #kiosk-next-label { font-size: 11px; opacity: 0.7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
  `;
  document.head.appendChild(style);

  const container = document.createElement('div');
  container.id = 'kiosk-tab-overlay';
  container.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <button id="kiosk-pause-toggle" class="kiosk-btn">⏸</button>
      <div class="kiosk-info-text">
        <span>Next in: <b id="kiosk-timer">--</b>s</span>
        <span id="kiosk-next-label">Loading...</span>
      </div>
    </div>
    <div class="kiosk-nav-group">
      <button id="kiosk-prev" class="kiosk-btn" title="Previous">⏮</button>
      <button id="kiosk-next" class="kiosk-btn" title="Next">⏭</button>
    </div>
  `;
  document.body.appendChild(container);

  // Track overlay state locally for reliable pause/play toggle
  // Will be synchronized with actual state when first COUNTDOWN message arrives
  let overlayState = 'running';

  // --- User Activity Detection for Idle Pause ---
  let idlePauseEnabled = false;
  let idleTimeout = null;
  let isIdlePaused = false;
  let lastActivityNotification = 0;
  const IDLE_DELAY = 5000; // 5 seconds of inactivity before resuming
  const ACTIVITY_THROTTLE = 500; // Minimum ms between activity notifications
  const activityEvents = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];

  function onUserActivity(e) {
    if (!idlePauseEnabled) return;
    // Ignore events originating from the overlay itself
    const overlay = document.getElementById('kiosk-tab-overlay');
    if (overlay && overlay.contains(e.target)) return;

    const now = Date.now();

    // Clear any pending idle-resume timeout
    if (idleTimeout !== null) {
      clearTimeout(idleTimeout);
      idleTimeout = null;
    }

    // Throttle: only send IDLE_PAUSE if enough time has passed since last notification
    if (!isIdlePaused && now - lastActivityNotification >= ACTIVITY_THROTTLE) {
      isIdlePaused = true;
      lastActivityNotification = now;
      chrome.runtime.sendMessage({ type: 'IDLE_PAUSE' }).catch(() => {});
    }

    // Set idle-resume timeout: after 5s of inactivity, resume rotation
    idleTimeout = setTimeout(() => {
      if (isIdlePaused) {
        isIdlePaused = false;
        chrome.runtime.sendMessage({ type: 'IDLE_RESUME' }).catch(() => {});
      }
      idleTimeout = null;
    }, IDLE_DELAY);
  }

  // Listen for user activity events on the document
  activityEvents.forEach(eventName => {
    document.addEventListener(eventName, onUserActivity, { passive: true, capture: true });
  });
  // --- End User Activity Detection ---
  
  // Initialize button state and idle pause setting from service worker
  chrome.runtime.sendMessage({ type: 'GET_STATE' }).then((state) => {
    if (state && state.status) {
      overlayState = state.status;
      const pauseBtn = document.getElementById('kiosk-pause-toggle');
      if (pauseBtn) {
        pauseBtn.innerText = state.status === 'running' ? '⏸' : '▶';
      }
    }
    if (state && state.globalConfig) {
      idlePauseEnabled = state.globalConfig.idlePauseEnabled || false;
      isIdlePaused = state.idlePaused || false;
    }
  }).catch((err) => {
    console.log('Failed to get initial state:', err.message);
  });

  // Message listener for countdown updates
  const messageListener = (msg) => {
    if (msg.type === 'COUNTDOWN') {
      const timer = document.getElementById('kiosk-timer');
      const nextLabel = document.getElementById('kiosk-next-label');
      const pauseBtn = document.getElementById('kiosk-pause-toggle');
      
      if (timer) timer.innerText = msg.remaining;
      if (nextLabel && msg.nextTitle) nextLabel.innerText = "Next: " + msg.nextTitle;
      
      // Update pause/play button to match current state from server
      if (pauseBtn && msg.status) {
        overlayState = msg.status; // Update local state
        pauseBtn.innerText = msg.status === 'running' ? '⏸' : '▶';
      }
    } else if (msg.type === 'IDLE_PAUSE_STATE') {
      isIdlePaused = msg.idlePaused;
      // Update overlay to show idle-paused indicator
      const timer = document.getElementById('kiosk-timer');
      const nextLabel = document.getElementById('kiosk-next-label');
      if (msg.idlePaused) {
        if (timer) timer.innerText = '⏸';
        if (nextLabel) nextLabel.innerText = 'Paused — user active';
      }
    } else if (msg.type === 'CONFIG_UPDATED') {
      idlePauseEnabled = msg.idlePauseEnabled || false;
      // If idle pause was disabled, reset idle state
      if (!idlePauseEnabled && isIdlePaused) {
        isIdlePaused = false;
        if (idleTimeout !== null) {
          clearTimeout(idleTimeout);
          idleTimeout = null;
        }
      }
    } else if (msg.type === 'HIDE_OVERLAY') {
      const overlay = document.getElementById('kiosk-tab-overlay');
      if (overlay) overlay.remove();
      chrome.runtime.onMessage.removeListener(messageListener);
      // Clean up activity listeners
      activityEvents.forEach(eventName => {
        document.removeEventListener(eventName, onUserActivity, { capture: true });
      });
      if (idleTimeout !== null) {
        clearTimeout(idleTimeout);
        idleTimeout = null;
      }
    }
  };

  chrome.runtime.onMessage.addListener(messageListener);

  // Pause/Play toggle with proper state synchronization
  const pauseToggle = document.getElementById('kiosk-pause-toggle');
  
  if (pauseToggle) {
    pauseToggle.onclick = () => {
      // Toggle based on local state
      const shouldStart = (overlayState === 'paused');
      
      chrome.runtime.sendMessage({ type: shouldStart ? 'START' : 'PAUSE' })
        .then(() => {
          overlayState = shouldStart ? 'running' : 'paused';
          pauseToggle.innerText = shouldStart ? '⏸' : '▶';
        })
        .catch((err) => {
          console.error('Failed to toggle rotation:', err);
        });
    };
  }

  const nextBtn = document.getElementById('kiosk-next');
  if (nextBtn) {
    nextBtn.onclick = () => {
      chrome.runtime.sendMessage({ type: 'NAV_NEXT' })
        .catch((err) => console.error('Failed to navigate next:', err));
    };
  }

  const prevBtn = document.getElementById('kiosk-prev');
  if (prevBtn) {
    prevBtn.onclick = () => {
      chrome.runtime.sendMessage({ type: 'NAV_PREV' })
        .catch((err) => console.error('Failed to navigate prev:', err));
    };
  }
})();