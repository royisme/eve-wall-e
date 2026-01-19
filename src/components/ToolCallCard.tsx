import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Loader2, AlertCircle, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type ToolStatus = "pending" | "running" | "success" | "error";

interface ToolCall {
  id: string;
  name: string;
  status: ToolStatus;
  result?: string;
}

interface ToolCallCardProps {
  tools: ToolCall[];
}

const statusIcons: Record<ToolStatus, React.ReactNode> = {
  pending: <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40" />,
  running: <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />,
  success: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  error: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
};

export function ToolCallCard({ tools }: ToolCallCardProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  if (tools.length === 0) return null;

  const completedCount = tools.filter((t) => t.status === "success").length;
  const hasError = tools.some((t) => t.status === "error");
  const isRunning = tools.some((t) => t.status === "running" || t.status === "pending");

  return (
    <div className={cn(
      "rounded-xl border text-xs overflow-hidden transition-all duration-300 group",
      isRunning 
        ? "bg-primary/5 border-primary/20 shadow-[0_0_15px_-5px_rgba(96,165,250,0.15)]" 
        : "bg-muted/30 border-border/60"
    )}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-muted/40 transition-colors"
      >
        <div className={cn(
          "h-6 w-6 rounded-md flex items-center justify-center transition-colors",
          isRunning ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}>
           <Terminal className="h-3.5 w-3.5" />
        </div>
        
        <div className="flex flex-col items-start gap-0.5">
          <span className={cn(
             "font-mono font-medium tracking-tight",
             isRunning ? "text-primary" : "text-muted-foreground"
          )}>
            {isRunning ? (
              <span className="animate-pulse">{t('chat.toolCard.processing', { count: tools.length })}</span>
            ) : hasError ? (
              <span className="text-destructive">{t('chat.toolCard.error')}</span>
            ) : (
               t('chat.toolCard.completed', { count: completedCount })
            )}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
           <div className="flex items-center gap-1">
            {tools.slice(0, 3).map((tool) => (
              <span key={tool.id}>{statusIcons[tool.status]}</span>
            ))}
            {tools.length > 3 && (
              <span className="text-[10px] text-muted-foreground/70 font-mono">+{tools.length - 3}</span>
            )}
           </div>
           {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 space-y-2 border-t border-border/30 bg-background/30 backdrop-blur-sm">
          <div className="h-2" /> 
          {tools.map((tool) => (
            <div key={tool.id} className="group/item flex items-start gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="mt-0.5">{statusIcons[tool.status]}</div>
              <div className="flex-1 min-w-0 grid gap-1">
                <span className={cn(
                  "font-mono text-[11px] font-medium leading-none",
                  tool.status === "error" ? "text-destructive" : "text-foreground/90"
                )}>
                  {tool.name}
                </span>
                {tool.result && tool.status === "success" && (
                  <div className="text-[10px] text-muted-foreground font-mono bg-muted/30 rounded px-2 py-1 mt-1 border border-border/30 truncate">
                    {tool.result}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
