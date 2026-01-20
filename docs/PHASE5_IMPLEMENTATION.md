# Phase 5: Offline Mode & Polish - Implementation Plan

> **Status**: Ready for Implementation
> **Target**: Wall-E Chrome Extension
> **Reference**: `docs/JOBS_DESIGN.md` Phase 5
> **Date**: 2026-01-19

---

## Executive Summary

Implement offline capabilities and polish the application for production release. This involves:
1. **Offline Mode**: Read-only job/resume cache with queued actions
2. **Performance Optimization**: Reduce bundle size, improve load times
3. **Error Handling**: Graceful degradation and user-friendly errors
4. **Production Readiness**: Analytics, error tracking, documentation

**Note**: Eve backend is fully implemented with Jobs, Resume, and Analytics APIs. PDF generation is handled in the frontend (Wall-E).

---

## Implementation Phases

### Phase 5.1: Offline Support (~2h)

#### 1. Service Worker Setup

**File**: `public/background.js` (Service Worker)

```typescript
// Service Worker for offline support
const CACHE_NAME = "wall-e-v1";
const STATIC_CACHE = "wall-e-static-v1";
const DATA_CACHE = "wall-e-data-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        "/manifest.json",
        "/icon-16.png",
        "/icon-48.png",
        "/icon-128.png",
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API requests: network first, fallback to cache
  if (url.pathname.startsWith("/api/") || url.port === "3033") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(DATA_CACHE).then((cache) => {
            cache.put(event.request, cloned);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets: cache first
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

#### 2. Offline Data Storage

**File**: `src/lib/offline.ts`

```typescript
import { openDB, DBSchema } from "idb";

interface WallEDB extends DBSchema {
  jobs: {
    key: number;
    value: {
      id: number;
      title: string;
      company: string;
      status: string;
      matchScore?: number;
      jdMarkdown?: string;
      analysis?: string;
      updatedAt: string;
    };
    indexes: { "by-status": string };
  };
  resumes: {
    key: number;
    value: {
      id: number;
      name: string;
      content: string;
      isDefault: boolean;
      updatedAt: string;
    };
  };
  tailoredResumes: {
    key: number;
    value: {
      id: number;
      jobId: number;
      resumeId: number;
      content: string;
      version: number;
    };
    indexes: { "by-job": number };
  };
  actionQueue: {
    key: number;
    value: {
      id: number;
      type: "updateJob" | "createJob" | "tailorResume";
      payload: unknown;
      timestamp: number;
      retryCount: number;
    };
  };
}

const DB_NAME = "wall-e-db";
const DB_VERSION = 1;

export async function initDB(): Promise<WallEDB> {
  return openDB<WallEDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Jobs store
      const jobsStore = db.createObjectStore("jobs", { keyPath: "id" });
      jobsStore.createIndex("by-status", "status");

      // Resumes store
      const resumesStore = db.createObjectStore("resumes", { keyPath: "id" });

      // Tailored resumes store
      const tailoredStore = db.createObjectStore("tailoredResumes", { keyPath: "id" });
      tailoredStore.createIndex("by-job", "jobId");

      // Action queue store
      db.createObjectStore("actionQueue", { keyPath: "id", autoIncrement: true });
    },
  });
}

export async function cacheJobs(jobs: WallEDB["jobs"]["value"][]) {
  const db = await initDB();
  const tx = db.transaction("jobs", "readwrite");
  await Promise.all([
    ...jobs.map((job) => tx.store.put(job)),
    tx.done,
  ]);
}

export async function getCachedJobs(): Promise<WallEDB["jobs"]["value"][]> {
  const db = await initDB();
  return db.getAll("jobs");
}

export async function queueAction(
  type: WallEDB["actionQueue"]["value"]["type"],
  payload: unknown
) {
  const db = await initDB();
  await db.add("actionQueue", {
    type,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
  });
}

export async function getActionQueue(): Promise<WallEDB["actionQueue"]["value"][]> {
  const db = await initDB();
  return db.getAll("actionQueue");
}

export async function clearAction(id: number) {
  const db = await initDB();
  await db.delete("actionQueue", id);
}
```

#### 3. Sync Service

**File**: `src/services/sync.ts`

```typescript
import { initDB, queueAction, clearAction, getActionQueue, cacheJobs } from "@/lib/offline";
import { eveApi } from "@/lib/api";

export async function syncWhenOnline() {
  if (!navigator.onLine) return { success: false, reason: "offline" };

  // Process queued actions
  const queue = await getActionQueue();
  for (const action of queue) {
    try {
      await processAction(action);
      await clearAction(action.id);
    } catch (e) {
      if (action.retryCount >= 3) {
        // Move to failed queue or notify user
        console.error("Action failed after 3 retries:", action);
        await clearAction(action.id);
      } else {
        // Increment retry count
        const db = await initDB();
        await db.put("actionQueue", {
          ...action,
          retryCount: action.retryCount + 1,
        });
      }
    }
  }

  // Fetch fresh data
  const { jobs } = await eveApi.getJobs({ limit: 100 });
  await cacheJobs(jobs);

  return { success: true, synced: queue.length };
}

