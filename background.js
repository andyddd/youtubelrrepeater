// YouTube Sentence Repeater - Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('[YT Sentence Repeater] Extension installed');
});

// Relay messages between popup and content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === 'content') {
    // Forward to the active YouTube tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, message, sendResponse);
      }
    });
    return true; // Keep channel open for async response
  }
});
