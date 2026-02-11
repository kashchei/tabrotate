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

  // Message listener for countdown updates
  const messageListener = (msg) => {
    if (msg.type === 'COUNTDOWN') {
      const timer = document.getElementById('kiosk-timer');
      const nextLabel = document.getElementById('kiosk-next-label');
      const pauseBtn = document.getElementById('kiosk-pause-toggle');
      
      if (timer) timer.innerText = msg.remaining;
      if (nextLabel && msg.nextTitle) nextLabel.innerText = "Next: " + msg.nextTitle;
      
      // Update pause/play button to match current state
      if (pauseBtn && msg.status) {
        pauseBtn.innerText = msg.status === 'running' ? '⏸' : '▶';
      }
    } else if (msg.type === 'HIDE_OVERLAY') {
      const overlay = document.getElementById('kiosk-tab-overlay');
      if (overlay) overlay.remove();
      chrome.runtime.onMessage.removeListener(messageListener);
    }
  };

  chrome.runtime.onMessage.addListener(messageListener);

  // Pause/Play toggle with proper state synchronization
  const pauseToggle = document.getElementById('kiosk-pause-toggle');
  if (pauseToggle) {
    pauseToggle.onclick = () => {
      // Get current button state to determine action
      const currentButton = pauseToggle.innerText;
      const shouldStart = (currentButton === '▶');
      
      chrome.runtime.sendMessage({ type: shouldStart ? 'START' : 'PAUSE' })
        .then(() => {
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