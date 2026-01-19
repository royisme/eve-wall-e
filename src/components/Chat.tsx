import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEveChat, type Message } from "@/hooks/useEveChat";
import { JobContextStrip } from "@/components/JobContextStrip";
import { ToolCallCard } from "@/components/ToolCallCard";
import { Send, Loader2, Sparkles, Bot, User } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DetectedJob {
  title: string;
  company: string;
  url?: string;
}

export function Chat() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [detectedJob, setDetectedJob] = useState<DetectedJob | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { mutate, isPending, error } = useEveChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPending]);

  useEffect(() => {
    setDetectedJob({
      title: "Senior Software Engineer",
      company: "Google",
      url: "https://careers.google.com/jobs/123",
    });
  }, []);

  const handleSend = (customPrompt?: string) => {
    const promptText = customPrompt || input;
    if (!promptText.trim() || isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: promptText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setInput("");

    mutate(
      { prompt: promptText },
      {
        onSuccess: (data) => {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: data.response,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        },
      }
    );
  };

  const handleAnalyzeJob = () => {
    if (!detectedJob) return;
    handleSend(t('chat.prompt.analyzeJob', { title: detectedJob.title, company: detectedJob.company }));
  };

  const handleSaveJob = () => {
    if (!detectedJob) return;
    handleSend(t('chat.prompt.saveJob', { title: detectedJob.title, company: detectedJob.company }));
  };

  const isEmpty = messages.length === 0;
  
  const suggestionKeys = ['findJobs', 'analyzeJob', 'helpResume'] as const;

  return (
    <div className="flex flex-col h-full bg-background relative">
      <JobContextStrip
        job={detectedJob}
        onAnalyze={handleAnalyzeJob}
        onSave={handleSaveJob}
        onDismiss={() => setDetectedJob(null)}
        isAnalyzing={isPending}
      />
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 animate-in fade-in duration-500">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-sm ring-1 ring-primary/20">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="font-semibold text-xl mb-2 tracking-tight">{t('chat.welcome.title')}</h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-[240px] leading-relaxed">
              {t('chat.welcome.subtitle')}
            </p>
            <div className="flex flex-col gap-2.5 w-full max-w-[260px]">
              {suggestionKeys.map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs h-10 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
                  onClick={() => handleSend(t(`chat.suggestions.${key}`))}
                >
                  <Sparkles className="h-3 w-3 mr-2 opacity-70" />
                  {t(`chat.suggestions.${key}`)}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"} animate-in slide-in-from-bottom-2 duration-300`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  msg.role === "user" ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary ring-1 ring-primary/20"
                }`}>
                  {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    msg.role === "user"
                      ? "bg-accent/10 border border-accent/20 text-foreground rounded-tr-sm"
                      : "bg-card border border-border text-foreground rounded-tl-sm"
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isPending && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <ToolCallCard
                  tools={[
                    { id: "1", name: "jobs_search", status: "success", result: "Found 12 jobs" },
                    { id: "2", name: "jobs_analyze", status: "running" },
                  ]}
                />
                 <div className="flex gap-3">
                   <div className="h-8 w-8 rounded-full bg-primary/10 text-primary ring-1 ring-primary/20 flex items-center justify-center shrink-0">
                     <Bot className="h-4 w-4" />
                   </div>
                   <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5 h-10">
                     <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                     <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                     <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"></span>
                   </div>
                 </div>
              </div>
            )}
            {error && (
              <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 animate-in fade-in flex gap-2 items-center">
                 <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                 <span>{t('common.error')}: {error.message}</span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} className="h-px" />
      </div>

      <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border/40">
        <div className="relative flex items-center gap-2 p-1.5 bg-muted/40 border border-border/50 rounded-2xl focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all shadow-sm">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={t('chat.placeholder')}
            disabled={isPending}
            className="border-0 focus-visible:ring-0 shadow-none bg-transparent h-10 px-3"
          />
          <Button 
            onClick={() => handleSend()} 
            disabled={isPending || !input.trim()} 
            size="icon"
            className="h-9 w-9 shrink-0 rounded-xl transition-all hover:scale-105 active:scale-95"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}