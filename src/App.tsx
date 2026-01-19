import { useState, useEffect } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Settings } from "@/components/Settings";
import { Header } from "@/components/Header";
import { TabNavigation, type TabId } from "@/components/TabNavigation";
import { Chat } from "@/components/Chat";
import { JobsList } from "@/components/JobsList";
import { Workspace } from "@/workspace/Workspace";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function SidePanel() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>("chat");
  const [showSettings, setShowSettings] = useState(false);
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["serverPort"], (result: { serverPort?: string }) => {
        if (result.serverPort) {
          setHasConfig(true);
        } else {
          setHasConfig(false);
          setShowSettings(true);
        }
      });
    } else {
      setHasConfig(true);
    }
  }, []);

  const handleConfigSaved = () => {
    setHasConfig(true);
    setShowSettings(false);
  };

  const handleTabChange = (tab: TabId) => {
    if (tab === "resume") {
      window.open(window.location.href.split("#")[0] + "#/workspace", "_blank");
      return;
    }
    setActiveTab(tab);
  };

  if (hasConfig === null) {
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

  if (showSettings) {
    return <Settings onSave={handleConfigSaved} />;
  }

  return (
    <div className="h-dvh flex flex-col bg-background selection:bg-primary/20">
      <Header onSettingsClick={() => setShowSettings(true)} />
      <main className="flex-1 overflow-hidden relative z-0">
        {activeTab === "chat" && <Chat />}
        {activeTab === "jobs" && <JobsList />}
      </main>
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<SidePanel />} />
          <Route path="/workspace" element={<Workspace />} />
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  );
}

export default App;
