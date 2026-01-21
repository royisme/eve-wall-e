import { useState } from "react";
import { WelcomeStep } from "./WelcomeStep";
import { ConfigureStep } from "./ConfigureStep";
import { PairingStep } from "./PairingStep";
import { CompletedStep } from "./CompletedStep";

export type Step = "welcome" | "configure" | "pairing" | "completed";

export interface OnboardingProps {
  onComplete: () => void;
}

interface ServerConfig {
  serverHost: string;
  serverPort: string;
  serverUrl: string;
  eveVersion?: string;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);

  const handleWelcomeNext = () => {
    setStep("configure");
  };

  const handleConfigureNext = (config: ServerConfig) => {
    setServerConfig(config);
    setStep("pairing");
  };

  const handleConfigureBack = () => {
    setStep("welcome");
  };

  const handlePairingNext = () => {
    setStep("completed");
  };

  const handlePairingBack = () => {
    setStep("configure");
  };

  const handleCompleted = () => {
    onComplete();
  };

  return (
    <div className="h-dvh bg-background">
      {step === "welcome" && (
        <WelcomeStep onNext={handleWelcomeNext} />
      )}
      {step === "configure" && (
        <ConfigureStep
          onNext={handleConfigureNext}
          onBack={handleConfigureBack}
        />
      )}
      {step === "pairing" && serverConfig && (
        <PairingStep
          serverUrl={serverConfig.serverUrl}
          serverHost={serverConfig.serverHost}
          serverPort={serverConfig.serverPort}
          eveVersion={serverConfig.eveVersion}
          onNext={handlePairingNext}
          onBack={handlePairingBack}
        />
      )}
      {step === "completed" && serverConfig && (
        <CompletedStep
          serverHost={serverConfig.serverHost}
          serverPort={serverConfig.serverPort}
          eveVersion={serverConfig.eveVersion}
          onComplete={handleCompleted}
        />
      )}
    </div>
  );
}
