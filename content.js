// Small helper to ensure overlay is injected
chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.scripting.executeScript({
    target: { tabId: activeInfo.tabId },
    files: ['overlay.js']
  }).catch(() => {}); // Ignore errors on chrome:// pages
});