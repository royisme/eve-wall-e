/**
 * Streaming Chat Types - AI SDK v6 Compatible
 * Based on Vercel AI SDK protocol
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
  data?: any;
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
// AI SDK v6 Event Types
// ============================================

/**
 * AI SDK v6 Protocol Events
 *
 * CRITICAL: All events MUST include an 'id' field
 * Header: x-vercel-ai-ui-message-stream: v1
 */

export type AISDKEventType =
  | "message-start"
  | "text-start"
  | "text-delta"
  | "text-end"
  | "reasoning-start"
  | "reasoning-delta"
  | "reasoning-end"
  | "tool-call-start"
  | "tool-call-delta"
  | "tool-call-result"
  | "message-end"
  | "error";

// Base event with required ID
interface BaseAISDKEvent {
  id: string; // REQUIRED: Unique ID for this event
  type: AISDKEventType;
}

export interface MessageStartEvent extends BaseAISDKEvent {
  type: "message-start";
  messageId: string;
  role: "assistant";
  timestamp: string;
}

export interface TextStartEvent extends BaseAISDKEvent {
  type: "text-start";
  textId: string; // ID for this text block
}

export interface TextDeltaEvent extends BaseAISDKEvent {
  type: "text-delta";
  textId: string; // Must match text-start ID
  delta: string;
}

export interface TextEndEvent extends BaseAISDKEvent {
  type: "text-end";
  textId: string; // Must match text-start ID
  content: string; // Full accumulated text
}

export interface ReasoningStartEvent extends BaseAISDKEvent {
  type: "reasoning-start";
  reasoningId: string;
}

export interface ReasoningDeltaEvent extends BaseAISDKEvent {
  type: "reasoning-delta";
  reasoningId: string;
  delta: string;
}

export interface ReasoningEndEvent extends BaseAISDKEvent {
  type: "reasoning-end";
  reasoningId: string;
  content: string;
}

export interface ToolCallStartEvent extends BaseAISDKEvent {
  type: "tool-call-start";
  toolCallId: string;
  toolName: string;
  arguments: Record<string, any>;
}

export interface ToolCallDeltaEvent extends BaseAISDKEvent {
  type: "tool-call-delta";
  toolCallId: string;
  status: ToolCallStatus;
  progress?: ToolCallProgress;
}

export interface ToolCallResultEvent extends BaseAISDKEvent {
  type: "tool-call-result";
  toolCallId: string;
  result: string;
  isError: boolean;
  data?: any;
}

export interface MessageEndEvent extends BaseAISDKEvent {
  type: "message-end";
  messageId: string;
  finishReason: "stop" | "tool-calls" | "length" | "content-filter" | "error";
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ErrorEvent extends BaseAISDKEvent {
  type: "error";
  code: string;
  message: string;
  retryAfter?: number;
}

export type AISDKEvent =
  | MessageStartEvent
  | TextStartEvent
  | TextDeltaEvent
  | TextEndEvent
  | ReasoningStartEvent
  | ReasoningDeltaEvent
  | ReasoningEndEvent
  | ToolCallStartEvent
  | ToolCallDeltaEvent
  | ToolCallResultEvent
  | MessageEndEvent
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

// ============================================
// Persistence Types
// ============================================

/**
 * Incremental message persistence to avoid data loss
 */
export interface MessageSnapshot {
  id: string;
  role: MessageRole;
  content: string;
  reasoning?: string[];
  toolCalls?: ToolCall[];
  timestamp: string;
  isComplete: boolean;
}
