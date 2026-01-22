import { endpoints, buildUrl } from "./endpoints";
import { getAuthToken, getServerUrl } from "./auth";

const AUTH_HEADER = "x-eve-token";

export { getAuthToken };

export function getBaseUrl(): Promise<string> {
  return getServerUrl();
}

async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await getAuthToken();
  const headers: Record<string, string> = { [AUTH_HEADER]: token };

  // Don't set Content-Type for FormData - let browser set it with boundary
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const mergedHeaders = {
    ...headers,
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, { ...options, headers: mergedHeaders });

  // Handle auth errors globally - dispatch event for app to handle
  if (response.status === 401) {
    window.dispatchEvent(
      new CustomEvent("auth-error", {
        detail: { status: 401, message: "Token invalid" },
      }),
    );
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Eve API error: ${response.status} - ${error}`);
  }

  return response;
}

// ============================================
// Types
// ============================================

export type JobStatus =
  | "inbox"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected"
  | "skipped";

export interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  url: string;
  status: JobStatus;
  matchScore?: number;
  source: "linkedin" | "indeed" | "email" | "manual";
  jdMarkdown?: string;
  createdAt: string;
  appliedAt?: string;
  starred: boolean;
}

export interface JobStats {
  inbox: number;
  applied: number;
  interviewing: number;
  offer: number;
  rejected: number;
  skipped: number;
}

export interface Resume {
  id: number;
  name: string;
  content: string;
  isDefault: boolean;
  useCount: number;
  source: string;
  parseStatus: "success" | "partial" | "failed" | "parsing";
  parseErrors?: string;
  createdAt: string;
  updatedAt: string;
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

export interface AgentStatusResponse {
  core: string;
  capabilities: {
    name: string;
    description: string;
    tools: string[];
  }[];
}

export interface JobAnalysis {
  id: number;
  jobId: number;
  resumeId: number;
  overallScore: number;
  strengths: string[];
  gaps: string[];
  suggestions: string[];
  createdAt: string;
  cached: boolean;
}

export interface JobDetailResponse {
  job: Job;
  analysis?: JobAnalysis;
}

export interface TailoredResume {
  id: number;
  jobId: number;
  resumeId: number;
  content: string;
  suggestions: string[];
  version: number;
  isNew: boolean;
  createdAt: string;
}

// ============================================
// Analytics Types
// ============================================

export type AnalyticsPeriod = "week" | "month" | "all";

export interface FunnelMetrics {
  inbox: number;
  applied: number;
  interview: number;
  offer: number;
  conversionRates: {
    applyRate: number; // applied / inbox
    interviewRate: number; // interview / applied
    offerRate: number; // offer / interview
  };
}

export interface SkillMatch {
  skill: string;
  matchCount: number;
}

export interface SkillGap {
  skill: string;
  mentionCount: number;
  inResume: boolean;
}

export interface SkillInsights {
  top: SkillMatch[];
  gaps: SkillGap[];
}

// ============================================
// PDF Types
// ============================================

export type PdfTemplate = "modern" | "classic" | "minimal";

export interface PdfUploadResponse {
  filename: string;
  size: number;
  url?: string;
}

// ============================================
// Resume Status & Versions
// ============================================

export interface ResumeStatus {
  parse_status: "success" | "partial" | "failed" | "parsing";
  errors?: string[];
}

export interface ResumeVersionsResponse {
  versions: TailoredResume[];
}

// ============================================
// Manual Job Creation
// ============================================

export interface CreateJobRequest {
  title: string;
  company: string;
  url: string;
  location?: string;
  source?: "linkedin" | "indeed" | "email" | "manual";
}

// ============================================
// API Functions
// ============================================

export async function chat(request: ChatRequest): Promise<ChatResponse> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(buildUrl(baseUrl, endpoints.jobs.chat), {
    method: "POST",
    body: JSON.stringify(request),
  });
  return res.json();
}

export async function getHealth(baseUrl?: string): Promise<HealthResponse> {
  const url = baseUrl || (await getBaseUrl());
  const res = await fetch(buildUrl(url, endpoints.health));
  if (!res.ok) throw new Error(`Eve API error: ${res.status}`);
  return res.json();
}

export async function getAgentStatus(): Promise<AgentStatusResponse> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(
    buildUrl(baseUrl, endpoints.jobs.agent.status),
  );
  return res.json();
}

// Jobs API
export async function getJobs(params?: {
  status?: JobStatus;
  starred?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<{ jobs: Job[]; total: number }> {
  const baseUrl = await getBaseUrl();
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.starred) query.set("starred", "true");
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));
  if (params?.search) query.set("search", params.search);

  const res = await fetchWithAuth(
    `${buildUrl(baseUrl, endpoints.jobs.list)}?${query}`,
  );
  return res.json();
}

export async function getJobStats(): Promise<JobStats> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(buildUrl(baseUrl, endpoints.jobs.stats));
  return res.json();
}

export async function updateJob(
  id: number,
  data: { status?: JobStatus; starred?: boolean },
): Promise<{ job: Job }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(buildUrl(baseUrl, endpoints.jobs.byId(id)), {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function starJob(
  id: number,
  starred: boolean,
): Promise<{ job: Job }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(buildUrl(baseUrl, endpoints.jobs.star(id)), {
    method: "POST",
    body: JSON.stringify({ starred }),
  });
  return res.json();
}

export async function syncJobs(
  onProgress?: (synced: number, total: number) => void,
): Promise<{ synced: number; newJobs: number }> {
  const baseUrl = await getBaseUrl();
  const token = await getAuthToken();

  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    let syncedSeen = 0;
    let newJobsSeen = 0;

    fetch(buildUrl(baseUrl, endpoints.jobs.sync), {
      method: "GET",
      headers: token ? { [AUTH_HEADER]: token } : {},
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          controller.abort();
          throw new Error(`Sync failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          controller.abort();
          throw new Error("No response body");
        }

        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // Handle EOF - process any remaining buffer
              if (buffer.trim()) {
                const lines = buffer.split("\n");
                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    try {
                      const data = JSON.parse(line.slice(6));
                      if (data.synced !== undefined) syncedSeen = data.synced;
                      if (data.newJobs !== undefined)
                        newJobsSeen = data.newJobs;
                      if (data.total !== undefined && onProgress) {
                        onProgress(syncedSeen, data.total);
                      }
                    } catch (error) {
                      console.warn(
                        "Failed to parse trailing SSE message:",
                        error,
                      );
                    }
                  }
                }
              }
              // No explicit complete/error received, resolve with last seen values
              controller.abort();
              resolve({ synced: syncedSeen, newJobs: newJobsSeen });
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (
                    data.status === "processing" &&
                    data.synced !== undefined &&
                    data.total !== undefined
                  ) {
                    syncedSeen = data.synced;
                    if (onProgress) onProgress(data.synced, data.total);
                  } else if (data.status === "complete") {
                    controller.abort();
                    resolve({
                      synced: data.synced || syncedSeen,
                      newJobs: data.newJobs || newJobsSeen,
                    });
                    return;
                  } else if (data.status === "error") {
                    controller.abort();
                    reject(new Error(data.message || "Sync failed"));
                    return;
                  }
                } catch (error) {
                  console.warn("Failed to parse SSE message:", error);
                }
              }
            }
          }
        } catch (error) {
          controller.abort();
          throw error;
        }
      })
      .catch((error) => {
        controller.abort();
        reject(new Error(`Sync connection failed: ${error.message}`));
      });
  });
}

