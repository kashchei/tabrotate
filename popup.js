async function init() {
  const state = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
  const tabs = await chrome.tabs.query({ currentWindow: true });

  document.getElementById('globalInterval').value = state.globalConfig.defaultInterval;
  document.getElementById('fullscreenToggle').checked = state.globalConfig.fullscreenEnabled;
  document.getElementById('overlayToggle').checked = state.globalConfig.overlayEnabled;
  document.getElementById('autoStartToggle').checked = state.globalConfig.autoStart || false;

  const tabList = document.getElementById('tabList');
  tabs.forEach(tab => {
    const config = state.tabsConfig[tab.id] || { interval: '', refreshBefore: false, included: true };
    const div = document.createElement('div');
    div.className = 'tab-item';
    div.innerHTML = `
      <div class="tab-info" title="${tab.title}">${tab.title}</div>
      <div style="display: flex; gap: 4px; align-items: center;">
        <input type="number" placeholder="Sec" style="width: 45px;" value="${config.interval || ''}" id="int-${tab.id}">
        <input type="checkbox" ${config.refreshBefore ? 'checked' : ''} id="ref-${tab.id}" title="Refresh in background before show">
        <input type="checkbox" ${config.included !== false ? 'checked' : ''} id="inc-${tab.id}" title="Include">
      </div>
    `;
    tabList.appendChild(div);
  });

  const saveAll = () => {
    const newGlobal = {
      defaultInterval: parseInt(document.getElementById('globalInterval').value) || 10,
      fullscreenEnabled: document.getElementById('fullscreenToggle').checked,
      overlayEnabled: document.getElementById('overlayToggle').checked,
      autoStart: document.getElementById('autoStartToggle').checked
    };
    const newTabs = {};
    tabs.forEach(tab => {
      newTabs[tab.id] = {
        interval: parseInt(document.getElementById(`int-${tab.id}`).value) || null,
        refreshBefore: document.getElementById(`ref-${tab.id}`).checked,
        included: document.getElementById(`inc-${tab.id}`).checked
      };
    });
    chrome.runtime.sendMessage({ type: 'UPDATE_CONFIG', config: newGlobal, tabsConfig: newTabs });
  };

  document.querySelectorAll('input').forEach(el => el.onchange = saveAll);

  document.getElementById('startBtn').onclick = () => { saveAll(); chrome.runtime.sendMessage({ type: 'START' }); };
  document.getElementById('pauseBtn').onclick = () => chrome.runtime.sendMessage({ type: 'PAUSE' });
  document.getElementById('stopBtn').onclick = () => chrome.runtime.sendMessage({ type: 'STOP' });
}

init();