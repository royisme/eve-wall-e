/**
 * SSE Stream Parser - AI SDK v6 Compatible
 * Parses Server-Sent Events following Vercel AI SDK protocol
 */

import type { AISDKEvent } from "./streaming-chat-types";

export class SSEParser {
  private buffer = "";

  /**
   * Parse a chunk of SSE data
   * @param chunk - Raw text chunk from the stream
   * @returns Array of parsed events
   */
  parse(chunk: string): AISDKEvent[] {
    this.buffer += chunk;
    const events: AISDKEvent[] = [];
    const lines = this.buffer.split("\n");

    // Keep the last incomplete line in buffer
    this.buffer = lines.pop() || "";

    let currentEvent: { type?: string; data?: string } = {};

    for (const line of lines) {
      if (line.startsWith("event:")) {
        currentEvent.type = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        currentEvent.data = line.slice(5).trim();
      } else if (line === "") {
        // Empty line marks end of event
        if (currentEvent.data) {
          try {
            const parsed = JSON.parse(currentEvent.data) as AISDKEvent;

            // Validate required 'id' field
            if (!parsed.id) {
              console.error(
                "[SSEParser] Event missing required 'id' field:",
                parsed,
              );
            } else {
              events.push(parsed);
            }
          } catch (e) {
            console.error(
              "[SSEParser] Failed to parse event:",
              currentEvent.data,
              e,
            );
          }
        }
        currentEvent = {};
      }
    }

    return events;
  }

  /**
   * Reset the parser buffer
   */
  reset() {
    this.buffer = "";
  }
}

/**
 * Stream a chat request and yield AI SDK events
 */
export async function* streamChat(
  url: string,
  request: any,
  token: string,
  signal?: AbortSignal,
): AsyncGenerator<AISDKEvent, void, unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-eve-token": token,
      // CRITICAL: AI SDK v6 requires this header
      Accept: "text/event-stream",
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chat API error: ${response.status} - ${error}`);
  }

  // Validate AI SDK header
  const streamHeader = response.headers.get("x-vercel-ai-ui-message-stream");
  if (streamHeader !== "v1") {
    console.warn(
      "[SSEParser] Expected header 'x-vercel-ai-ui-message-stream: v1', got:",
      streamHeader,
    );
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = new SSEParser();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      const events = parser.parse(chunk);

      for (const event of events) {
        yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
