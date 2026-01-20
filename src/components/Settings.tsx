import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsSection, SettingsDivider } from "@/components/SettingsSection";
import { useTranslation } from "react-i18next";
import {
  Settings as SettingsIcon,
  Server,
  Globe,
  CheckCircle,
  XCircle,
  Loader2,
  Database,
  Trash2,
  RefreshCw,
  Info,
  ExternalLink,
  Wifi
} from "lucide-react";
import { eveApi } from "@/lib/api";
import { clearAll, getAllActions } from "@/lib/db";
import { toast } from "@/lib/toast";

interface SettingsProps {
  onSave: () => void;
}

export function Settings({ onSave }: SettingsProps) {
  const { t, i18n } = useTranslation();
  const [port, setPort] = useState("3033");
  const [language, setLanguage] = useState(i18n.language);
  const [isSaving, setIsSaving] = useState(false);

  // Connection test state
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [eveVersion, setEveVersion] = useState<string>("");
  const [connectionError, setConnectionError] = useState<string>("");

  // Data management state
  const [pendingActions, setPendingActions] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load settings on mount
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["serverPort", "language"], (result: { serverPort?: string; language?: string }) => {
        if (result.serverPort) {
          setPort(result.serverPort);
        }
        if (result.language) {
          setLanguage(result.language);
          i18n.changeLanguage(result.language);
        }
      });
    }

    // Get pending actions count
    getAllActions().then((actions) => {
      setPendingActions(actions.filter((a) => a.status === "pending").length);
    }).catch(() => {});
  }, [i18n]);

  // Apply language change immediately
  useEffect(() => {
    i18n.changeLanguage(language);
    // Save language preference immediately
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.set({ language });
    }
  }, [language, i18n]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (typeof chrome !== "undefined" && chrome.storage) {
        await new Promise<void>((resolve) => {
          chrome.storage.local.set({ serverPort: port, language }, () => resolve());
        });
      }
      toast("success", t("settings.saved"));
      onSave();
    } catch (error) {
      toast("error", "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setConnectionStatus("testing");
    setConnectionError("");
    setEveVersion("");

    try {
      const health = await eveApi.getHealth();
      setConnectionStatus("success");
      setEveVersion(health.version);
    } catch (error) {
      setConnectionStatus("error");
      setConnectionError(error instanceof Error ? error.message : "Connection failed");
    }
  };

  const handleClearCache = async () => {
    if (!confirm(t("settings.confirmClearCache"))) return;

    setIsClearing(true);
    try {
      await clearAll();
      toast("success", t("settings.cacheCleared"));
      setPendingActions(0);
    } catch (error) {
      toast("error", "Failed to clear cache");
    } finally {
      setIsClearing(false);
    }
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await eveApi.syncJobs();
      toast("success", t("settings.syncComplete"));
    } catch (error) {
      toast("error", "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-4 w-full h-full overflow-y-auto bg-muted/10">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="text-center py-4">
          <div className="mx-auto h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-3 text-primary ring-1 ring-primary/20">
            <SettingsIcon className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">{t("settings.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("settings.description")}</p>
        </div>

        {/* Connection Section */}
        <Card className="border-border/40">
          <CardContent className="pt-6">
            <SettingsSection
              icon={<Server className="h-4 w-4" />}
              title={t("settings.connection")}
              description={t("settings.connectionDesc")}
            >
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="3033"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="flex-1 bg-muted/30 border-border/50 font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={connectionStatus === "testing"}
                    className="shrink-0"
                  >
                    {connectionStatus === "testing" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wifi className="h-4 w-4" />
                    )}
                    <span className="ml-2">{t("settings.testConnection")}</span>
                  </Button>
                </div>

                {connectionStatus === "success" && (
                  <div className="flex items-center gap-2 text-green-600 text-sm bg-green-500/10 p-2 rounded-lg">
                    <CheckCircle className="h-4 w-4" />
                    <span>{t("settings.connected")} - Eve v{eveVersion}</span>
                  </div>
                )}

                {connectionStatus === "error" && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-500/10 p-2 rounded-lg">
                    <XCircle className="h-4 w-4" />
                    <span>{connectionError || t("settings.connectionFailed")}</span>
                  </div>
                )}
              </div>
            </SettingsSection>
          </CardContent>
        </Card>

        {/* Language Section */}
        <Card className="border-border/40">
          <CardContent className="pt-6">
            <SettingsSection
              icon={<Globe className="h-4 w-4" />}
              title={t("settings.language")}
              description={t("settings.languageDesc")}
            >
              <Select value={language} onValueChange={(val) => setLanguage(val || "en")}>
                <SelectTrigger className="bg-muted/30 border-border/50">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t("settings.languages.en")}</SelectItem>
                  <SelectItem value="zh">{t("settings.languages.zh")}</SelectItem>
                </SelectContent>
              </Select>
            </SettingsSection>
          </CardContent>
        </Card>

        {/* Data Management Section */}
        <Card className="border-border/40">
          <CardContent className="pt-6">
            <SettingsSection
              icon={<Database className="h-4 w-4" />}
              title={t("settings.dataManagement")}
              description={t("settings.dataManagementDesc")}
            >
              <div className="space-y-3">
                {pendingActions > 0 && (
                  <div className="flex items-center gap-2 text-yellow-600 text-sm bg-yellow-500/10 p-2 rounded-lg">
                    <RefreshCw className="h-4 w-4" />
                    <span>{t("settings.pendingActions", { count: pendingActions })}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleForceSync}
                    disabled={isSyncing}
                    className="flex-1"
                  >
                    {isSyncing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {t("settings.forceSync")}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearCache}
                    disabled={isClearing}
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                  >
                    {isClearing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    {t("settings.clearCache")}
                  </Button>
                </div>
              </div>
            </SettingsSection>
          </CardContent>
        </Card>

        {/* About Section */}
        <Card className="border-border/40">
          <CardContent className="pt-6">
            <SettingsSection
              icon={<Info className="h-4 w-4" />}
              title={t("settings.about")}
            >
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("settings.appName")}</span>
                  <span className="font-medium">Wall-E</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("settings.version")}</span>
                  <span className="font-mono text-xs">1.0.0</span>
                </div>

                <SettingsDivider />

                <div className="flex flex-col gap-2">
                  <a
                    href="https://github.com/anthropics/eve"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t("settings.documentation")}
                  </a>
                  <a
                    href="https://github.com/anthropics/eve/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t("settings.reportIssue")}
                  </a>
                </div>
              </div>
            </SettingsSection>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full h-11 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
