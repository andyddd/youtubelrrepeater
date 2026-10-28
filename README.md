# YouTube Subtitle Sentence Repeater
### YouTube 字幕句子复读机

[English](#english) | [中文说明](#中文说明)

---

<a name="english"></a>
## English

A lightweight Chrome extension designed for language learners to seamlessly repeat subtitle sentences on YouTube.

### ✨ Features

* **Instant Sentence Repetition**: Press `Z` anytime to immediately jump to the beginning of the current subtitle sentence and loop it continuously.
* **Pure & Self-Contained**: Operates directly on the HTML5 video element. Does not rely on any third-party extensions or simulated keyboard hacks.
* **Smart Subtitle Tracking**: Automatically captures sentence boundaries in real time from YouTube native captions, auto-generated captions (ASR), or dual-subtitle overlays.
* **Seamless & Stutter-Free**: Ensures the full sentence plays from start to finish before looping back to the beginning.
* **Minimalist Video Overlay**: A tiny, elegant icon embedded directly inside the video player (left-middle). Semi-transparent gray when idle, pure glowing white when active.
* **Quick Navigation**: Easily hop to the next or previous sentence while keeping repeat mode on.

### ⌨️ Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| **`Z`** | **Toggle Repeat (Enable / Disable)** | Instantly start or stop repeating the current sentence |
| **`Alt + R`** | Toggle Repeat (Alternative) | Backup combination shortcut |
| **`D`** or **`]`** | **Next Sentence** | Jump to the next subtitle sentence and continue looping |
| **`A`** or **`[`** | **Previous Sentence** | Jump back to the previous subtitle sentence and continue looping |
| **`S`** | **Re-seek to Start** | Jump back to the start of the currently looping sentence |

> *Note: Shortcuts are automatically disabled when typing in input boxes or comment sections.*

### 📦 Installation

1. Clone or download this repository to your local computer:
   ```bash
   git clone https://github.com/your-username/youtubelrrepeater.git
   ```
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions/
   ```
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** (加载已解压的扩展程序) in the top-left corner.
5. Select the project folder (`youtubelrrepeater`).
6. Open any YouTube video with captions enabled, press **`Z`**, and enjoy language learning!

---

<a name="中文说明"></a>
## 中文说明

一款专为外语学习者打造的轻量级 Chrome 扩展，可在 YouTube 上无缝、精准地持续重复播放当前字幕句子。

### ✨ 核心功能

* **一键单句复读**：观看视频时随时按键盘 **`Z`** 键，立即跳回当前字幕句子的开头并开启持续循环。
* **独立纯净无依赖**：直接基于原生 HTML5 视频控制，不依赖任何第三方插件或模拟按键，跳转极其稳定流畅。
* **实时字幕智能追踪**：毫秒级自动捕获 YouTube 原生字幕、ASR 逐词滚动字幕以及各类双语字幕的起止边界。
* **完整播放无卡顿**：内置进度底线防护，确保整句话完整播放到末尾后再跳回句首，杜绝频繁抽搐。
* **极简微型悬浮指示**：图标位于视频内部左侧垂直居中，无背景框；默认呈低调灰色半透明，开启时点亮为纯白色。
* **快捷翻句联动**：开启循环时，可随时一键切到上一句或下一句并继续自动循环。

### ⌨️ 快捷键说明

| 快捷键 | 功能 | 说明 |
| :--- | :--- | :--- |
| **`Z`** | **开关复读 (Enable / Disable)** | 最顺手的单键极速开关 |
| **`Alt + R`** | 开关复读 (备用) | 备用组合键 |
| **`D`** 或 **`]`** | **下一句** | 立即切换到下一句并持续循环 |
| **`A`** 或 **`[`** | **上一句** | 立即跳回上一句并持续循环 |
| **`S`** | **回到句首** | 立即回到当前句的起始时间点 |

> *注：在搜索框、评论区打字输入时会自动屏蔽快捷键，防止打字冲突。*

### 📦 安装方法

1. 下载或克隆本项目文件夹至本地电脑：
   ```bash
   git clone https://github.com/your-username/youtubelrrepeater.git
   ```
2. 打开 Chrome 浏览器，在地址栏输入并回车：
   ```text
   chrome://extensions/
   ```
3. 打开右上角的 **开发者模式** 开关。
4. 点击左上角的 **加载已解压的扩展程序** 按钮。
5. 在弹出的文件选择框中，选中本项目根文件夹（`youtubelrrepeater`）。
6. 安装完成！打开任意带字幕的 YouTube 视频页面，按 **`Z`** 键即可畅享单句跟读学习。

---

### 📁 项目结构 (Project Structure)

```text
youtubelrrepeater/
├── manifest.json       # 扩展配置文件 (Manifest V3)
├── content.js          # 核心逻辑：字幕捕获、边界监测与帧级循环控制
├── content.css         # 视频内部微型指示图标样式
├── popup.html          # 扩展点击弹窗界面
├── popup.js            # 弹窗控制逻辑与状态通信
├── popup.css           # 弹窗样式
├── background.js       # 扩展后台服务
├── icons/              # 扩展图标 (16x16, 48x48, 128x128)
└── README.md           # 项目中英文说明文档
```

---

### 📄 License

MIT License
