import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CompletedStepProps {
  serverHost: string;
  serverPort: string;
  eveVersion?: string;
  onComplete: () => void;
}

export function CompletedStep({
  serverHost,
  serverPort,
  eveVersion,
  onComplete,
}: CompletedStepProps) {
  const { t } = useTranslation();

  const pairedTime = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col h-dvh px-6 py-8 animate-in fade-in duration-300">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        <div className="flex flex-col gap-6 w-full text-center">
          {/* Success Icon */}
          <div className="h-20 w-20 rounded-2xl bg bg-gradient-to-br from-success/20 to-success/10 flex items-center justify-center ring-1 ring-success/20 self-center">
            <span className="text-4xl">✅</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-foreground">
            You're all set!
          </h1>

          {/* Description */}
          <p className="text-sm text-muted-foreground">
            Wall-E is now connected to Eve and ready to help you land your dream job.
          </p>
        </div>

        {/* Info Card */}
        <Card className="w-full mt-8">
          <CardContent className="space-y-4">
            <InfoRow label="Server" value={`${serverHost}:${serverPort}`} />
            {eveVersion && <InfoRow label="Eve Version" value={eveVersion} />}
            <InfoRow label="Paired" value={pairedTime} />
          </CardContent>
        </Card>
      </div>

      {/* Complete Button */}
      <div className="max-w-md mx-auto w-full">
        <Button onClick={onComplete} size="lg" className="w-full">
          Start Using
        </Button>
      </div>
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
