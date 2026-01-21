import { useState, useEffect } from "react";
import { Toast } from "./toast";

interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  message: string;
  timestamp: number;
}

const TOAST_DURATION = 4000;
const MAX_TOASTS = 3;

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (event: CustomEvent) => {
      const toast = event.detail as ToastItem;
      setToasts((prev) => [...prev.slice(0, MAX_TOASTS - 1), toast]);
      setTimeout(() => removeToast(toast.id), TOAST_DURATION);
    };

    window.addEventListener("wall-e-toast", handler as EventListener);

    return () => window.removeEventListener("wall-e-toast", handler as EventListener);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
