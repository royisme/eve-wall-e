# TASK: Gmail Setup Guidance UI

## Overview

实现 Wall-E 前端的 Gmail 设置引导 UI。由于 Eve 后端的邮件授权（Google OAuth）目前通过 CLI 完成，Wall-E 需要检测配置状态并在未授权时引导用户通过终端完成设置，从而启用职位信息的自动抓取功能。

---

## Dependencies

**需要 Eve 后端提供的 API：**
- `GET /email/status` - 获取当前已授权的 Gmail 账号列表及同步状态。
  - `accounts`: `Array<{ email: string, authorized: boolean, lastSync?: string }>`
  - `status`: `"idle" | "syncing" | "error"`

**用户操作依赖：**
- 需要在终端运行 `eve email:setup <email>` 命令。

---

## User Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      用户访问 Settings 页面                         │
└──────────────────────────────┬───────────────────────────────────┘
                               ▼
                   ┌────────────────────────┐
                   │ 调用 GET /email/status  │
                   └───────────┬────────────┘
                               │
             ┌─────────────────┴─────────────────┐
             ▼                                   ▼
        已授权账号                           无授权账号
             │                                   │
             ▼                                   ▼
    ┌─────────────────┐               ┌───────────────────────┐
    │ 显示账号列表及    │               │  显示 Setup Required   │
    │ 上次同步时间      │               │  引导组件 (Guide)      │
    └────────┬────────┘               └───────────┬───────────┘
             │                                    │
             │                         ┌──────────┴──────────┐
             │                         ▼                     ▼
             │                  [复制命令]按钮        [检查状态]按钮
             │                         │                     │
             │                         ▼                     ▼
             └───────────────────> 进入已授权状态 <──────────┘
```

---

## Implementation Plan

### File Structure

```
extension/wall-e/src/
├── components/
│   ├── email/
│   │   ├── EmailSettings.tsx        # Settings 页面中的邮件设置区块
│   │   ├── EmailSetupGuide.tsx      # 引导用户运行 CLI 命令的组件
│   │   └── AccountList.tsx          # 已授权账号展示列表
│   └── ui/
│       └── CodeBlock.tsx            # 用于展示待执行命令的通用组件
```

---

## API Response Schema

**`GET /email/status`**

```typescript
interface EmailStatusResponse {
  accounts: Array<{
    email: string;
    authorized: boolean;
    lastSyncAt?: string; // ISO 8601
  }>;
  syncing: boolean;
  error?: string;
}
```

---

## Component Specifications

### 1. `EmailSettings.tsx`
集成在 `Settings.tsx` 中的新区块。

- **功能**：
  - 初始化时调用 `/email/status`。
  - 根据是否有 `accounts` 且 `authorized: true` 切换显示内容。
  - 提供“刷新状态”按钮。

### 2. `EmailSetupGuide.tsx`
当未检测到有效授权时显示的引导界面。

- **UI 设计**：
```
┌────────────────────────────────────┐
│       📧 Gmail Setup Required      │
│                                    │
│  To auto-sync job alerts, you need  │
│  to authorize your Gmail account.   │
│                                    │
│  Step 1: Open your terminal         │
│  Step 2: Run the following command: │
│  ┌──────────────────────────────┐  │
│  │ eve email:setup your@email.com│ [Copy]
│  └──────────────────────────────┘  │
│                                    │
│  Step 3: Follow the browser prompt  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │        Check Status          │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

### 3. `AccountList.tsx`
展示已连接账号。

- **UI 设计**：
```
┌────────────────────────────────────┐
│  Connected Accounts                │
│  ┌──────────────────────────────┐  │
│  │ user@gmail.com       [Synced] │  │
│  │ Last sync: 2 mins ago         │  │
│  └──────────────────────────────┘  │
│                                    │
│  [+] Add Another Account           │
└────────────────────────────────────┘
```

---

## i18n Keys

```json
{
  "settings": {
    "email": {
      "title": "邮件同步",
      "description": "通过 Gmail 自动抓取职位申请通知",
      "setupRequired": "需要配置 Gmail",
      "guide": {
        "step1": "1. 打开终端 (Terminal)",
        "step2": "2. 输入并运行以下命令：",
        "step3": "3. 在弹出的浏览器窗口中完成授权",
        "copyCommand": "复制命令",
        "checkStatus": "检查状态"
      },
      "accounts": {
        "title": "已连接账号",
        "lastSync": "上次同步：{{time}}",
        "noAccounts": "未连接任何账号",
        "addAccount": "添加账号"
      },
      "status": {
        "syncing": "正在同步邮件...",
        "error": "同步出错：{{message}}"
      }
    }
  }
}
```

---

## Acceptance Criteria

- [ ] 在 Settings 页面看到“邮件同步”区块。
- [ ] 若后端返回无授权账号，显示包含 `eve email:setup` 的引导信息。
- [ ] 点击“复制命令”按钮，可将命令复制到剪贴板。
- [ ] 点击“检查状态”按钮，触发 API 重新请求并更新 UI。
- [ ] 若后端返回已授权账号，显示账号列表及上次同步时间。
- [ ] 同步进行中显示 Loading/Syncing 状态。
- [ ] 兼容 `Settings.tsx` 现有的 Shadcn/ui 样式风格。

---

## Testing Scenarios

1. **全新安装/未配置**：
   - 进入 Settings -> 看到引导界面 -> 复制命令 -> 在终端运行成功 -> 返回 Wall-E 点击“检查状态” -> 变更为已授权账号列表。
2. **已有配置**：
   - 进入 Settings -> 直接看到已连接的 Gmail 账号。
3. **API 异常**：
   - 后端服务未启动或 API 报错 -> 显示错误提示及“重试”按钮。
4. **多账号支持**：
   - 验证账号列表是否能正确渲染多个已授权的 Email。
