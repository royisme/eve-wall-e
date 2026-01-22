import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJobDetection } from "@/hooks/useJobDetection";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { JobContextStrip } from "@/components/JobContextStrip";
import { ToolCallCard } from "@/components/ToolCallCard";
import { ThinkingBlock } from "@/components/ThinkingBlock";
import { MessageContent } from "@/components/MessageContent";
import { Send, Loader2, Sparkles, Bot, User, StopCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export function Chat() {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { detectedJob, isSaving, saveCurrentPage, dismissJob } =
    useJobDetection();
  const { messages, isStreaming, error, sendMessage, stopGeneration } =
    useStreamingChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (customPrompt?: string) => {
    const promptText = customPrompt || input;
    if (!promptText.trim() || isStreaming) return;

    const context = detectedJob
      ? {
          detectedJob: {
            title: detectedJob.title,
            company: detectedJob.company,
            url: detectedJob.url,
          },
        }
      : undefined;

    sendMessage(promptText, context);
    if (!customPrompt) setInput("");
  };

  const handleAnalyzeJob = async () => {
    if (!detectedJob) return;
    await saveCurrentPage();
    handleSend(
      t("chat.prompt.analyzeJob", {
        title: detectedJob.title,
        company: detectedJob.company,
      }),
    );
  };

  const handleSaveJob = async () => {
    if (!detectedJob) return;
    await saveCurrentPage();
  };

  const isEmpty = messages.length === 0;
  const suggestionKeys = ["findJobs", "analyzeJob", "helpResume"] as const;

  return (
    <div className="flex flex-col h-full bg-background relative">
      <JobContextStrip
        job={detectedJob}
        onAnalyze={handleAnalyzeJob}
        onSave={handleSaveJob}
        onDismiss={dismissJob}
        isAnalyzing={isSaving || isStreaming}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 animate-in fade-in duration-500">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-sm ring-1 ring-primary/20">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="font-semibold text-xl mb-2 tracking-tight">
              {t("chat.welcome.title")}
            </h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-[240px] leading-relaxed">
              {t("chat.welcome.subtitle")}
            </p>
            <div className="flex flex-col gap-2.5 w-full max-w-[260px]">
              {suggestionKeys.map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs h-10 rounded-xl hover:border-primary/50 hover:bg-primary/10 transition-all duration-200"
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
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"} animate-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                    msg.role === "user"
                      ? "bg-accent text-accent-foreground"
                      : "bg-primary/20 text-primary ring-1 ring-primary/20"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                <div className="flex flex-col gap-3 max-w-[85%]">
                  {/* Thinking blocks */}
                  {msg.thinking && msg.thinking.length > 0 && (
                    <ThinkingBlock thinking={msg.thinking} />
                  )}

                  {/* Tool calls */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <ToolCallCard tools={msg.toolCalls} />
                  )}

                  {/* Message content */}
                  {msg.content && (
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        msg.role === "user"
                          ? "bg-accent text-accent-foreground rounded-tr-sm"
                          : "bg-card border border-border text-foreground rounded-tl-sm"
                      }`}
                    >
                      <MessageContent
                        content={msg.content}
                        isStreaming={msg.isStreaming}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 animate-in fade-in flex gap-2 items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                <span>
                  {t("common.error")}: {error.message}
                </span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} className="h-px" />
      </div>

      <div className="p-4 bg-background border-t border-border/40">
        <div className="relative flex items-center gap-2 p-1.5 bg-muted border border-border/50 rounded-2xl focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all shadow-sm">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t("chat.placeholder")}
            disabled={isStreaming}
            className="border-0 focus-visible:ring-0 shadow-none bg-transparent h-10 px-3"
          />
          <Button
            onClick={() => (isStreaming ? stopGeneration() : handleSend())}
            disabled={!isStreaming && !input.trim()}
            size="icon"
            variant={isStreaming ? "destructive" : "default"}
            className="h-9 w-9 shrink-0 rounded-xl transition-all hover:scale-105 active:scale-95"
          >
            {isStreaming ? (
              <StopCircle className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
