/**
 * SSE Stream Parser
 * Parses Server-Sent Events from the chat API
 */

import type { SSEEvent } from "./streaming-chat-types";

export class SSEParser {
  private buffer = "";

  /**
   * Parse a chunk of SSE data
   * @param chunk - Raw text chunk from the stream
   * @returns Array of parsed events
   */
  parse(chunk: string): SSEEvent[] {
    this.buffer += chunk;
    const events: SSEEvent[] = [];
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
            const parsed = JSON.parse(currentEvent.data) as SSEEvent;
            events.push(parsed);
          } catch (e) {
            console.error("[SSEParser] Failed to parse event:", currentEvent.data, e);
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
 * Stream a chat request and yield events
 */
export async function* streamChat(
  url: string,
  request: any,
  token: string,
  signal?: AbortSignal
): AsyncGenerator<SSEEvent, void, unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-eve-token": token,
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chat API error: ${response.status} - ${error}`);
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
