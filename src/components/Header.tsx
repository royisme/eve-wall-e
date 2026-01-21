import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useEveHealth } from "@/hooks/useEveChat";
import { useTranslation } from "react-i18next";

interface HeaderProps {
  onSettingsClick: () => void;
}

export function Header({ onSettingsClick }: HeaderProps) {
  const { t } = useTranslation();
  const { data, isError, isLoading } = useEveHealth();
  
  const isConnected = !isError && !isLoading && data && typeof data === 'object' && 'status' in data && (data as any).status === "ok";

  return (
    <header className="h-16 border-b border-border/40 flex items-center justify-between px-6 bg-background sticky top-0 z-20 transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="relative group cursor-default">
          <div className="absolute -inset-1 bg-primary/10 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <span className="relative font-bold text-xl tracking-tight text-foreground font-display">
            {t('header.title')}
          </span>
        </div>
        
        <div className="flex items-center gap-2 ml-2 px-2.5 py-1 rounded-full bg-muted border border-border/30">
          {isLoading ? (
            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-pulse" />
          ) : isConnected ? (
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/50 opacity-75 duration-1000"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary shadow-[0_0_8px_rgba(96,165,250,0.6)]"></span>
            </div>
          ) : (
            <div className="h-1.5 w-1.5 rounded-full bg-destructive/70" />
          )}
          <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">
            {isLoading ? t('common.loading') : isConnected ? t('common.connected') : t('common.offline')}
          </span>
        </div>
      </div>
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onSettingsClick}
        className="h-9 w-9 rounded-full hover:bg-muted hover:text-primary transition-all duration-300 hover:rotate-90"
      >
        <Settings className="h-4.5 w-4.5" />
      </Button>
    </header>
  );
}
