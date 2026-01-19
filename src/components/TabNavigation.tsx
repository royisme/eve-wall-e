import { MessageSquare, Briefcase, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export type TabId = "chat" | "jobs" | "resume";

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const { t } = useTranslation();

  const tabs: { id: TabId; label: string; icon: typeof MessageSquare }[] = [
    { id: "chat", label: t('tabs.chat'), icon: MessageSquare },
    { id: "jobs", label: t('tabs.jobs'), icon: Briefcase },
    { id: "resume", label: t('tabs.resume'), icon: FileText },
  ];

  return (
    <nav className="flex items-center justify-around border-t border-border/30 bg-background/80 backdrop-blur-md h-[72px] pb-safe px-2 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] z-20">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative flex-1 flex flex-col items-center justify-center gap-1.5 h-12 rounded-2xl transition-all duration-300 ease-out group overflow-hidden",
              isActive
                ? "text-primary"
                : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/30"
            )}
          >
            {isActive && (
              <div className="absolute inset-0 bg-primary/5 rounded-2xl" />
            )}
            
            <Icon 
              className={cn(
                "h-5 w-5 transition-all duration-300", 
                isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" : "group-hover:scale-105"
              )} 
            />
            
            <span className={cn(
              "text-[10px] font-medium tracking-wide transition-all duration-300",
              isActive ? "opacity-100 font-semibold" : "opacity-80"
            )}>
              {tab.label}
            </span>
            
            {isActive && (
              <span className="absolute bottom-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_6px_var(--primary)]" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
