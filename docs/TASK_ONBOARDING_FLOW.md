# TASK: Onboarding Flow

## Overview

实现 Wall-E 的首次使用引导流程，包括欢迎界面、服务器配置、自动配对。

**相关任务**: Eve 后端 API 见 `docs/TASK_AUTH_PAIRING_API.md`

---

## Background

当前状态：
- 首次打开直接显示 Settings 页面（无欢迎词）
- 只配置端口，无 token 管理
- Token 需要手动获取和输入
- 无 token 失效处理

目标状态：
- 专门的 Onboarding 欢迎向导（4 步）
- 自动化配对流程（调用 Eve API）
- Token 自动存储和验证
- Token 失效时显示重连提示

---

## Dependencies

**需要 Eve 后端先实现以下 API：**
- `GET /auth/verify` - 验证 token 有效性
- `POST /auth/pair` - 请求配对获取 token

---

## User Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        Wall-E 启动                               │
└──────────────────────────────┬───────────────────────────────────┘
                               ▼
                   ┌───────────────────────┐
                   │ 检查 authToken 是否存在 │
                   └───────────┬───────────┘
                               │
             ┌─────────────────┴─────────────────┐
             ▼                                   ▼
       存在 Token                           无 Token
             │                                   │
             ▼                                   ▼
   ┌─────────────────┐               ┌───────────────────────┐
   │ 调用 /auth/verify │             │  显示 Onboarding 向导   │
   │ 验证 token 有效   │             │  (4 个步骤)             │
   └────────┬────────┘               └───────────┬───────────┘
            │                                    │
   ┌────────┴────────┐                           │
   ▼                 ▼                           │
 有效              无效 (401)                     │
   │                 │                           │
   ▼                 ▼                           │
进入主界面      显示 ReconnectPrompt ─────────────┘
              (清除旧 token，重新配对)
```

---

## Implementation Plan

### File Structure

```
extension/wall-e/src/
├── components/
│   ├── onboarding/
│   │   ├── index.ts               # 导出
│   │   ├── Onboarding.tsx         # 主向导容器
│   │   ├── WelcomeStep.tsx        # Step 1: 欢迎页面
│   │   ├── ConfigureStep.tsx      # Step 2: 服务器配置 + 连接测试
│   │   ├── PairingStep.tsx        # Step 3: 自动配对
│   │   └── CompletedStep.tsx      # Step 4: 完成
│   └── ReconnectPrompt.tsx        # Token 失效时的重连提示
├── hooks/
│   └── useAuth.ts                 # 认证状态管理 hook
└── lib/
    └── auth.ts                    # Token 管理函数
```

### Storage Schema

```typescript
// chrome.storage.local 存储结构
interface AuthStorage {
  authToken: string;      // 配对 token (64 char hex)
  serverHost: string;     // 服务器地址 (default: "localhost")
  serverPort: string;     // 服务器端口 (default: "3033")
  pairedAt: number;       // 配对时间戳 (Unix ms)
  eveVersion?: string;    // Eve 版本号
}
```

---

## Component Specifications

### 1. `lib/auth.ts` - Token 管理

```typescript
export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  serverUrl: string;
  pairedAt: number | null;
}

// 获取存储的认证信息
export async function getStoredAuth(): Promise<AuthState | null>;

// 保存认证信息
export async function saveAuth(data: {
  token: string;
  serverHost: string;
  serverPort: string;
  eveVersion?: string;
}): Promise<void>;

// 清除认证信息
export async function clearAuth(): Promise<void>;

// 验证 token 有效性（调用 Eve API）
export async function verifyToken(serverUrl: string, token: string): Promise<boolean>;

// 请求配对（调用 Eve API）
export async function requestPairing(serverUrl: string, oldToken?: string): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}>;
```

### 2. `hooks/useAuth.ts` - 认证状态 Hook

```typescript
type AuthStatus = 
  | "loading"       // 初始化检查中
  | "not_paired"    // 未配对，需要 Onboarding
  | "validating"    // 正在验证 token
  | "authenticated" // 已认证，可以使用
  | "invalid"       // Token 失效，需要重连

