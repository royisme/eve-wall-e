import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-dvh px-6 py-8 animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        {/* Icon */}
        <div className="h-20 w-20 rounded-2xl bg-primary/20 flex items-center justify-center ring-1 ring-primary/20">
          <span className="text-4xl">🤖</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground">
          {t("onboarding.welcome.title")}
        </h1>

        {/* Subtitle */}
        <p className="text-base text-muted-foreground">
          {t("onboarding.welcome.subtitle")}
        </p>

        {/* Description */}
        <p className="text-sm text-muted-foreground">
          {t("onboarding.welcome.description")}
        </p>

        {/* Action Button */}
        <Button onClick={onNext} size="lg" className="w-full mt-4">
          {t("onboarding.welcome.cta")}
        </Button>
      </div>
    </div>
  );
}
