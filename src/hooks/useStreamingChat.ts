/**
 * useStreamingChat Hook
 * Manages streaming chat state and handles SSE events
 */

import { useState, useCallback, useRef } from "react";
import { streamChat } from "@/lib/sse-parser";
import { getAuthToken, getServerUrl } from "@/lib/auth";
import { buildUrl, endpoints } from "@/lib/endpoints";
import type {
  Message,
  ChatRequest,
  ChatContext,
  ThinkingBlock,
  ToolCall,
  SSEEvent,
} from "@/lib/streaming-chat-types";

export function useStreamingChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string, context?: ChatContext) => {
      // Add user message
      const userMessage: Message = {
        id: `user_${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
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

      setMessages((prev) => [...prev, assistantMessage]);

      // Prepare request
      const request: ChatRequest = {
        messages: [...messages, userMessage].map((msg) => ({
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

        // Track current thinking and tool calls
        const thinkingMap = new Map<string, ThinkingBlock>();
        const toolCallsMap = new Map<string, ToolCall>();
        let contentBuffer = "";

        for await (const event of streamChat(
          url,
          request,
          token,
          abortControllerRef.current.signal
        )) {
          handleSSEEvent(
            event,
            assistantMessageId,
            thinkingMap,
            toolCallsMap,
            contentBuffer,
            setMessages
          );
        }

        // Mark as complete
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, isStreaming: false }
              : msg
          )
        );
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          console.log("[Chat] Stream aborted by user");
        } else {
          console.error("[Chat] Stream error:", err);
          setError(err instanceof Error ? err : new Error(String(err)));

          // Remove incomplete assistant message
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== assistantMessageId)
          );
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [messages]
  );

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
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

// Helper function to handle SSE events
function handleSSEEvent(
  event: SSEEvent,
  messageId: string,
  thinkingMap: Map<string, ThinkingBlock>,
  toolCallsMap: Map<string, ToolCall>,
  contentBuffer: string,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) {
  switch (event.type) {
    case "thinking_start":
      thinkingMap.set(event.thinkingId, {
        id: event.thinkingId,
        content: "",
        isCollapsed: false,
      });
      break;

    case "thinking_delta":
      {
        const thinking = thinkingMap.get(event.thinkingId);
        if (thinking) {
          thinking.content += event.delta;
          updateMessage(messageId, { thinking: Array.from(thinkingMap.values()) }, setMessages);
        }
      }
      break;

    case "thinking_done":
      {
        const thinking = thinkingMap.get(event.thinkingId);
        if (thinking) {
          thinking.content = event.content;
          updateMessage(messageId, { thinking: Array.from(thinkingMap.values()) }, setMessages);
        }
      }
      break;

    case "tool_calls":
      for (const tc of event.toolCalls) {
        let args: Record<string, any> = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          console.error("[Chat] Failed to parse tool arguments:", tc.function.arguments);
        }

        toolCallsMap.set(tc.id, {
          id: tc.id,
          name: tc.function.name,
          arguments: args,
          status: "pending",
        });
      }
      updateMessage(messageId, { toolCalls: Array.from(toolCallsMap.values()) }, setMessages);
      break;

    case "tool_call_delta":
      {
        const toolCall = toolCallsMap.get(event.toolCallId);
        if (toolCall) {
          toolCall.status = event.status;
          if (event.progress) {
            toolCall.progress = event.progress;
          }
          updateMessage(messageId, { toolCalls: Array.from(toolCallsMap.values()) }, setMessages);
        }
      }
      break;

    case "tool_result":
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
          updateMessage(messageId, { toolCalls: Array.from(toolCallsMap.values()) }, setMessages);
        }
      }
      break;

    case "content_delta":
      contentBuffer += event.delta;
      updateMessage(messageId, { content: contentBuffer }, setMessages);
      break;

    case "error":
      console.error("[Chat] Server error:", event.message);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: `错误: ${event.message}`, isStreaming: false }
            : msg
        )
      );
      break;

    default:
      // message_start and message_done are informational
      break;
  }
}

function updateMessage(
  messageId: string,
  updates: Partial<Message>,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) {
  setMessages((prev) =>
    prev.map((msg) =>
      msg.id === messageId ? { ...msg, ...updates } : msg
    )
  );
}
