import { useState } from "react";
import { WelcomeStep } from "./WelcomeStep";
import { ConfigureStep } from "./ConfigureStep";
import { CompletedStep } from "./CompletedStep";
import { setServerUrl } from "@/lib/auth";

export type Step = "welcome" | "configure" | "completed";

export interface OnboardingProps {
  onComplete: () => void;
}

interface ServerConfig {
  serverUrl: string;
  eveVersion?: string;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);

  const handleWelcomeNext = () => {
    setStep("configure");
  };

  const handleConfigureNext = async (config: { serverUrl: string; eveVersion?: string }) => {
    await setServerUrl(config.serverUrl);
    setServerConfig(config);
    setStep("completed");
  };

  const handleConfigureBack = () => {
    setStep("welcome");
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
      {step === "completed" && serverConfig && (
        <CompletedStep
          serverUrl={serverConfig.serverUrl}
          eveVersion={serverConfig.eveVersion}
          onComplete={handleCompleted}
        />
      )}
    </div>
  );
}
