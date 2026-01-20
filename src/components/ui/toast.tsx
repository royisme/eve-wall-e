import { type ReactNode } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  onDismiss: () => void;
}

export function Toast({ id, type, message, onDismiss }: ToastProps) {
  const icons = {
    success: <CheckCircle className="h-4 w-4" />,
    error: <AlertCircle className="h-4 w-4" />,
    info: <Info className="h-4 w-4" />,
  };

  const colors = {
    success: "bg-green-500 text-green-950",
    error: "bg-red-500 text-red-950",
    info: "bg-blue-500 text-blue-950",
  };

  return (
    <div
      key={id}
      className={cn(
        "flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg",
        "animate-in slide-in-from-bottom-2",
        colors[type]
      )}
    >
      {icons[type]}
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onDismiss}
        className="ml-2 text-inherit"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
