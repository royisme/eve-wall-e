import { Button } from "@/components/ui/button";
import { Bookmark, X, Briefcase, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DetectedJob {
  title: string;
  company: string;
  url?: string;
}

interface JobContextStripProps {
  job: DetectedJob | null;
  onAnalyze: () => void;
  onSave: () => void;
  onDismiss: () => void;
  isAnalyzing?: boolean;
}

export function JobContextStrip({ job, onAnalyze, onSave, onDismiss, isAnalyzing }: JobContextStripProps) {
  const { t } = useTranslation();
  if (!job) return null;

  return (
    <div className="border-b border-primary/10 bg-background/80 backdrop-blur-md px-4 py-3 shadow-lg animate-in slide-in-from-top-2 duration-300 relative z-30">
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0 flex items-center gap-3.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/20 shadow-[0_0_10px_rgba(96,165,250,0.2)]">
            <Briefcase className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="min-w-0 flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold truncate tracking-tight">{job.title}</span>
              <span className="text-[10px] font-mono font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 uppercase tracking-wider">
                Detected
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <span>{job.company}</span>
              {job.url && <span className="w-1 h-1 rounded-full bg-primary/40" />}
              {job.url && <span className="truncate opacity-70 font-mono text-[10px]">{new URL(job.url).hostname}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="default"
            size="sm"
            className="h-8 text-xs font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] bg-primary text-primary-foreground"
            onClick={onAnalyze}
            disabled={isAnalyzing}
          >
            <Zap className="h-3.5 w-3.5 mr-1.5 fill-current" />
            {isAnalyzing ? t('jobContext.analyzing') : t('jobContext.analyze')}
          </Button>
          <div className="w-px h-6 bg-border/60 mx-1" />
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" 
            onClick={onSave}
          >
            <Bookmark className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors" 
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
