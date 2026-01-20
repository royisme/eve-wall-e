import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, WifiOff, FileWarning, Copy, RefreshCw } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isNetworkError } from "@/lib/errors";

type ErrorType = "network" | "validation" | "unknown";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorType: ErrorType;
  copied: boolean;
}

// Translations (inline to avoid hook in class component)
const translations = {
  en: {
    networkError: "Connection Error",
    networkMessage: "Unable to connect to Eve server. Please check if Eve is running.",
    validationError: "Invalid Data",
    validationMessage: "The data provided is invalid. Please try again.",
    unknownError: "Something went wrong",
    unknownMessage: "An unexpected error occurred.",
    tryAgain: "Try Again",
    copyError: "Copy Error Details",
    copied: "Copied!",
    checkConnection: "Check Connection",
  },
  zh: {
    networkError: "连接错误",
    networkMessage: "无法连接到 Eve 服务器。请检查 Eve 是否正在运行。",
    validationError: "数据无效",
    validationMessage: "提供的数据无效。请重试。",
    unknownError: "出了点问题",
    unknownMessage: "发生了意外错误。",
    tryAgain: "重试",
    copyError: "复制错误详情",
    copied: "已复制！",
    checkConnection: "检查连接",
  },
};

function getLanguage(): "en" | "zh" {
  if (typeof chrome !== "undefined" && chrome.storage) {
    // Sync call not available, fallback to navigator
  }
  const lang = navigator.language.toLowerCase();
  return lang.startsWith("zh") ? "zh" : "en";
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorType: "unknown",
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    let errorType: ErrorType = "unknown";

    if (isNetworkError(error)) {
      errorType = "network";
    } else if (error.message.toLowerCase().includes("validation")) {
      errorType = "validation";
    }

    return { hasError: true, error, errorType };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorType: "unknown", copied: false });
    this.props.onReset?.();
  };

  private handleCopyError = async () => {
    const { error } = this.state;
    if (!error) return;

    const errorDetails = `Error: ${error.name}
Message: ${error.message}
Stack: ${error.stack || "No stack trace"}
Time: ${new Date().toISOString()}
URL: ${window.location.href}`;

    try {
      await navigator.clipboard.writeText(errorDetails);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  private getErrorIcon() {
    const { errorType } = this.state;
    const iconClass = "h-10 w-10";

    switch (errorType) {
      case "network":
        return <WifiOff className={`${iconClass} text-yellow-500`} />;
      case "validation":
        return <FileWarning className={`${iconClass} text-orange-500`} />;
      default:
        return <AlertCircle className={`${iconClass} text-destructive`} />;
    }
  }

  private getErrorContent() {
    const { errorType } = this.state;
    const t = translations[getLanguage()];

    switch (errorType) {
      case "network":
        return {
          title: t.networkError,
          message: t.networkMessage,
          bgClass: "bg-yellow-500/5 border-yellow-500/20",
        };
      case "validation":
        return {
          title: t.validationError,
          message: t.validationMessage,
          bgClass: "bg-orange-500/5 border-orange-500/20",
        };
      default:
        return {
          title: t.unknownError,
          message: t.unknownMessage,
          bgClass: "bg-destructive/5 border-destructive/20",
        };
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, copied } = this.state;
      const t = translations[getLanguage()];
      const content = this.getErrorContent();

      return (
        <div className="flex h-full w-full items-center justify-center p-4 bg-background/50 backdrop-blur-sm">
          <Card className={`max-w-md w-full shadow-xl ${content.bgClass} animate-in zoom-in-95 duration-300`}>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3">
                {this.getErrorIcon()}
              </div>
              <CardTitle className="text-xl">{content.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                {content.message}
              </p>
              {error && (
                <pre className="mt-2 max-w-full overflow-auto rounded-lg bg-muted/50 p-3 text-xs text-left font-mono border border-border/50">
                  {error.message}
                </pre>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button
                onClick={this.handleReset}
                className="w-full"
                size="lg"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t.tryAgain}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleCopyError}
                className="w-full"
              >
                <Copy className="h-3.5 w-3.5 mr-2" />
                {copied ? t.copied : t.copyError}
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