export function useAuth(): {
  status: AuthStatus;
  serverUrl: string | null;
  retry: () => void;          // 重试验证
  clearAndRestart: () => void; // 清除并重新开始配对
};
```

### 3. `Onboarding.tsx` - 向导容器

管理 4 个步骤的状态和导航。

```typescript
interface OnboardingProps {
  onComplete: () => void;  // 配对成功后回调
}

type Step = "welcome" | "configure" | "pairing" | "completed";
```

### 4. `WelcomeStep.tsx` - 欢迎页面

UI 设计：
```
┌────────────────────────────────────┐
│                                    │
│         🤖 Wall-E                  │
│                                    │
│    Your AI-Powered Job Hunting     │
│           Copilot                  │
│                                    │
│   Wall-E connects to Eve, your     │
│   local AI assistant, to help      │
│   you manage job applications.     │
│                                    │
│        ┌──────────────────┐        │
│        │   Get Started    │        │
│        └──────────────────┘        │
│                                    │
└────────────────────────────────────┘
```

### 5. `ConfigureStep.tsx` - 服务器配置

功能：
- 输入服务器地址（默认 localhost）
- 输入端口（默认 3033）
- "Test Connection" 按钮 → 调用 `GET /health`
- 连接成功后显示 Eve 版本，启用 "Continue" 按钮

UI 设计：
```
┌────────────────────────────────────┐
│       🔗 Connect to Eve            │
│                                    │
│  Make sure Eve is running on       │
│  your computer.                    │
│                                    │
│  Server Address                    │
│  ┌──────────────────────────────┐  │
│  │ localhost                    │  │
│  └──────────────────────────────┘  │
│                                    │
│  Port                              │
│  ┌──────────────────────────────┐  │
│  │ 3033                         │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌─────────────┐  ┌─────────────┐  │
│  │    Test     │  │  Continue   │  │
│  └─────────────┘  └─────────────┘  │
│                                    │
│  ✅ Connected to Eve v0.3.0       │
│                                    │
│  ───────────────────────────────   │
│  💡 Run `bun run serve` in Eve    │
│     directory to start server     │
│                                    │
└────────────────────────────────────┘
```

### 6. `PairingStep.tsx` - 自动配对

功能：
- 自动调用 `POST /auth/pair`
- 显示配对进度
- 成功后保存 token 到 chrome.storage
- 失败时显示错误和重试按钮

UI 设计：
```
┌────────────────────────────────────┐
│         🔐 Pairing...              │
│                                    │
│         ⏳ (spinner)               │
│                                    │
│   Requesting secure connection     │
│   from Eve server...               │
│                                    │
│   ───────────────────────────────  │
│                                    │
│   ✅ Connection verified           │
│   ✅ Token received                │
│   ⏳ Saving credentials...         │
│                                    │
└────────────────────────────────────┘
```

### 7. `CompletedStep.tsx` - 完成

UI 设计：
```
┌────────────────────────────────────┐
│                                    │
│         ✅ You're all set!         │
│                                    │
│   Wall-E is now connected to Eve   │
│   and ready to help you land       │
│   your dream job.                  │
│                                    │
│   ┌────────────────────────────┐   │
│   │ Server: localhost:3033     │   │
│   │ Eve Version: v0.3.0        │   │
│   │ Paired: Just now           │   │
│   └────────────────────────────┘   │
│                                    │
│        ┌──────────────────┐        │
│        │   Start Using    │        │
│        └──────────────────┘        │
│                                    │
└────────────────────────────────────┘
```

### 8. `ReconnectPrompt.tsx` - 重连提示

当 token 失效时显示：

```
┌────────────────────────────────────┐
│                                    │
│      ⚠️ Connection Lost            │
│                                    │
│   Your session with Eve has        │
│   expired or become invalid.       │
│                                    │
│   This can happen if:              │
│   • Eve server was restarted       │
│   • Another device paired with Eve │
│   • Token was manually revoked     │
│                                    │
│        ┌──────────────────┐        │
│        │   Reconnect      │        │
│        └──────────────────┘        │
│                                    │
└────────────────────────────────────┘
```

---

## App.tsx Integration

更新 `SidePanel` 组件的初始化逻辑：

```typescript
function SidePanel() {
  const { status, clearAndRestart } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("chat");

  // Loading state
  if (status === "loading") {
    return <LoadingScreen />;
  }

  // Not paired - show onboarding
  if (status === "not_paired") {
    return <Onboarding onComplete={() => window.location.reload()} />;
  }

  // Token invalid - show reconnect prompt
  if (status === "invalid") {
    return <ReconnectPrompt onReconnect={clearAndRestart} />;
  }

  // Authenticated - show main app
  return (
    <div className="h-dvh flex flex-col bg-background">
      <Header onSettingsClick={() => setShowSettings(true)} />
      {/* ... rest of the app */}
    </div>
  );
}
```

---

## API Error Handling

更新 `lib/api.ts` 的 `fetchWithAuth` 函数：

```typescript
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  // ...existing code...
  
  const response = await fetch(url, { ...options, headers: mergedHeaders });

  // Handle auth errors globally
  if (response.status === 401) {
    // Dispatch event for App.tsx to handle
    window.dispatchEvent(new CustomEvent("auth-error", { 
      detail: { status: 401, message: "Token invalid" } 
    }));
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Eve API error: ${response.status} - ${error}`);
  }

  return response;
}
```

---

## i18n Keys

需要添加的翻译 key：

```json
{
  "onboarding": {
    "welcome": {
      "title": "Wall-E",
      "subtitle": "Your AI-Powered Job Hunting Copilot",
      "description": "Wall-E connects to Eve, your local AI assistant, to help you manage job applications.",
      "getStarted": "Get Started"
    },
    "configure": {
      "title": "Connect to Eve",
      "subtitle": "Make sure Eve is running on your computer.",
      "serverAddress": "Server Address",
      "port": "Port",
      "testConnection": "Test",
      "continue": "Continue",
      "connected": "Connected to Eve",
      "hint": "Run `bun run serve` in Eve directory to start server"
    },
    "pairing": {
      "title": "Pairing...",
      "requesting": "Requesting secure connection from Eve server...",
      "connectionVerified": "Connection verified",
      "tokenReceived": "Token received",
      "savingCredentials": "Saving credentials..."
    },
    "completed": {
      "title": "You're all set!",
      "description": "Wall-E is now connected to Eve and ready to help you land your dream job.",
      "server": "Server",
      "version": "Eve Version",
      "paired": "Paired",
      "justNow": "Just now",
      "startUsing": "Start Using"
    }
  },
  "reconnect": {
    "title": "Connection Lost",
    "description": "Your session with Eve has expired or become invalid.",
    "reasons": {
      "intro": "This can happen if:",
      "serverRestarted": "Eve server was restarted",
      "anotherDevice": "Another device paired with Eve",
      "tokenRevoked": "Token was manually revoked"
    },
    "button": "Reconnect"
  }
}
```

---

## Acceptance Criteria

- [ ] 首次打开显示 Welcome 页面
- [ ] 可配置服务器地址和端口
- [ ] "Test Connection" 正确测试连接并显示 Eve 版本
- [ ] 连接成功后可进入 Pairing 步骤
- [ ] Pairing 自动调用 `/auth/pair` 获取 token
- [ ] Token 正确保存到 `chrome.storage.local`
- [ ] 完成页面显示配对信息
- [ ] 点击 "Start Using" 进入主界面
- [ ] 后续打开时验证 token，有效则直接进入主界面
- [ ] Token 失效时显示 ReconnectPrompt
- [ ] 点击 Reconnect 清除旧 token 并重新开始配对
- [ ] 所有文案支持 i18n

---

## Testing Scenarios

1. **首次安装**: 无 token → 显示 Onboarding → 配对成功 → 进入主界面
2. **正常启动**: 有效 token → 验证通过 → 直接进入主界面
3. **Token 失效**: 旧 token → 验证失败 → 显示 ReconnectPrompt → 重新配对
4. **Eve 未启动**: 连接测试失败 → 显示错误提示 → 无法继续
5. **配对冲突**: 其他设备已配对 → 显示错误 → 提示需要旧 token
