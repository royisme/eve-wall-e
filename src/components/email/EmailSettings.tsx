import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/SettingsSection";
import { eveApi, EmailStatusResponse } from "@/lib/api";
import { EmailSetupGuide } from "./EmailSetupGuide";
import { AccountList } from "./AccountList";

export function EmailSettings() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<EmailStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await eveApi.getEmailStatus();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const hasAuthorizedAccounts = status?.accounts && status.accounts.some(a => a.authorized);

  return (
    <Card className="border-border/40">
      <CardContent className="pt-6">
        <SettingsSection
          icon={<Mail className="h-4 w-4" />}
          title={t("settings.email.title")}
          description={t("settings.email.description")}
        >
          {loading && !status ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>{t("common.loading")}</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-2 text-red-500">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
              <Button variant="outline" size="sm" onClick={fetchStatus}>
                {t("common.retry")}
              </Button>
            </div>
          ) : status ? (
            <div className="space-y-4">
              {status.installed === false ? (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                  <p className="font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {t("settings.email.notInstalled")}
                  </p>
                  <p className="mt-1 opacity-90">{t("settings.email.installGuide")}</p>
                </div>
              ) : hasAuthorizedAccounts ? (
                <AccountList status={status} onRefresh={fetchStatus} />
              ) : (
                <EmailSetupGuide onCheckStatus={fetchStatus} isChecking={loading} />
              )}
            </div>
          ) : null}
        </SettingsSection>
      </CardContent>
    </Card>
  );
}
