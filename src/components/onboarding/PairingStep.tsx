import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { requestPairing, saveAuth } from "@/lib/auth";

interface PairingStepProps {
  serverUrl: string;
  serverHost: string;
  serverPort: string;
  eveVersion?: string;
  onNext: () => void;
  onBack: () => void;
}

type PairingProgress = {
  connecting: boolean;
  verifying: boolean;
  receiving: boolean;
  saving: boolean;
};

type PairingStatus = "idle" | "pairing" | "success" | "error";

export function PairingStep({
  serverUrl,
  serverHost,
  serverPort,
  eveVersion,
  onNext,
  onBack,
}: PairingStepProps) {
  const [status, setStatus] = useState<PairingStatus>("idle");
  const [progress, setProgress] = useState<PairingProgress>({
    connecting: false,
    verifying: false,
    receiving: false,
    saving: false,
  });
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    startPairing();
  }, []);

  const startPairing = async () => {
    setStatus("pairing");
    setErrorMessage("");
    setProgress({ connecting: false, verifying: false, receiving: false, saving: false });

    try {
      // Step 1: Connecting
      setProgress({ connecting: true, verifying: false, receiving: false, saving: false });
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Verifying & Requesting
      setProgress({ connecting: true, verifying: true, receiving: false, saving: false });

      const result = await requestPairing(serverUrl);

      if (!result.success || !result.token) {
        throw new Error(result.error || "Pairing failed");
      }

      // Step 3: Token received
      setProgress({ connecting: true, verifying: true, receiving: true, saving: false });
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 4: Saving
      setProgress({ connecting: true, verifying: true, receiving: true, saving: true });

      await saveAuth({
        token: result.token,
        serverHost,
        serverPort,
        eveVersion,
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      setStatus("success");
      setTimeout(() => {
        onNext();
      }, 800);

    } catch (error) {
      console.error("Pairing failed:", error);
      setErrorMessage(error instanceof Error ? error.message : "Pairing failed");
      setStatus("error");
    }
  };

  const handleRetry = () => {
    startPairing();
  };

  return (
    <div className="flex flex-col h-dvh px-6 py-8 animate-in fade-in duration-300">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        {status === "error" ? (
          /* Error State */
          <div className="flex flex-col items-center gap-6 w-full text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center ring-1 ring-destructive/20">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground">
                Pairing Failed
              </h1>
              <p className="text-sm text-muted-foreground">
                {errorMessage}
              </p>
            </div>

            <Button onClick={handleRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : status === "success" ? (
          /* Success State */
          <div className="flex flex-col items-center gap-6 w-full text-center">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center ring-1 ring-success/20">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>

            <h1 className="text-xl font-bold text-foreground">
              Pairing Successful!
            </h1>

            <div className="w-full space-y-3 text-left">
              <ProgressItem
                label="Connection verified"
                complete={progress.connecting}
                current={status === "pairing"}
              />
              <ProgressItem
                label="Token received"
                complete={progress.receiving}
                current={status === "pairing" && !progress.receiving}
              />
              <ProgressItem
                label="Credentials saved"
                complete={progress.saving}
                current={status === "pairing" && !progress.saving}
              />
            </div>
          </div>
        ) : (
          /* Pairing Progress State */
          <div className="flex flex-col items-center gap-8 w-full text-center">
            {/* Spinner */}
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20 animate-pulse">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>

            <h1 className="text-xl font-bold text-foreground">
              Pairing...
            </h1>

            {/* Message */}
            {progress.saving && (
              <p className="text-sm text-muted-foreground">
                Saving credentials...
              </p>
            )}
            {progress.receiving && !progress.saving && (
              <p className="text-sm text-muted-foreground">
                Token received
              </p>
            )}
            {progress.verifying && !progress.receiving && (
              <p className="text-sm text-muted-foreground">
                Requesting secure connection from Eve server...
              </p>
            )}
            {progress.connecting && !progress.verifying && (
              <p className="text-sm text-muted-foreground">
                Connecting to Eve...
              </p>
            )}

            {/* Progress Indicators */}
            <div className="w-full space-y-3 text-left">
              <ProgressItem
                label="Connection verified"
                complete={progress.connecting}
                current={status === "pairing" && !progress.connecting}
              />
              <ProgressItem
                label="Token received"
                complete={progress.receiving}
                current={status === "pairing" && progress.connecting && !progress.receiving}
              />
              <ProgressItem
                label="Credentials saved"
                complete={progress.saving}
                current={status === "pairing" && progress.receiving && !progress.saving}
              />
            </div>
          </div>
        )}
      </div>

      {/* Back Button (only when in error state) */}
      {status === "error" && (
        <div className="max-w-md mx-auto w-full">
          <Button
            variant="ghost"
            onClick={onBack}
            className="w-full"
          >
            Back
          </Button>
        </div>
      )}
    </div>
  );
}

interface ProgressItemProps {
  label: string;
  complete: boolean;
  current?: boolean;
}

function ProgressItem({ label, complete, current }: ProgressItemProps) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border">
      {complete ? (
        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
      ) : current ? (
        <Loader2 className="h-4 w-4 text-primary shrink-0 animate-spin" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
      )}
      <span className={`text-sm ${complete ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}
