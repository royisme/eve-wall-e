import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SettingsSection({
  icon,
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="pl-12 space-y-3">{children}</div>
    </div>
  );
}

export function SettingsDivider() {
  return <div className="border-t border-border/40 my-4" />;
}
