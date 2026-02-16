import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmailStatusResponse } from "@/lib/api";

interface AccountListProps {
  status: EmailStatusResponse;
  onRefresh: () => void;
}

export function AccountList({ status, onRefresh }: AccountListProps) {
  const { t, i18n } = useTranslation();

  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleString(i18n.language, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t("settings.email.accounts.title")}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={status.syncing}
          className="h-7 w-7 p-0"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${status.syncing ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      <div className="space-y-2">
        {status.accounts.map((account) => (
          <div
            key={account.email}
            className="bg-card border border-border/50 rounded-lg p-3 flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">
                  {account.email}
                </div>
                {account.lastSyncAt && (
                  <div className="text-xs text-muted-foreground truncate">
                    {t("settings.email.accounts.lastSync", {
                      time: formatTime(account.lastSyncAt),
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {status.accounts.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4 bg-muted/20 rounded-lg border border-dashed border-border/50">
            {t("settings.email.accounts.noAccounts")}
          </div>
        )}
      </div>

      {status.error && (
        <div className="text-xs text-red-500 bg-red-500/5 p-2 rounded border border-red-500/20">
          {t("settings.email.status.error", { message: status.error })}
        </div>
      )}
    </div>
  );
}
