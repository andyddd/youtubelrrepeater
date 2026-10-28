// YouTube Subtitle Sentence Repeater - Popup Script

const toggle = document.getElementById('repeat-toggle');
const statusSection = document.getElementById('status-section');
const statusIcon = document.getElementById('status-icon');
const statusText = document.getElementById('status-text');
const subPreview = document.getElementById('sub-preview');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');

// 获取当前标签页状态
function getStatus() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, (response) => {
      if (chrome.runtime.lastError) {
        showNotOnYouTube();
        return;
      }
      if (response) {
        updatePopup(response);
      }
    });
  });
}

// 切换循环开关
toggle.addEventListener('change', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle' }, (response) => {
      if (chrome.runtime.lastError) {
        showNotOnYouTube();
        toggle.checked = false;
        return;
      }
      if (response) {
        updatePopup(response);
      }
    });
  });
});

// 上一句 / 下一句按钮
btnPrev.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'prev' });
    }
  });
});

btnNext.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'next' });
    }
  });
});

function updatePopup(data) {
  const active = Boolean(data && data.active);
  toggle.checked = active;

  if (!active) {
    statusSection.classList.add('hidden');
    subPreview.textContent = '';
  } else {
    statusSection.classList.remove('hidden');
    statusIcon.textContent = '🔄';

    if (data.loopStart !== null && data.loopEnd !== null) {
      const dur = (data.loopEnd - data.loopStart).toFixed(1);
      statusText.textContent = `循环中 (时长 ${dur} 秒)`;
    } else {
      statusText.textContent = '正在循环播放';
    }

    if (data.targetText) {
      subPreview.textContent = `“${data.targetText}”`;
    } else {
      subPreview.textContent = '';
    }
  }
}

function showNotOnYouTube() {
  statusSection.classList.remove('hidden');
  statusIcon.textContent = '⚠️';
  statusText.textContent = '请在 YouTube 视频播放页面使用';
  subPreview.textContent = '';
  btnPrev.style.display = 'none';
  btnNext.style.display = 'none';
}

// 接收来自 content.js 的主动状态同步
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'statusUpdate') {
    updatePopup(msg);
  }
});

// 初始化
getStatus();
