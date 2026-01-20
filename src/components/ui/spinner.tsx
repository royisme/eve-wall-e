import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg";
type SpinnerColor = "primary" | "muted";

interface SpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

const colorClasses: Record<SpinnerColor, string> = {
  primary: "text-primary",
  muted: "text-muted-foreground",
};

export function Spinner({ size = "md", color = "primary", className }: SpinnerProps) {
  return (
    <Loader2
      className={cn(
        "animate-spin",
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    />
  );
}
