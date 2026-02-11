// Show error message to user
function showError(message) {
  const errorEl = document.getElementById('errorMessage');
  errorEl.textContent = message;
  errorEl.classList.add('show');
  setTimeout(() => errorEl.classList.remove('show'), 5000);
}

// Update status banner
function updateStatusBanner(status) {
  const banner = document.getElementById('statusBanner');
  const statusText = document.getElementById('statusText');
  
  // Remove all status classes
  banner.classList.remove('idle', 'running', 'paused');
  
  // Add appropriate class and text
  if (status === 'running') {
    banner.classList.add('running');
    statusText.textContent = '✓ Rotation Active';
  } else if (status === 'paused') {
    banner.classList.add('paused');
    statusText.textContent = '⏸ Rotation Paused';
  } else {
    banner.classList.add('idle');
    statusText.textContent = '■ Rotation Stopped';
  }
}

// Validate interval input
function validateInterval(value) {
  const num = parseInt(value);
  if (isNaN(num)) return false;
  if (num < 1 || num > 3600) return false;
  return true;
}

async function init() {
  try {
    const state = await chrome.runtime.sendMessage({ type: 'GET_STATE' }).catch((err) => {
      showError('Failed to connect to service worker: ' + err.message);
      throw err;
    });
    
    const tabs = await chrome.tabs.query({ currentWindow: true });

    // Update status banner
    updateStatusBanner(state.status);

    // Set global config values with validation
    const intervalInput = document.getElementById('globalInterval');
    intervalInput.value = state.globalConfig.defaultInterval;
    intervalInput.addEventListener('input', (e) => {
      if (!validateInterval(e.target.value)) {
        e.target.style.borderColor = '#f44336';
      } else {
        e.target.style.borderColor = '#ddd';
      }
    });

    document.getElementById('fullscreenToggle').checked = state.globalConfig.fullscreenEnabled;
    document.getElementById('overlayToggle').checked = state.globalConfig.overlayEnabled;
    document.getElementById('autoStartToggle').checked = state.globalConfig.autoStart || false;

    const tabList = document.getElementById('tabList');
    
    // Get active tabs to determine which is current
    const activeTabs = tabs.filter(t => (state.tabsConfig[t.id]?.included !== false));
    const currentTabInRotation = activeTabs[state.currentIndex];
    
    tabs.forEach(tab => {
      const config = state.tabsConfig[tab.id] || { interval: '', refreshBefore: false, included: true };
      const div = document.createElement('div');
      div.className = 'tab-item';
      
      // Highlight current tab in rotation
      if (currentTabInRotation && tab.id === currentTabInRotation.id && state.status === 'running') {
        div.classList.add('current-tab');
      }
      
      div.innerHTML = `
        <div class="tab-info" title="${tab.title}">${tab.title}</div>
        <div style="display: flex; gap: 4px; align-items: center;">
          <input type="number" placeholder="Sec" style="width: 45px;" value="${config.interval || ''}" 
                 id="int-${tab.id}" min="1" max="3600">
          <input type="checkbox" ${config.refreshBefore ? 'checked' : ''} id="ref-${tab.id}" 
                 title="Refresh in background before show">
          <input type="checkbox" ${config.included !== false ? 'checked' : ''} id="inc-${tab.id}" 
                 title="Include">
        </div>
      `;
      tabList.appendChild(div);
    });

    const saveAll = async () => {
      try {
        const globalInterval = parseInt(document.getElementById('globalInterval').value);
        
        // Validate interval
        if (!validateInterval(globalInterval)) {
          showError('Interval must be between 1 and 3600 seconds');
          return;
        }

        const newTabs = {};
        let hasError = false;
        
        tabs.forEach(tab => {
          const intervalValue = document.getElementById(`int-${tab.id}`).value;
          const interval = intervalValue ? parseInt(intervalValue) : null;
          
          // Validate per-tab interval if provided
          if (interval !== null && !validateInterval(interval)) {
            showError(`Invalid interval for tab: ${tab.title}`);
            hasError = true;
            return;
          }
          
          newTabs[tab.id] = {
            interval: interval,
            refreshBefore: document.getElementById(`ref-${tab.id}`).checked,
            included: document.getElementById(`inc-${tab.id}`).checked
          };
        });
        
        // Don't save if there were validation errors
        if (hasError) {
          return;
        }

        const newGlobal = {
          defaultInterval: globalInterval,
          fullscreenEnabled: document.getElementById('fullscreenToggle').checked,
          overlayEnabled: document.getElementById('overlayToggle').checked,
          autoStart: document.getElementById('autoStartToggle').checked
        };
        
        await chrome.runtime.sendMessage({ type: 'UPDATE_CONFIG', config: newGlobal, tabsConfig: newTabs })
          .catch((err) => {
            showError('Failed to save configuration: ' + err.message);
            throw err;
          });
      } catch (error) {
        showError('Error saving configuration: ' + error.message);
      }
    };

    document.querySelectorAll('input').forEach(el => el.onchange = saveAll);

    document.getElementById('startBtn').onclick = async () => { 
      await saveAll(); 
      chrome.runtime.sendMessage({ type: 'START' })
        .then(() => {
          updateStatusBanner('running');
        })
        .catch((err) => {
          showError('Failed to start rotation: ' + err.message);
        });
    };
    
    document.getElementById('pauseBtn').onclick = () => {
      chrome.runtime.sendMessage({ type: 'PAUSE' })
        .then(() => {
          updateStatusBanner('paused');
        })
        .catch((err) => {
          showError('Failed to pause rotation: ' + err.message);
        });
    };
    
    document.getElementById('stopBtn').onclick = () => {
      chrome.runtime.sendMessage({ type: 'STOP' })
        .then(() => {
          updateStatusBanner('idle');
        })
        .catch((err) => {
          showError('Failed to stop rotation: ' + err.message);
        });
    };
  } catch (error) {
    showError('Failed to initialize: ' + error.message);
  }
}

init();