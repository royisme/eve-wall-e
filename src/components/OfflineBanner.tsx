import { useState, useEffect } from "react";
import { Wifi, X } from "lucide-react";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { getAllActions } from "@/lib/db";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const { t } = useTranslation();
  const { status } = useConnectionStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show banner when offline
    if (status === "offline") {
      setIsVisible(true);

      // Count pending actions
      getAllActions().then((actions) => {
        const pending = actions.filter((a) => a.status === "pending").length;
        setPendingCount(pending);
      });
    } else if (status === "online" && isVisible) {
      // Hide when connected with delay for smooth transition
      const timeoutId = window.setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [status]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        status === "offline" ? "translate-y-0" : "-translate-y-full"
      )}
    >
      <div className="bg-yellow-500/90 border-b border-yellow-500/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Wifi className="h-5 w-5 text-yellow-800" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800">
              {t("offline.youreOffline")}
            </p>
            {pendingCount > 0 && (
              <p className="text-xs text-yellow-700 mt-1">
                {t("offline.pendingChanges", { count: pendingCount })}
              </p>
            )}
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-yellow-800 hover:text-yellow-950 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
