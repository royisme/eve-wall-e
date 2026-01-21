import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { HealthResponse } from "@/lib/api";

interface ConfigureStepProps {
  onNext: (config: { serverUrl: string; eveVersion?: string }) => void;
  onBack: () => void;
}

type ConnectionState = "idle" | "testing" | "success" | "error";

export function ConfigureStep({ onNext, onBack }: ConfigureStepProps) {
  const { t } = useTranslation();
  const [serverUrl, setServerUrl] = useState("http://localhost:3033");
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [eveVersion, setEveVersion] = useState<string | undefined>();

  const testConnection = async () => {
    setConnectionState("testing");
    setErrorMessage("");

    let urlToTest = serverUrl.trim();
    if (!urlToTest.startsWith("http://") && !urlToTest.startsWith("https://")) {
      if (urlToTest.includes("localhost") || urlToTest.includes("127.0.0.1")) {
        urlToTest = `http://${urlToTest}`;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      setErrorMessage(t("onboarding.configure.connectionTimedOut"));
      setConnectionState("error");
    }, 5000);

    try {
      new URL(urlToTest); 

      const baseUrl = urlToTest.replace(/\/$/, "");
      
      const response = await fetch(`${baseUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data: HealthResponse = await response.json();
      setEveVersion(data.version);
      setConnectionState("success");
      setServerUrl(baseUrl);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Connection test failed:", error);

      if (error instanceof Error && error.name === "AbortError") {
        setErrorMessage(t("onboarding.configure.connectionTimedOut"));
      } else if (error instanceof TypeError) {
         setErrorMessage("Invalid URL format");
      } else {
        setErrorMessage(error instanceof Error ? error.message : t("onboarding.configure.connectionFailed"));
      }
      setConnectionState("error");
    }
  };

  const canContinue = connectionState === "success";

  return (
    <div className="flex flex-col h-dvh px-6 py-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        <div className="flex flex-col gap-6 w-full text-center">
          {/* Icon */}
          <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center ring-1 ring-primary/20 self-center">
            <span className="text-3xl">🔗</span>
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-foreground">
            {t("onboarding.configure.title")}
          </h1>

          {/* Subtitle */}
          <p className="text-sm text-muted-foreground">
            {t("onboarding.configure.subtitle")}
          </p>
        </div>

        {/* Form */}
        <div className="w-full space-y-4 mt-8">
          <div className="space-y-2">
            <Label htmlFor="serverUrl">Eve Server URL</Label>
            <Input
              id="serverUrl"
              value={serverUrl}
              onChange={(e) => {
                setServerUrl(e.target.value);
                setConnectionState("idle");
                setEveVersion(undefined);
              }}
              placeholder="http://localhost:3033"
              className="h-11 font-mono text-sm"
              autoComplete="url"
            />
          </div>

          {/* Connection Status */}
          {connectionState !== "idle" && (
            <div className={`flex items-center gap-2 p-3 rounded-xl border ${
              connectionState === "success"
                ? "bg-success/20 border-success/20 text-success"
                : connectionState === "testing"
                  ? "bg-muted border-muted-foreground/20 text-muted-foreground"
                  : "bg-destructive/20 border-destructive/20 text-destructive"
            }`}>
              {connectionState === "testing" && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {connectionState === "success" && (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {connectionState === "error" && (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm">
                {connectionState === "testing" && t("onboarding.configure.testingConnection")}
                {connectionState === "success" && `${t("onboarding.configure.connected")} ${eveVersion || ""}`}
                {connectionState === "error" && errorMessage}
              </span>
            </div>
          )}

          {/* Hint */}
          <div className="bg-muted rounded-xl p-3 text-left">
            <div className="flex items-start gap-2">
              <span className="text-lg">💡</span>
              <p className="text-xs text-muted-foreground">
                {t("onboarding.configure.hint")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 max-w-md mx-auto w-full">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          {t("onboarding.configure.back")}
        </Button>
        <Button
          variant={canContinue ? "default" : "secondary"}
          onClick={() => {
            if (canContinue) {
              try {
                const url = new URL(serverUrl);
                const cleanUrl = url.origin + (url.pathname === '/' ? '' : url.pathname).replace(/\/$/, "");
                
                onNext({ 
                  serverUrl: cleanUrl, 
                  eveVersion 
                });
              } catch (e) {
                console.error("Invalid URL structure", e);
                setErrorMessage("Invalid URL structure");
                setConnectionState("error");
              }
            } else {
              testConnection();
            }
          }}
          disabled={connectionState === "testing"}
          className="flex-1"
        >
          {connectionState === "testing" && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          {canContinue ? t("onboarding.configure.continue") : t("onboarding.configure.testConnection")}
        </Button>
      </div>
    </div>
  );
}