async function processAction(action: { type: string; payload: unknown }) {
  switch (action.type) {
    case "updateJob":
      return eveApi.updateJob(action.payload.id, action.payload);
    case "createJob":
      return eveApi.createJob(action.payload);
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

export function goOnline() {
  syncWhenOnline().then((result) => {
    if (result.success) {
      console.log("Sync complete:", result);
      // Trigger UI refresh
      window.dispatchEvent(new CustomEvent("wall-e-sync"));
    }
  });
}

export function goOffline() {
  console.log("Offline mode activated");
}
```

#### 4. Offline Indicator Component

**File**: `src/components/OfflineIndicator.tsx`

```typescript
import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

export function OfflineIndicator() {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 bg-yellow-500/90 text-yellow-950 rounded-lg shadow-lg">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">{t("offline.mode")}</span>
    </div>
  );
}
```

---

### Phase 5.2: Performance Optimization (~1.5h)

#### 1. Code Splitting

**File**: `src/App.tsx`

```typescript
import { lazy, Suspense } from "react";
import { Chat, Briefcase, FileText, Settings } from "lucide-react";

const JobsTab = lazy(() => import("@/components/JobsTab"));
const ResumeTab = lazy(() => import("@/components/ResumeTab"));
const Workspace = lazy(() => import("@/workspace/Workspace"));
const SettingsPanel = lazy(() => import("@/components/SettingsPanel"));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

export function App() {
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <div className="h-screen flex flex-col">
      {/* Tab Navigation */}
      <nav className="flex border-b border-border/40 bg-background">
        <TabButton active={activeTab === "chat"} onClick={() => setActiveTab("chat")}>
          <Chat className="h-4 w-4" />
          <span className="hidden sm:inline">{t("tabs.chat")}</span>
        </TabButton>
        <TabButton active={activeTab === "jobs"} onClick={() => setActiveTab("jobs")}>
          <Briefcase className="h-4 w-4" />
          <span className="hidden sm:inline">{t("tabs.jobs")}</span>
        </TabButton>
        <TabButton active={activeTab === "resume"} onClick={() => setActiveTab("resume")}>
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">{t("tabs.resume")}</span>
        </TabButton>
      </nav>

      {/* Tab Content */}
      <main className="flex-1 overflow-hidden">
        <Suspense fallback={<LoadingSpinner />}>
          {activeTab === "chat" && <ChatInterface />}
          {activeTab === "jobs" && <JobsTab />}
          {activeTab === "resume" && <ResumeTab />}
        </Suspense>
      </main>
    </div>
  );
}
```

#### 2. Bundle Analysis Config

**File**: `vite.config.ts` (update)

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      filename: "bundle-analysis.html",
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          query: ["@tanstack/react-query"],
          ui: ["lucide-react", "clsx", "tailwind-merge"],
          editor: ["@milkdown/react", "@milkdown/preset-commonmark"],
        },
      },
    },
  },
});
```

#### 3. Lazy Load Heavy Components

```typescript
// Instead of direct imports
import { AnalyticsModal } from "@/components/AnalyticsModal";
import { PdfBuilder } from "@/components/PdfBuilder";
import { ResumeEditorModal } from "@/components/ResumeEditorModal";

// Use lazy loading
const AnalyticsModal = lazy(() => import("@/components/AnalyticsModal"));
const PdfBuilder = lazy(() => import("@/components/PdfBuilder"));
const ResumeEditorModal = lazy(() => import("@/components/ResumeEditorModal"));
```

---

### Phase 5.3: Error Handling & User Feedback (~1h)

#### 1. Error Boundary

**File**: `src/components/ErrorBoundary.tsx`

