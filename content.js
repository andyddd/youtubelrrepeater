// YouTube Subtitle Sentence Repeater - Content Script
// 纯净独立版：精准重复当前字幕句子
(function () {
  'use strict';

  // ==========================================
  // 核心循环状态机
  // ==========================================
  const state = {
    active: false,        // 是否开启重复
    phase: 'idle',        // 'idle' | 'finding_end' (首次播放寻找终点) | 'looping' (已知起止点持续循环)
    loopStart: null,      // 句子起始时间 (秒)
    loopEnd: null,        // 句子结束时间 (秒)
    minEndTime: null,     // 句子结束的最小时间 (防止播放未完提前截断)
    targetText: '',       // 当前句子的字幕文本
    isSeeking: false,     // 是否正在执行 seek 操作
    rafId: null,          // requestAnimationFrame 引用
  };

  // ==========================================
  // 字幕实时追踪器 (后台静默记录每句话的出现时间)
  // ==========================================
  const tracker = {
    current: null,        // 当前屏幕字幕: { text, start, end }
    history: [],          // 历史字幕列表: Array<{ text, start, end }>
    maxHistory: 30,
    timerId: null,
  };

  // ==========================================
  // 基础 DOM 与视频元素工具
  // ==========================================
  function getVideo() {
    return document.querySelector('video');
  }

  function getPlayer() {
    return document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
  }

  // 确保 YouTube 原生字幕开启
  function ensureCaptionsEnabled() {
    const ccBtn = document.querySelector('.ytp-subtitles-button');
    if (ccBtn && ccBtn.getAttribute('aria-pressed') === 'false') {
      ccBtn.click();
      console.log('[Subtitle-Repeater] 已自动开启 YouTube 原生字幕');
    }
  }

  // ==========================================
  // 获取当前屏幕上显示的字幕文本
  // ==========================================
  function getVisibleSubtitle() {
    // 1. Language Reactor 学习语言主行
    const dcOrig = document.querySelectorAll('.dc-orig');
    if (dcOrig.length > 0) {
      const text = Array.from(dcOrig)
        .map((e) => e.textContent.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ');
      if (text) return text;
    }

    // 2. YouTube 原生字幕段落
    const ytSegments = document.querySelectorAll('.ytp-caption-segment');
    if (ytSegments.length > 0) {
      const text = Array.from(ytSegments)
        .map((s) => s.textContent.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ');
      if (text) return text;
    }

    // 3. 通用字幕容器 (Language Reactor / 其他双语扩展)
    const extraSelectors = [
      '.lr-player-subs-area',
      '.lr-player-subs',
      '.lr-sub-line',
      '.lln-subs',
      '.main-translation-wrap',
      '.caption-window',
    ];
    for (const sel of extraSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.textContent.trim().replace(/\s+/g, ' ');
        if (text) return text;
      }
    }

    return '';
  }

  // 模糊匹配是否仍为同一句话 (应对 YouTube 逐词追加显示的自动字幕)
  function isSameSentence(prev, next) {
    if (!prev || !next) return false;
    const p = prev.trim().toLowerCase().replace(/[.,!?;:'"“”‘’]/g, '');
    const n = next.trim().toLowerCase().replace(/[.,!?;:'"“”‘’]/g, '');
    if (p === n) return true;

    // 前后包含关系
    if (n.startsWith(p) || p.startsWith(n)) return true;

    // 词汇重合度超过 60%
    const pWords = p.split(/\s+/).filter(Boolean);
    const nWords = n.split(/\s+/).filter(Boolean);
    if (pWords.length > 0 && nWords.length > 0) {
      const common = pWords.filter((w) => nWords.includes(w)).length;
      if (common / Math.min(pWords.length, nWords.length) >= 0.6) {
        return true;
      }
    }

    return false;
  }

  // ==========================================
  // 持续追踪字幕起止时间 (在非循环播放时记录)
  // ==========================================
  function startSubtitleTracker() {
    if (tracker.timerId) clearInterval(tracker.timerId);

    tracker.timerId = setInterval(() => {
      const video = getVideo();
      if (!video || video.paused) return;

      // 如果当前正在已锁定的循环中播放，暂停记录历史，避免循环跳回污染历史队列
      if (state.active && state.phase === 'looping') return;

      const cur = video.currentTime;
      const text = getVisibleSubtitle();

      if (!tracker.current) {
        if (text) {
          tracker.current = { text, start: cur, end: null };
        }
      } else {
        if (!text) {
          // 字幕消失超过 0.3 秒，记录结束
          if (cur > tracker.current.start + 0.3) {
            tracker.current.end = cur;
            saveHistory(tracker.current);
            tracker.current = null;
          }
        } else if (isSameSentence(tracker.current.text, text)) {
          // 仍为同一句（逐词累加中），更新最新文本
          tracker.current.text = text;
        } else {
          // 变成了一句全新的话，说明上一句已彻底结束
          tracker.current.end = cur;
          saveHistory(tracker.current);
          tracker.current = { text, start: cur, end: null };
        }
      }
    }, 50);
  }

  function saveHistory(item) {
    if (!item || !item.text || item.start === null || item.end === null) return;
    if (item.end - item.start < 0.3) return;

    const last = tracker.history[tracker.history.length - 1];
    if (last && Math.abs(last.start - item.start) < 0.4) {
      last.end = item.end;
      last.text = item.text;
      return;
    }

    tracker.history.push({ ...item });
    if (tracker.history.length > tracker.maxHistory) {
      tracker.history.shift();
    }
  }

  // ==========================================
  // 执行播放跳转 (Seek)
  // ==========================================
  function seekVideo(video, targetTime) {
    state.isSeeking = true;
    video.currentTime = Math.max(0, targetTime);
    if (video.paused) {
      video.play().catch(() => {});
    }

    // 250ms 后解除 isSeeking 保护状态
    setTimeout(() => {
      state.isSeeking = false;
    }, 250);
  }

  // ==========================================
  // 开启 / 停止循环
  // ==========================================
  function startRepeating() {
    const video = getVideo();
    if (!video) return;

    ensureCaptionsEnabled();

    const curTime = video.currentTime;
    let start = null;
    let text = getVisibleSubtitle();

    // 1. 尝试从追踪器获取当前句的起点
    if (tracker.current && tracker.current.start !== null) {
      start = tracker.current.start;
      if (tracker.current.text) text = tracker.current.text;
    }
    // 2. 如果当前恰好在两句中间空隙，找刚刚结束的那一句
    else if (tracker.history.length > 0) {
      const last = tracker.history[tracker.history.length - 1];
      if (Math.abs(curTime - last.end) < 2.0) {
        start = last.start;
        text = last.text;
      }
    }

    // 3. 兜底策略：如果未能从追踪器获得，则取当前时间前 1.5 秒
    if (start === null) {
      start = Math.max(0, curTime - 1.5);
    }

    state.active = true;
    state.loopStart = Math.max(0, start);
    state.targetText = text || '';
    state.loopEnd = null;

    // 核心保证：
    // 用户在 curTime 点下开关，说明当前句子至少播放到了 curTime。
    // 因此句子终点绝对不可能小于 curTime！
    // 必须完整播放到用户点击时的时间点之后，才能允许判定句子结束！
    state.minEndTime = Math.max(curTime + 0.2, state.loopStart + 1.2);
    state.phase = 'finding_end';

    console.log(
      `[Subtitle-Repeater] 启动重复: 起点 ${state.loopStart.toFixed(2)}s, 当前点击位 ${curTime.toFixed(2)}s, 必须播放过 ${state.minEndTime.toFixed(2)}s, 文本: “${state.targetText.slice(0, 30)}”`
    );

    // 立即回到当前句子开始时间点
    seekVideo(video, state.loopStart);

    updateUI();
    startLoopEngine(video);
  }

  function stopRepeating() {
    state.active = false;
    state.phase = 'idle';
    state.loopStart = null;
    state.loopEnd = null;
    state.minEndTime = null;
    state.targetText = '';
    state.isSeeking = false;

    stopLoopEngine();
    updateUI();
    console.log('[Subtitle-Repeater] 已停止重复');
  }

  function toggleRepeating() {
    if (state.active) {
      stopRepeating();
    } else {
      startRepeating();
    }
  }

  // ==========================================
  // 高帧率循环监控引擎
  // ==========================================
  function startLoopEngine(video) {
    stopLoopEngine();

    function loopTick() {
      if (!state.active) return;

      const cur = video.currentTime;

      // 如果正在 seek 操作中，等待视频就位
      if (state.isSeeking) {
        state.rafId = requestAnimationFrame(loopTick);
        return;
      }

      // ----------------------------------------------------
      // 阶段 1: 正在播放首遍，寻找句子的真实结束时间
      // ----------------------------------------------------
      if (state.phase === 'finding_end') {
        // 关键防护：在视频播放到达 minEndTime 之前，绝不触发截断！
        // 保证整句话播放完毕！
        if (cur >= state.minEndTime) {
          const nowText = getVisibleSubtitle();

          // 判定当前句子是否已经播放完：
          // 1. 字幕变成了全新的一句话
          // 2. 或者字幕变为空白
          const isNewSentence = nowText && state.targetText && !isSameSentence(state.targetText, nowText);
          const isGone = !nowText;

          if (isNewSentence || isGone) {
            // 抓到了当前句子的真实结束时间！
            state.loopEnd = cur;
            state.phase = 'looping';
            console.log(
              `[Subtitle-Repeater] ✅ 句子完整播放完毕！区间: ${state.loopStart.toFixed(2)}s ~ ${state.loopEnd.toFixed(2)}s (时长 ${(state.loopEnd - state.loopStart).toFixed(1)}s)`
            );
            updateUI();

            // 播放完毕，回到当前句子开始时间点，开始无缝重复！
            seekVideo(video, state.loopStart);
          }
        }

        // 兜底安全限制：单句最长不超过 15 秒
        if (cur > state.loopStart + 15) {
          state.loopEnd = cur;
          state.phase = 'looping';
          updateUI();
          seekVideo(video, state.loopStart);
        }
      }

      // ----------------------------------------------------
      // 阶段 2: 起止点已确定，持续无缝循环播放当前句子
      // ----------------------------------------------------
      else if (state.phase === 'looping') {
        if (state.loopStart !== null && state.loopEnd !== null) {
          // 播放到句子终点瞬间 (提前 0.04 秒跳回，消除音频缝隙)
          if (cur >= state.loopEnd - 0.04) {
            seekVideo(video, state.loopStart);
          }
        }
      }

      state.rafId = requestAnimationFrame(loopTick);
    }

    state.rafId = requestAnimationFrame(loopTick);
  }

  function stopLoopEngine() {
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
  }

  // ==========================================
  // 下一句 / 上一句切换
  // ==========================================
  function playNextSentence() {
    const video = getVideo();
    if (!video) return;

    if (state.active && state.loopEnd !== null) {
      // 跳到当前句末尾稍后一点，寻找下一句
      seekVideo(video, state.loopEnd + 0.1);
      setTimeout(() => {
        if (!state.active) return;
        state.loopStart = video.currentTime;
        state.loopEnd = null;
        state.targetText = getVisibleSubtitle();
        state.minEndTime = state.loopStart + 1.5;
        state.phase = 'finding_end';
        updateUI();
      }, 300);
    }
  }

  function playPrevSentence() {
    const video = getVideo();
    if (!video) return;

    if (tracker.history.length >= 2) {
      const prev = tracker.history[tracker.history.length - 2];
      state.loopStart = prev.start;
      state.loopEnd = prev.end;
      state.targetText = prev.text;
      state.phase = 'looping';
      seekVideo(video, state.loopStart);
      updateUI();
    } else if (state.loopStart !== null) {
      seekVideo(video, state.loopStart);
    }
  }

  // ==========================================
  // 键盘快捷键监听
  // ==========================================
  document.addEventListener(
    'keydown',
    (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      // Z 键: 开关重复 (enable / disable)
      if (!e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        e.stopPropagation();
        toggleRepeating();
        return;
      }

      // Alt + R: 开关循环备用快捷键
      if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        e.stopPropagation();
        toggleRepeating();
        return;
      }

      // 当循环开启时:
      if (state.active && !e.altKey && !e.ctrlKey && !e.metaKey) {
        // D 或 ]: 下一句
        if (e.key === ']' || e.key === 'd' || e.key === 'D') {
          playNextSentence();
        }
        // A 或 [: 上一句
        else if (e.key === '[' || e.key === 'a' || e.key === 'A') {
          playPrevSentence();
        }
        // S: 回到句首
        else if (e.key === 's' || e.key === 'S') {
          if (state.loopStart !== null) {
            const v = getVideo();
            if (v) seekVideo(v, state.loopStart);
          }
        }
      }
    },
    true
  );

  // ==========================================
  // 浮动 UI (位于播放器内部左侧垂直居中)
  // ==========================================
  function createUI() {
    const player = getPlayer() || document.body;
    let container = document.getElementById('yr-repeater-container');

    if (!container) {
      container = document.createElement('div');
      container.id = 'yr-repeater-container';
      container.innerHTML = `
        <button id="yr-toggle-btn" title="重复当前字幕句子 (快捷键 Z 或 Alt+R)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.2"
               stroke-linecap="round" stroke-linejoin="round">
            <polyline points="17 1 21 5 17 9"></polyline>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
            <polyline points="7 23 3 19 7 15"></polyline>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
          </svg>
        </button>
      `;
      player.appendChild(container);

      const btn = document.getElementById('yr-toggle-btn');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleRepeating();
      });
    } else if (container.parentElement !== player && player !== document.body) {
      player.appendChild(container);
    }
  }

  function updateUI() {
    const btn = document.getElementById('yr-toggle-btn');
    if (btn) {
      btn.classList.toggle('yr-active', state.active);
    }

    // 同步给扩展弹出窗口
    try {
      chrome.runtime.sendMessage({
        action: 'statusUpdate',
        active: state.active,
        phase: state.phase,
        loopStart: state.loopStart,
        loopEnd: state.loopEnd,
        targetText: state.targetText,
      });
    } catch (_) {}
  }

  // ==========================================
  // 与 Popup 消息通信
  // ==========================================
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'toggle') {
      toggleRepeating();
      sendResponse({
        active: state.active,
        phase: state.phase,
        loopStart: state.loopStart,
        loopEnd: state.loopEnd,
        targetText: state.targetText,
      });
    } else if (msg.action === 'getStatus') {
      sendResponse({
        active: state.active,
        phase: state.phase,
        loopStart: state.loopStart,
        loopEnd: state.loopEnd,
        targetText: state.targetText,
      });
    } else if (msg.action === 'next') {
      playNextSentence();
      sendResponse({ ok: true });
    } else if (msg.action === 'prev') {
      playPrevSentence();
      sendResponse({ ok: true });
    }
    return true;
  });

  // ==========================================
  // 页面导航监听与初始化
  // ==========================================
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (state.active) stopRepeating();
      tracker.current = null;
      tracker.history = [];
      setTimeout(init, 1200);
    }
  }).observe(document.querySelector('title') || document.head, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  function init() {
    let retries = 0;
    const interval = setInterval(() => {
      retries++;
      const video = getVideo();
      if (video && (getPlayer() || document.body)) {
        clearInterval(interval);
        createUI();
        startSubtitleTracker();
        console.log('[Subtitle-Repeater] ✅ 句子复读扩展就绪');
      } else if (retries >= 30) {
        clearInterval(interval);
      }
    }, 800);
  }

  init();
})();
