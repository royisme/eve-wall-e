# React Chrome Extension 开发知识库

本文档基于最佳实践分析，作为 Eva Copilot 开发的参考指南。
来源参考: [React-Chrome-Extension-Tutorial](https://18055975947.github.io/extension/teach/react-chrome.html)

## 1. 项目架构 (Project Architecture)

### 多入口构建 (Multi-Entry Build)
Chrome 扩展本质上是多个独立运行环境的集合。在 `vite.config.ts` 中必须通过 `rollupOptions.input` 明确定义：

```typescript
input: {
  popup: 'src/popup/index.html',         // 点击图标弹出的页面
  sidepanel: 'src/sidepanel/index.html', // 侧边栏 (Eva Copilot 主界面)
  content: 'src/content/content.ts',     // 注入页面的脚本 (DOM操作)
  background: 'src/background/service-worker.ts' // 后台服务 (API通信/状态)
}
```

### 输出文件控制 (Output Naming)
Manifest V3 引用文件是硬编码的 (如 `content_scripts: ["content.js"]`)，因此构建输出不能带 Hash。
需配置 `entryFileNames`：
```typescript
entryFileNames: (chunk) => {
  return ['content', 'service-worker'].includes(chunk.name) 
    ? '[name].js' 
    : 'assets/[name]-[hash].js';
}
```

## 2. 页面注入模式 (UI Injection)

如果需要在页面内部显示 UI (如悬浮球、划词菜单)，推荐 **React Iframe** 模式：

1.  **创建容器**: 在 `content.ts` 中创建一个 `iframe`。
2.  **指向资源**: `iframe.src = chrome.runtime.getURL('contentPage/index.html')`。
3.  **权限声明**: 必须在 `manifest.json` 的 `web_accessible_resources` 中暴露该 html 文件。
4.  **优势**: 实现完全的 CSS 隔离 (Shadow DOM 的替代方案)，且可使用完整的 React 开发体验。

## 3. 热更新与开发体验 (HMR)

### 监听构建 (Watch Build)
使用 `vite build --watch` 确保文件修改后自动重新打包。

### 自动刷新 (Auto Reload)
在开发模式下，Service Worker 可以轮询 `manifest.json` 或构建产物的 Hash。一旦变化：
1.  调用 `chrome.runtime.reload()` 重启扩展。
2.  调用 `chrome.tabs.reload()` 刷新当前页面。
*(注：我们使用的 CRXJS 插件通常已内置 WebSocket HMR，若失效可参考此手动方案)*

## 4. 状态管理 (State Management)

推荐使用 **Zustand**：
-   **轻量级**: 适合 Extension 这种资源敏感环境。
-   **无样板代码**: 比 Redux 简洁得多。
-   **持久化**: 配合 `persist` 中间件 + `chrome.storage.local` 可以轻松保存用户设置。

## 5. 通信机制 (Messaging)

### 长连接 (Long-lived)
SidePanel 与 Background 之间推荐使用 `chrome.runtime.connect` 建立长连接，特别是涉及 LLM 流式输出时。

### 单次请求 (One-off)
简单的数据获取使用 `chrome.runtime.sendMessage`。

---
**Eva Copilot 特别注意**:
- 我们主要依赖 **Side Panel**，因此 `src/App.tsx` 对应的是 Side Panel 入口。
- 如果需要抓取 DOM，逻辑必须写在 `src/content/content.ts` (或者通过 `executeScript` 动态注入)，不能直接在 Side Panel 访问 `window`。