// Resumes API
export async function getResumes(): Promise<{ resumes: Resume[] }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(buildUrl(baseUrl, endpoints.jobs.resumes.list));
  return res.json();
}

export async function createResume(data: {
  name: string;
  content: string;
  format: "markdown" | "pdf";
  filename?: string;
}): Promise<{ resume: Resume }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(buildUrl(baseUrl, endpoints.jobs.resumes.create), {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getResume(id: number): Promise<{ resume: Resume }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(
    buildUrl(baseUrl, endpoints.jobs.resumes.byId(id)),
  );
  return res.json();
}

export async function updateResume(
  id: number,
  data: { name?: string; content?: string },
): Promise<{ resume: Resume }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(
    buildUrl(baseUrl, endpoints.jobs.resumes.update(id)),
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
  return res.json();
}

export async function deleteResume(id: number): Promise<{ success: boolean }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(
    buildUrl(baseUrl, endpoints.jobs.resumes.delete(id)),
    {
      method: "DELETE",
    },
  );
  return res.json();
}

export async function setDefaultResume(
  id: number,
): Promise<{ resume: Resume }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(
    buildUrl(baseUrl, endpoints.jobs.resumes.setDefault(id)),
    {
      method: "POST",
    },
  );
  return res.json();
}

// Tailor API
export async function tailorResume(
  jobId: number,
  resumeId: number,
  forceNew = false,
): Promise<TailoredResume> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(
    buildUrl(baseUrl, endpoints.jobs.tailor.create(jobId)),
    {
      method: "POST",
      body: JSON.stringify({ resumeId, forceNew }),
    },
  );
  return res.json();
}

export async function getTailoredVersions(
  jobId: number,
  resumeId?: number,
): Promise<{ versions: TailoredResume[] }> {
  const baseUrl = await getBaseUrl();
  const query = new URLSearchParams();
  if (resumeId) query.set("resumeId", String(resumeId));

  const res = await fetchWithAuth(
    `${buildUrl(baseUrl, endpoints.jobs.tailor.get(jobId))}?${query}`,
  );
  return res.json();
}

