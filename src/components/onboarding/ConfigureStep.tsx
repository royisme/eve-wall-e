import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { HealthResponse } from "@/lib/api";

interface ConfigureStepProps {
  onNext: (config: { serverHost: string; serverPort: string; serverUrl: string; eveVersion?: string }) => void;
  onBack: () => void;
}

type ConnectionState = "idle" | "testing" | "success" | "error";

export function ConfigureStep({ onNext, onBack }: ConfigureStepProps) {
  const { t } = useTranslation();
  const [serverHost, setServerHost] = useState("localhost");
  const [serverPort, setServerPort] = useState("3033");
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [eveVersion, setEveVersion] = useState<string | undefined>();

  const serverUrl = `http://${serverHost}:${serverPort}`;

  const testConnection = async () => {
    setConnectionState("testing");
    setErrorMessage("");

    try {
      const response = await fetch(`${serverUrl}/health`);
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data: HealthResponse = await response.json();
      setEveVersion(data.version);
      setConnectionState("success");
    } catch (error) {
      console.error("Connection test failed:", error);
      setErrorMessage(error instanceof Error ? error.message : "Connection failed");
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
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-1 ring-primary/20 self-center">
            <span className="text-3xl">🔗</span>
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-foreground">
            Connect to Eve
          </h1>

          {/* Subtitle */}
          <p className="text-sm text-muted-foreground">
            Make sure Eve is running on your computer.
          </p>
        </div>

        {/* Form */}
        <div className="w-full space-y-4 mt-8">
          {/* Server Address */}
          <div className="space-y-2">
            <Label htmlFor="serverHost">Server Address</Label>
            <Input
              id="serverHost"
              value={serverHost}
              onChange={(e) => {
                setServerHost(e.target.value);
                setConnectionState("idle");
                setEveVersion(undefined);
              }}
              placeholder="localhost"
              className="h-11"
            />
          </div>

          {/* Port */}
          <div className="space-y-2">
            <Label htmlFor="serverPort">Port</Label>
            <Input
              id="serverPort"
              value={serverPort}
              onChange={(e) => {
                setServerPort(e.target.value);
                setConnectionState("idle");
                setEveVersion(undefined);
              }}
              placeholder="3033"
              className="h-11"
            />
          </div>

          {/* Connection Status */}
          {connectionState !== "idle" && (
            <div className={`flex items-center gap-2 p-3 rounded-xl border ${
              connectionState === "success"
                ? "bg-success/10 border-success/20 text-success"
                : connectionState === "testing"
                  ? "bg-muted border-muted-foreground/20 text-muted-foreground"
                  : "bg-destructive/10 border-destructive/20 text-destructive"
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
                {connectionState === "testing" && "Testing connection..."}
                {connectionState === "success" && `Connected to Eve ${eveVersion || ""}`}
                {connectionState === "error" && errorMessage}
              </span>
            </div>
          )}

          {/* Hint */}
          <div className="bg-muted/50 rounded-xl p-3 text-left">
            <div className="flex items-start gap-2">
              <span className="text-lg">💡</span>
              <p className="text-xs text-muted-foreground">
                Run <code className="px-1.5 py-0.5 bg-background rounded font-mono">bun run serve</code> in Eve directory to start server
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
          Back
        </Button>
        <Button
          variant={canContinue ? "default" : "secondary"}
          onClick={() => {
            if (canContinue) {
              onNext({ serverHost, serverPort, serverUrl, eveVersion });
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
          {canContinue ? "Continue" : "Test"}
        </Button>
      </div>
    </div>
  );
}
