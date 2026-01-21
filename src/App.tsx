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
import { Toaster } from "@/components/ui/toaster";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { JobContextStrip } from "@/components/JobContextStrip";
import { setToastCallback } from "@/lib/toast";
import { handleApiError } from "@/lib/errors";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { syncService } from "@/lib/sync/syncService";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { useAuth } from "@/hooks/useAuth";
import { useJobDetection } from "@/hooks/useJobDetection";
import { Button } from "@/components/ui/button";

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
  const { detectedJob, isSaving, saveCurrentPage, dismissJob } = useJobDetection();
  const [activeTab, setActiveTab] = useState<TabId>("chat");
  const [showSettings, setShowSettings] = useState(false);

  const handleConfigSaved = () => {
    setShowSettings(false);
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
  };

  useEffect(() => {
    setToastCallback((type: "success" | "error" | "info", message: string) => {
      window.dispatchEvent(new CustomEvent("wall-e-toast", { detail: { type, message, id: Date.now().toString(), timestamp: Date.now() } }));
    });
  }, []);

  useEffect(() => {
    if (status === "online") {
      console.log("[App] Connection online, triggering sync");
      syncService.processQueue(true);
    }
  }, [status]);

  if (authStatus === "loading" || authStatus === "validating") {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 animate-pulse">
           <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20 text-primary">
             <Loader2 className="h-5 w-5 animate-spin" />
           </div>
           <span className="text-sm font-medium text-muted-foreground tracking-wide">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  if (authStatus === "not_configured") {
    return <Onboarding onComplete={() => window.location.reload()} />;
  }

  if (authStatus === "offline") {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md px-6 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
            <span className="text-3xl">🔌</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Eve is Offline</h1>
          <p className="text-sm text-muted-foreground">
            Cannot connect to Eve server. Make sure Eve is running.
          </p>
          <div className="flex gap-2">
            <Button onClick={retry} size="sm">
              Retry Connection
            </Button>
            <Button onClick={clearAndRestart} variant="outline" size="sm">
              Change Server
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
      <JobContextStrip
        job={detectedJob}
        onAnalyze={() => {
          saveCurrentPage().then(() => setActiveTab("jobs"));
        }}
        onSave={saveCurrentPage}
        onDismiss={dismissJob}
        isAnalyzing={isSaving}
      />
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

function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary
      onReset={() => {
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
