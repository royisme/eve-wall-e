import { Button } from "@/components/ui/button";
import { Copy, Check, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/toast";

interface EmailSetupGuideProps {
  onCheckStatus: () => void;
  isChecking: boolean;
}

export function EmailSetupGuide({ onCheckStatus, isChecking }: EmailSetupGuideProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const command = "eve email:setup <your-email>";

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    toast("success", "Command copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-muted/30 rounded-lg p-4 border border-border/50 space-y-4">
      <div className="space-y-2">
        <h3 className="font-medium text-amber-600 flex items-center gap-2">
          <span className="text-lg">⚠️</span> {t("settings.email.setupRequired")}
        </h3>
        
        <div className="text-sm text-muted-foreground space-y-1 ml-1">
          <p>{t("settings.email.guide.step1")}</p>
          <p>{t("settings.email.guide.step2")}</p>
        </div>
      </div>

      <div className="relative group">
        <div className="bg-black/90 text-white font-mono text-xs p-3 rounded-md pr-10 border border-white/10 shadow-sm">
          {command}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <div className="text-sm text-muted-foreground ml-1">
        <p>{t("settings.email.guide.step3")}</p>
      </div>

      <Button 
        onClick={onCheckStatus} 
        disabled={isChecking}
        className="w-full"
        variant="secondary"
      >
        {isChecking ? (
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}
        {t("settings.email.guide.checkStatus")}
      </Button>
    </div>
  );
}
