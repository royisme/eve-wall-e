import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ReconnectPromptProps {
  onReconnect: () => void;
}

export function ReconnectPrompt({ onReconnect }: ReconnectPromptProps) {
  const { t } = useTranslation();

  const reasonKeys = [
    "reconnect.reasons.serverRestarted",
    "reconnect.reasons.anotherDevice",
    "reconnect.reasons.tokenRevoked",
  ];

  return (
    <div className="flex flex-col h-dvh px-6 py-8 animate-in fade-in duration-300">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        <div className="flex flex-col gap-6 w-full text-center">
          {/* Icon */}
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/10 flex items-center justify-center ring-1 ring-destructive/20 self-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-foreground">
            {t("reconnect.title")}
          </h1>

          {/* Description */}
          <p className="text-sm text-muted-foreground">
            {t("reconnect.description")}
          </p>

          {/* Reasons */}
          <div className="w-full text-left">
            <p className="text-xs text-muted-foreground mb-2">
              {t("reconnect.reasons.intro")}
            </p>
            <ul className="space-y-1">
              {reasonKeys.map((key, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-muted-foreground">•</span>
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Reconnect Button */}
      <div className="max-w-md mx-auto w-full">
        <Button onClick={onReconnect} size="lg" className="w-full">
          {t("reconnect.button")}
        </Button>
      </div>
    </div>
  );
}