export async function updateTailoredResume(
  id: number,
  content: string,
): Promise<{ tailoredResume: TailoredResume }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(
    buildUrl(baseUrl, endpoints.jobs.tailor.update(id)),
    {
      method: "PUT",
      body: JSON.stringify({ content }),
    },
  );
  return res.json();
}

// Job Detail & Analysis API
export async function getJobDetail(
  id: number,
  params?: { resumeId?: number },
): Promise<JobDetailResponse> {
  const baseUrl = await getBaseUrl();
  const query = new URLSearchParams();
  if (params?.resumeId) query.set("resumeId", String(params.resumeId));

  const res = await fetchWithAuth(
    `${buildUrl(baseUrl, endpoints.jobs.byId(id))}?${query}`,
  );
  return res.json();
}

export async function analyzeJob(
  jobId: number,
  resumeId: number,
  forceRefresh = false,
): Promise<{ analysis: JobAnalysis }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(
    buildUrl(baseUrl, endpoints.jobs.analyze(jobId)),
    {
      method: "POST",
      body: JSON.stringify({ resumeId, forceRefresh }),
    },
  );
  return res.json();
}

export async function getJobAnalysis(
  jobId: number,
  resumeId: number,
): Promise<{ analysis: JobAnalysis | null }> {
  const baseUrl = await getBaseUrl();
  const query = new URLSearchParams();
  query.set("resumeId", String(resumeId));

  const res = await fetchWithAuth(
    `${buildUrl(baseUrl, endpoints.jobs.analysis(jobId))}?${query}`,
  );
  return res.json();
}

export async function getJobPrescore(
  jobId: number,
  resumeId: number,
): Promise<{ score: number; keywords: string[] }> {
  const baseUrl = await getBaseUrl();
  const query = new URLSearchParams();
  query.set("resumeId", String(resumeId));

  const res = await fetchWithAuth(
    `${buildUrl(baseUrl, endpoints.jobs.prescore(jobId))}?${query}`,
  );
  return res.json();
}

// ============================================
// Resume Status & Versions
// ============================================

export async function getResumeStatus(id: number): Promise<ResumeStatus> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(
    buildUrl(baseUrl, endpoints.jobs.resumes.status(id)),
  );
  return res.json();
}

export async function getResumeVersions(
  id: number,
): Promise<ResumeVersionsResponse> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(
    buildUrl(baseUrl, endpoints.jobs.resumes.versions(id)),
  );
  return res.json();
}

// ============================================
// PDF Upload (frontend-generated)
// ============================================

export async function uploadTailoredPdf(
  tailoredResumeId: number,
  file: Blob,
  filename: string,
): Promise<PdfUploadResponse> {
  const baseUrl = await getBaseUrl();
  const form = new FormData();
  form.append("file", file, filename);
  const res = await fetchWithAuth(
    buildUrl(baseUrl, endpoints.jobs.tailor.uploadPdf(tailoredResumeId)),
    {
      method: "POST",
      body: form,
    },
  );
  return res.json();
}

// ============================================
// Analytics
// ============================================

export async function getFunnelMetrics(
  period: AnalyticsPeriod = "all",
): Promise<FunnelMetrics> {
  const baseUrl = await getBaseUrl();
  const query = period ? `?period=${period}` : "";
  const res = await fetchWithAuth(
    `${buildUrl(baseUrl, endpoints.jobs.analytics.funnel)}${query}`,
  );
  return res.json();
}

export async function getSkillInsights(): Promise<SkillInsights> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(
    buildUrl(baseUrl, endpoints.jobs.analytics.skills),
  );
  return res.json();
}

// ============================================
// Manual Job Creation
// ============================================

export async function createJob(data: CreateJobRequest): Promise<{ job: Job }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(buildUrl(baseUrl, endpoints.jobs.list), {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export const eveApi = {
  // Chat & Health
  chat,
  getHealth,
  getAgentStatus,
  // Jobs
  getJobs,
  getJobStats,
  getJobDetail,
  getJobAnalysis,
  analyzeJob,
  getJobPrescore,
  updateJob,
  starJob,
  syncJobs,
  createJob,
  // Resumes
  getResumes,
  createResume,
  getResume,
  getResumeStatus,
  getResumeVersions,
  updateResume,
  deleteResume,
  setDefaultResume,
  // Tailor
  tailorResume,
  getTailoredVersions,
  updateTailoredResume,
  uploadTailoredPdf,
  // Analytics
  getFunnelMetrics,
  getSkillInsights,
};

export default eveApi;
