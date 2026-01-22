/**
 * useStreamingChat Hook - AI SDK v6 Compatible
 * Manages streaming chat state and handles AI SDK events
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { streamChat } from "@/lib/sse-parser";
import { getAuthToken, getServerUrl } from "@/lib/auth";
import { buildUrl, endpoints } from "@/lib/endpoints";
import type {
  Message,
  ChatRequest,
  ChatContext,
  ThinkingBlock,
  ToolCall,
  AISDKEvent,
  MessageSnapshot,
} from "@/lib/streaming-chat-types";

// Local storage key for message persistence
const MESSAGES_STORAGE_KEY = "wall-e-chat-messages";

export function useStreamingChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (stored) {
      try {
        const snapshots: MessageSnapshot[] = JSON.parse(stored);
        const restored = snapshots.map((snapshot) => ({
          id: snapshot.id,
          role: snapshot.role,
          content: snapshot.content,
          thinking: snapshot.reasoning?.map((r, i) => ({
            id: `thinking_${i}`,
            content: r,
            isCollapsed: false,
          })),
          toolCalls: snapshot.toolCalls,
          timestamp: new Date(snapshot.timestamp),
          isStreaming: false,
        }));
        setMessages(restored);
      } catch (e) {
        console.error("[Chat] Failed to restore messages:", e);
      }
    }
  }, []);

  // Save messages to localStorage incrementally
  const persistMessages = useCallback((msgs: Message[]) => {
    const snapshots: MessageSnapshot[] = msgs.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      reasoning: msg.thinking?.map((t) => t.content),
      toolCalls: msg.toolCalls,
      timestamp: msg.timestamp.toISOString(),
      isComplete: !msg.isStreaming,
    }));
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(snapshots));
  }, []);

  const sendMessage = useCallback(
    async (content: string, context?: ChatContext) => {
      // Add user message
      const userMessage: Message = {
        id: `user_${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      persistMessages(newMessages);
      setIsStreaming(true);
      setError(null);

      // Prepare assistant message shell
      const assistantMessageId = `assistant_${Date.now()}`;
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        thinking: [],
        toolCalls: [],
        timestamp: new Date(),
        isStreaming: true,
      };

      const messagesWithAssistant = [...newMessages, assistantMessage];
      setMessages(messagesWithAssistant);

      // Prepare request
      const request: ChatRequest = {
        messages: newMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
        })),
        context,
        options: {
          showThinking: true,
          stream: true,
        },
      };

      // Create abort controller
      abortControllerRef.current = new AbortController();

      try {
        const baseUrl = await getServerUrl();
        const token = await getAuthToken();
        const url = buildUrl(baseUrl, endpoints.jobs.chat);

        // Track state for AI SDK v6 events
        const reasoningMap = new Map<string, ThinkingBlock>();
        const toolCallsMap = new Map<string, ToolCall>();
        const textBlocksMap = new Map<string, string>();
        let currentTextId: string | null = null;

        for await (const event of streamChat(
          url,
          request,
          token,
          abortControllerRef.current.signal,
        )) {
          handleAISDKEvent(
            event,
            assistantMessageId,
            reasoningMap,
            toolCallsMap,
            textBlocksMap,
            currentTextId,
            setMessages,
            persistMessages,
          );

          // Track current text block
          if (event.type === "text-start") {
            currentTextId = event.textId;
          } else if (event.type === "text-end") {
            currentTextId = null;
          }
        }

        // Mark as complete
        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, isStreaming: false }
              : msg,
          );
          persistMessages(updated);
          return updated;
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          console.log("[Chat] Stream aborted by user");
          // Mark message as complete when aborted
          setMessages((prev) => {
            const updated = prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, isStreaming: false }
                : msg,
            );
            persistMessages(updated);
            return updated;
          });
        } else {
          console.error("[Chat] Stream error:", err);
          setError(err instanceof Error ? err : new Error(String(err)));

          // Remove incomplete assistant message
          setMessages((prev) => {
            const filtered = prev.filter(
              (msg) => msg.id !== assistantMessageId,
            );
            persistMessages(filtered);
            return filtered;
          });
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [messages, persistMessages],
  );

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    localStorage.removeItem(MESSAGES_STORAGE_KEY);
  }, []);

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    stopGeneration,
    clearMessages,
  };
}

// Helper function to handle AI SDK v6 events
function handleAISDKEvent(
  event: AISDKEvent,
  messageId: string,
  reasoningMap: Map<string, ThinkingBlock>,
  toolCallsMap: Map<string, ToolCall>,
  textBlocksMap: Map<string, string>,
  currentTextId: string | null,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  persistMessages: (msgs: Message[]) => void,
) {
  switch (event.type) {
    case "reasoning-start":
      reasoningMap.set(event.reasoningId, {
        id: event.reasoningId,
        content: "",
        isCollapsed: false,
      });
      break;

    case "reasoning-delta":
      {
        const reasoning = reasoningMap.get(event.reasoningId);
        if (reasoning) {
          reasoning.content += event.delta;
          updateMessage(
            messageId,
            { thinking: Array.from(reasoningMap.values()) },
            setMessages,
            persistMessages,
          );
        }
      }
      break;

    case "reasoning-end":
      {
        const reasoning = reasoningMap.get(event.reasoningId);
        if (reasoning) {
          reasoning.content = event.content;
          updateMessage(
            messageId,
            { thinking: Array.from(reasoningMap.values()) },
            setMessages,
            persistMessages,
          );
        }
      }
      break;

    case "text-start":
      textBlocksMap.set(event.textId, "");
      break;

    case "text-delta":
      {
        const current = textBlocksMap.get(event.textId) || "";
        textBlocksMap.set(event.textId, current + event.delta);

        // Combine all text blocks
        const fullText = Array.from(textBlocksMap.values()).join("");
        updateMessage(
          messageId,
          { content: fullText },
          setMessages,
          persistMessages,
        );
      }
      break;

    case "text-end":
      {
        textBlocksMap.set(event.textId, event.content);
        const fullText = Array.from(textBlocksMap.values()).join("");
        updateMessage(
          messageId,
          { content: fullText },
          setMessages,
          persistMessages,
        );
      }
      break;

    case "tool-call-start":
      toolCallsMap.set(event.toolCallId, {
        id: event.toolCallId,
        name: event.toolName,
        arguments: event.arguments,
        status: "pending",
      });
      updateMessage(
        messageId,
        { toolCalls: Array.from(toolCallsMap.values()) },
        setMessages,
        persistMessages,
      );
      break;

    case "tool-call-delta":
      {
        const toolCall = toolCallsMap.get(event.toolCallId);
        if (toolCall) {
          toolCall.status = event.status;
          if (event.progress) {
            toolCall.progress = event.progress;
          }
          updateMessage(
            messageId,
            { toolCalls: Array.from(toolCallsMap.values()) },
            setMessages,
            persistMessages,
          );
        }
      }
      break;

    case "tool-call-result":
      {
        const toolCall = toolCallsMap.get(event.toolCallId);
        if (toolCall) {
          toolCall.status = event.isError ? "error" : "success";
          toolCall.result = event.result;
          if (event.isError) {
            toolCall.error = event.result;
          }
          if (event.data) {
            toolCall.data = event.data;
          }
          updateMessage(
            messageId,
            { toolCalls: Array.from(toolCallsMap.values()) },
            setMessages,
            persistMessages,
          );
        }
      }
      break;

    case "error":
      console.error("[Chat] Server error:", event.message);
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: `Error: ${event.message}`, isStreaming: false }
            : msg,
        );
        persistMessages(updated);
        return updated;
      });
      break;

    default:
      // message-start and message-end are informational
      break;
  }
}

function updateMessage(
  messageId: string,
  updates: Partial<Message>,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  persistMessages: (msgs: Message[]) => void,
) {
  setMessages((prev) => {
    const updated = prev.map((msg) =>
      msg.id === messageId ? { ...msg, ...updates } : msg,
    );
    // Incremental persistence on every update
    persistMessages(updated);
    return updated;
  });
}
