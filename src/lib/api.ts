const DEFAULT_PORT = 3033;

type StorageResult = { serverPort?: string };

async function getBaseUrl(): Promise<string> {
  if (typeof chrome !== "undefined" && chrome.storage) {
    return new Promise((resolve) => {
      chrome.storage.local.get(["serverPort"], (result: StorageResult) => {
        const port = result.serverPort || DEFAULT_PORT;
        resolve(`http://localhost:${port}`);
      });
    });
  }
  return `http://localhost:${DEFAULT_PORT}`;
}

export interface ChatRequest {
  prompt: string;
  agentName?: string;
}

export interface ChatResponse {
  response: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  agent: {
    tools: string[];
  };
}

export interface CapabilityInfo {
  name: string;
  description: string;
  tools: string[];
}

export interface AgentStatusResponse {
  core: string;
  capabilities: CapabilityInfo[];
}

export async function chat(request: ChatRequest): Promise<ChatResponse> {
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(`Eve API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function getHealth(): Promise<HealthResponse> {
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/health`);

  if (!res.ok) {
    throw new Error(`Eve API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function getAgentStatus(): Promise<AgentStatusResponse> {
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/agent/status`);

  if (!res.ok) {
    throw new Error(`Eve API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export const eveApi = {
  chat,
  getHealth,
  getAgentStatus,
};

export default eveApi;