```typescript
import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Wall-E Error:", error, errorInfo);
    // TODO: Send to error tracking service
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <Button onClick={this.handleReload}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload Extension
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### 2. Toast Notifications

**File**: `src/components/Toast.tsx`

```typescript
import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (e: CustomEvent<Toast>) => {
      const toast = { ...e.detail, id: crypto.randomUUID() };
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => removeToast(toast.id), 5000);
    };
    window.addEventListener("wall-e-toast", handler as EventListener);
    return () => window.removeEventListener("wall-e-toast", handler as EventListener);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-2",
            toast.type === "success" && "bg-green-500 text-green-950",
            toast.type === "error" && "bg-red-500 text-red-950",
            toast.type === "info" && "bg-blue-500 text-blue-950"
          )}
        >
          {toast.type === "success" && <CheckCircle className="h-4 w-4" />}
          {toast.type === "error" && <AlertCircle className="h-4 w-4" />}
          {toast.type === "info" && <Info className="h-4 w-4" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="ml-2">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function showToast(type: ToastType, message: string) {
  window.dispatchEvent(new CustomEvent("wall-e-toast", { detail: { type, message } }));
}
```

#### 3. Loading States

```typescript
// Generic loading spinner component
export function LoadingSpinner({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    default: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-4",
  };

  return (
    <div className={cn("animate-spin rounded-full border-b-2 border-primary", sizeClasses[size])} />
  );
}

// Skeleton loader
export function JobCardSkeleton() {
  return (
    <div className="p-4 border border-border/40 rounded-xl animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-5 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-32" />
        </div>
        <div className="h-6 bg-muted rounded w-16" />
      </div>
    </div>
  );
}
```

---

### Phase 5.4: Analytics & Telemetry (~1h)

#### 1. Usage Analytics

**File**: `src/lib/analytics.ts`

```typescript
interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

export function trackEvent(event: AnalyticsEvent) {
  // TODO: Implement analytics tracking
  // Options: PostHog, Plausible, Google Analytics (if allowed)
  console.log("[Analytics]", event);

  // Example: Send to self-hosted analytics
  if (navigator.onLine) {
    fetch("/api/analytics/event", {
      method: "POST",
      body: JSON.stringify({
        ...event,
        timestamp: Date.now(),
        url: window.location.href,
      }),
    }).catch(() => {});
  }
}

// Common events
export const events = {
  viewJob: (jobId: number) =>
    trackEvent({ category: "Jobs", action: "view", label: String(jobId) }),
  tailorResume: (jobId: number) =>
    trackEvent({ category: "Resume", action: "tailor", label: String(jobId) }),
  generatePdf: () =>
    trackEvent({ category: "PDF", action: "generate" }),
  syncJobs: (count: number) =>
    trackEvent({ category: "Sync", action: "jobs", value: count }),
  error: (error: string) =>
    trackEvent({ category: "Error", action: error }),
};
```

#### 2. Performance Metrics

```typescript
export function reportPerformance() {
  const paint = performance.getEntriesByType("paint");
  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;

  const metrics = {
    fcp: paint.find((p) => p.name === "first-contentful-paint")?.duration,
    lcp: paint.find((p) => p.name === "first-largest-contentful-paint")?.duration,
    ttfb: navigation?.responseStart,
    domContentLoaded: navigation?.domContentLoadedEventEnd,
    fullLoad: navigation?.loadEventEnd,
  };

  trackEvent({
    category: "Performance",
    action: "metrics",
    label: JSON.stringify(metrics),
  });
}
```

---

### Phase 5.5: Settings & Preferences (~1h)

#### Settings Component

**File**: `src/components/SettingsPanel.tsx`

```typescript
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Settings, Server, Bell, Database, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SettingsPanel() {
  const { t } = useTranslation();
  const [serverPort, setServerPort] = useState("3033");

  const saveSettings = async () => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ serverPort }, resolve);
      });
      showToast("success", t("settings.saved"));
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            {t("settings.server")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t("settings.port")}</label>
            <Input
              value={serverPort}
              onChange={(e) => setServerPort(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button onClick={saveSettings}>{t("settings.save")}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t("settings.data")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            onClick={() => {
              localStorage.clear();
              showToast("success", t("settings.cleared"));
            }}
          >
            {t("settings.clearCache")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Critical Files to Modify

| File | Changes |
|------|----------|
| `public/background.js` | Service worker for offline support |
| `src/lib/offline.ts` | IndexedDB wrapper for offline storage |
| `src/services/sync.ts` | Sync queue and online/offline handling |
| `src/components/OfflineIndicator.tsx` | Offline status UI |
| `src/App.tsx` | Code splitting with lazy loading |
| `vite.config.ts` | Bundle analysis and optimization |
| `src/components/ErrorBoundary.tsx` | Error boundary component |
| `src/components/Toast.tsx` | Toast notification system |
| `src/lib/analytics.ts` | Analytics tracking |
| `src/components/SettingsPanel.tsx` | Settings page |

## New Components to Create

| File | Purpose |
|------|---------|
| `public/background.js` | Service worker |
| `src/lib/offline.ts` | Offline storage API |
| `src/services/sync.ts` | Sync service |
| `src/components/OfflineIndicator.tsx` | Offline status indicator |
| `src/components/Toast.tsx` | Toast notifications |
| `src/components/SettingsPanel.tsx` | Settings page |

---

## Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| `idb` | IndexedDB wrapper | New (lightweight, ~1KB) |
| `react-error-boundary` | Error boundary alternative | Optional |

---

## Testing & Verification

1. **Offline Mode**
   - Enable airplane mode
   - Verify jobs and resumes are viewable
   - Verify actions are queued
   - Restore connection and verify sync

2. **Performance**
   - Run bundle analysis
   - Verify lazy loading works
   - Check load times

3. **Error Handling**
   - Test API failures
   - Verify error boundaries catch errors
   - Check toast notifications appear

4. **Settings**
   - Save and load settings
   - Verify server port connection

---

## Estimated Effort

| Phase | Task | Effort |
|-------|------|--------|
| 5.1 | Offline Support | ~2h |
| 5.2 | Performance Optimization | ~1.5h |
| 5.3 | Error Handling | ~1h |
| 5.4 | Analytics & Telemetry | ~1h |
| 5.5 | Settings & Preferences | ~1h |
| **Total** | | **~6.5h** |

---

## Post-Launch Tasks

- [ ] Monitor error tracking for production issues
- [ ] Review analytics data for UX improvements
- [ ] Iterate on PDF generation based on user feedback
- [ ] Plan Phase 6 features based on usage patterns
