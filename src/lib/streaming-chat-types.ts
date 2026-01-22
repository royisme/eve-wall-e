/**
 * Streaming Chat Types
 * Based on Claude Code streaming model with SSE
 */

// ============================================
// Core Message Types
// ============================================

export type MessageRole = "user" | "assistant";

export interface ThinkingBlock {
  id: string;
  content: string;
  isCollapsed: boolean;
}

export interface ToolCallProgress {
  current?: number;
  total?: number;
  message?: string;
}

export type ToolCallStatus = "pending" | "running" | "success" | "error";

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  status: ToolCallStatus;
  result?: string;
  error?: string;
  progress?: ToolCallProgress;
  data?: any; // Structured data from tool execution
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  thinking?: ThinkingBlock[];
  toolCalls?: ToolCall[];
  timestamp: Date;
  isStreaming?: boolean;
}

// ============================================
// Request Types
// ============================================

export interface DetectedJob {
  title: string;
  company: string;
  url: string;
}

export interface ChatContext {
  jobId?: number;
  resumeId?: number;
  detectedJob?: DetectedJob;
  selectedJobs?: number[];
}

export interface ChatOptions {
  showThinking?: boolean;
  stream?: boolean;
}

export interface ChatRequest {
  messages: Array<{
    role: MessageRole;
    content: string;
    timestamp: string;
  }>;
  context?: ChatContext;
  options?: ChatOptions;
}

// ============================================
// SSE Event Types
// ============================================

export type SSEEventType =
  | "message_start"
  | "thinking_start"
  | "thinking_delta"
  | "thinking_done"
  | "tool_calls"
  | "tool_call_delta"
  | "tool_result"
  | "content_delta"
  | "message_done"
  | "error";

export interface MessageStartEvent {
  type: "message_start";
  messageId: string;
  role: "assistant";
  timestamp: string;
}

export interface ThinkingStartEvent {
  type: "thinking_start";
  thinkingId: string;
}

export interface ThinkingDeltaEvent {
  type: "thinking_delta";
  thinkingId: string;
  delta: string;
}

export interface ThinkingDoneEvent {
  type: "thinking_done";
  thinkingId: string;
  content: string;
}

export interface ToolCallsEvent {
  type: "tool_calls";
  toolCalls: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string; // JSON string
    };
  }>;
}

export interface ToolCallDeltaEvent {
  type: "tool_call_delta";
  toolCallId: string;
  status: ToolCallStatus;
  progress?: ToolCallProgress;
}

export interface ToolResultEvent {
  type: "tool_result";
  toolCallId: string;
  result: string;
  isError: boolean;
  data?: any;
}

export interface ContentDeltaEvent {
  type: "content_delta";
  delta: string;
}

export interface MessageDoneEvent {
  type: "message_done";
  messageId: string;
  finishReason: "stop" | "tool_calls" | "length" | "content_filter" | "error";
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ErrorEvent {
  type: "error";
  code: string;
  message: string;
  retryAfter?: number;
}

export type SSEEvent =
  | MessageStartEvent
  | ThinkingStartEvent
  | ThinkingDeltaEvent
  | ThinkingDoneEvent
  | ToolCallsEvent
  | ToolCallDeltaEvent
  | ToolResultEvent
  | ContentDeltaEvent
  | MessageDoneEvent
  | ErrorEvent;

// ============================================
// Tool Types
// ============================================

export interface Tool {
  name: string;
  displayName: string;
  description: string;
  icon?: string;
}

export interface ToolsResponse {
  status: string;
  model?: string;
  tools: Tool[];
}
