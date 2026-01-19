import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEveChat } from "@/hooks/useEveChat";
import { Loader2, Wand2, FileText, FileCode } from "lucide-react";
import { useTranslation } from "react-i18next";

export function Workspace() {
  const { t } = useTranslation();
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const { mutate, isPending } = useEveChat();

  const handleGenerate = async () => {
    const prompt = t('workspace.tailorPrompt', { jd, resume });
    
    mutate(
      { prompt },
      {
        onSuccess: (data) => {
          setResume(data.response);
        },
        onError: (error) => {
          console.error("Failed to generate resume:", error);
        },
      }
    );
  };

  return (
    <div className="h-dvh w-full flex flex-col bg-background/95 backdrop-blur-sm">
      <header className="h-16 border-b border-border/40 flex items-center px-6 justify-between bg-background/80 backdrop-blur-md z-10 sticky top-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
            <FileCode className="h-4 w-4 text-primary" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">{t('workspace.title')}</h1>
        </div>
        
        <Button 
          onClick={handleGenerate} 
          size="sm" 
          disabled={isPending}
          className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] rounded-xl px-5 h-9"
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              {t('workspace.generating')}
            </>
          ) : (
            <>
              <Wand2 className="h-3.5 w-3.5 mr-2" />
              {t('workspace.generateButton')}
            </>
          )}
        </Button>
      </header>
      
      <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-4 p-4 lg:p-6 bg-muted/5">
        <div className="flex flex-col h-full bg-card rounded-2xl border border-border/60 shadow-lg shadow-black/5 overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all duration-300 relative group">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="px-5 py-3.5 border-b border-border/40 bg-muted/30 flex items-center gap-2">
            <BriefcaseIcon className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-semibold tracking-tight text-foreground/80">{t('workspace.jdLabel')}</label>
          </div>
          <Textarea
            className="flex-1 font-mono text-sm resize-none border-0 focus-visible:ring-0 p-5 leading-relaxed bg-transparent selection:bg-primary/20 scrollbar-thin scrollbar-thumb-muted-foreground/20"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            disabled={isPending}
            placeholder={t('workspace.jdPlaceholder')}
          />
        </div>
        
        <div className="flex flex-col h-full bg-card rounded-2xl border border-border/60 shadow-lg shadow-black/5 overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all duration-300 relative group">
           <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
           <div className="px-5 py-3.5 border-b border-border/40 bg-muted/30 flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-semibold tracking-tight text-foreground/80">{t('workspace.resumeLabel')}</label>
          </div>
          <Textarea
            className="flex-1 font-mono text-sm resize-none border-0 focus-visible:ring-0 p-5 leading-relaxed bg-transparent selection:bg-primary/20 scrollbar-thin scrollbar-thumb-muted-foreground/20"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            disabled={isPending}
            placeholder={t('workspace.resumePlaceholder')}
          />
        </div>
      </div>
    </div>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  );
}
