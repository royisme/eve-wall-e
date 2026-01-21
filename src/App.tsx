import { useState, useEffect } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Settings } from "@/components/Settings";
import { Header } from "@/components/Header";
import { TabNavigation, type TabId } from "@/components/TabNavigation";
import { Chat } from "@/components/Chat";
import { JobsList } from "@/components/JobsList";
import { ResumeLibrary } from "@/components/ResumeLibrary";
import { Workspace } from "@/workspace/Workspace";
import { Onboarding } from "@/components/onboarding";
import { ReconnectPrompt } from "@/components/ReconnectPrompt";
import { Toaster } from "@/components/ui/toaster";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { setToastCallback } from "@/lib/toast";
import { handleApiError } from "@/lib/errors";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { syncService } from "@/lib/sync/syncService";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

// Configure QueryClient with error handling and retry logic
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 30000,
    },
    mutations: {
      retry: 1,
      onError: (error) => handleApiError(error),
    },
  },
});

function SidePanel() {
  const { t } = useTranslation();
  const { status } = useConnectionStatus();
  const { status: authStatus, clearAndRestart, retry } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("chat");
  const [showSettings, setShowSettings] = useState(false);

  const handleConfigSaved = () => {
    setShowSettings(false);
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
  };

  // Setup toast callback for sync service
  useEffect(() => {
    setToastCallback((type: "success" | "error" | "info", message: string) => {
      window.dispatchEvent(new CustomEvent("wall-e-toast", { detail: { type, message, id: Date.now().toString(), timestamp: Date.now() } }));
    });
  }, []);

  // Trigger sync when coming online
  useEffect(() => {
    if (status === "online") {
      console.log("[App] Connection online, triggering sync");
      syncService.processQueue(true);
    }
  }, [status]);

  // Loading state - checking auth or validating (block rendering during validation)
  if (authStatus === "loading" || authStatus === "validating") {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 animate-pulse">
           <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
             <Loader2 className="h-5 w-5 text-primary animate-spin" />
           </div>
           <span className="text-sm font-medium text-muted-foreground tracking-wide">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  // Not paired - show onboarding wizard
  if (authStatus === "not_paired") {
    return <Onboarding onComplete={() => window.location.reload()} />;
  }

  // Token invalid - show reconnect prompt
  if (authStatus === "invalid") {
    return <ReconnectPrompt onReconnect={clearAndRestart} />;
  }

  // Error state - show error screen with retry button
  if (authStatus === "error") {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md px-6">
          <span className="text-sm text-muted-foreground">
            Something went wrong
          </span>
          <Button onClick={retry} size="sm">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (showSettings) {
    return <Settings onSave={handleConfigSaved} />;
  }

  return (
    <div className="h-dvh flex flex-col bg-background selection:bg-primary/20">
      <Header onSettingsClick={() => setShowSettings(true)} />
      <main className="flex-1 overflow-hidden relative z-0">
        {activeTab === "chat" && <Chat />}
        {activeTab === "jobs" && <JobsList />}
        {activeTab === "resume" && <ResumeLibrary />}
      </main>
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      <Toaster />
      <OfflineBanner />
    </div>
  );
}

// Wrapper component that connects ErrorBoundary with React Query reset
function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary
      onReset={() => {
        // Clear query cache on error recovery
        queryClient.clear();
        reset();
      }}
      onError={(error, errorInfo) => {
        console.error("[App Error]", error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// Workspace with its own error boundary
function WorkspaceWithErrorBoundary() {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary
      onReset={() => {
        reset();
      }}
    >
      <Workspace />
    </ErrorBoundary>
  );
}

export function App() {
  // Start sync service on App mount (global lifecycle)
  useEffect(() => {
    console.log("[App] Starting SyncService");
    syncService.startAutoSync();
    return () => {
      console.log("[App] Stopping SyncService");
      syncService.stopAutoSync();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        <HashRouter>
          <Routes>
            <Route path="/" element={<SidePanel />} />
            <Route path="/workspace" element={<WorkspaceWithErrorBoundary />} />
          </Routes>
        </HashRouter>
        <Toaster />
      </AppErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
