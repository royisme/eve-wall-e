const DEFAULT_PORT = 3033;

type StorageResult = { serverPort?: string; authToken?: string };

async function getAuthToken(): Promise<string | null> {
  if (typeof chrome !== "undefined" && chrome.storage) {
    return new Promise((resolve) => {
      chrome.storage.local.get(["authToken"], (result: StorageResult) => {
        resolve(result.authToken || null);
      });
    });
  }
  return null;
}

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

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };
  
  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Eve API error: ${response.status} - ${error}`);
  }
  
  return response;
}

// ============================================
// Types
// ============================================

export type JobStatus = "inbox" | "applied" | "interviewing" | "offer" | "rejected" | "skipped";

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
    applyRate: number;      // applied / inbox
    interviewRate: number;  // interview / applied
    offerRate: number;       // offer / interview
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
  const res = await fetchWithAuth(`${baseUrl}/chat`, {
    method: "POST",
    body: JSON.stringify(request),
  });
  return res.json();
}

export async function getHealth(): Promise<HealthResponse> {
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/health`);
  if (!res.ok) throw new Error(`Eve API error: ${res.status}`);
  return res.json();
}

export async function getAgentStatus(): Promise<AgentStatusResponse> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/agent/status`);
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
  
  const res = await fetchWithAuth(`${baseUrl}/jobs?${query}`);
  return res.json();
}

export async function getJobStats(): Promise<JobStats> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/jobs/stats`);
  return res.json();
}

export async function updateJob(id: number, data: { status?: JobStatus; starred?: boolean }): Promise<{ job: Job }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/jobs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function starJob(id: number, starred: boolean): Promise<{ job: Job }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/jobs/${id}/star`, {
    method: "POST",
    body: JSON.stringify({ starred }),
  });
  return res.json();
}

export async function syncJobs(onProgress?: (synced: number, total: number) => void): Promise<{ synced: number; newJobs: number }> {
  const baseUrl = await getBaseUrl();
  const token = await getAuthToken();
  
  return new Promise((resolve, reject) => {
    const eventSource = new EventSource(`${baseUrl}/jobs/sync?token=${token}`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.status === 'processing' && data.synced !== undefined && data.total !== undefined) {
        if (onProgress) onProgress(data.synced, data.total);
      } else if (data.status === 'complete') {
        eventSource.close();
        resolve({ synced: data.synced || 0, newJobs: data.newJobs || 0 });
      } else if (data.status === 'error') {
        eventSource.close();
        reject(new Error(data.message || "Sync failed"));
      }
    };
    
    eventSource.onerror = () => {
      eventSource.close();
      reject(new Error("Sync connection failed"));
    };
  });
}

// Resumes API
export async function getResumes(): Promise<{ resumes: Resume[] }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/resumes`);
  return res.json();
}

export async function createResume(data: {
  name: string;
  content: string;
  format: "markdown" | "pdf";
  filename?: string;
}): Promise<{ resume: Resume }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/resumes`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getResume(id: number): Promise<{ resume: Resume }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/resumes/${id}`);
  return res.json();
}

export async function updateResume(id: number, data: { name?: string; content?: string }): Promise<{ resume: Resume }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/resumes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteResume(id: number): Promise<{ success: boolean }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/resumes/${id}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function setDefaultResume(id: number): Promise<{ resume: Resume }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/resumes/${id}/default`, {
    method: "POST",
  });
  return res.json();
}

// Tailor API
export async function tailorResume(jobId: number, resumeId: number, forceNew = false): Promise<TailoredResume> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/tailor/${jobId}`, {
    method: "POST",
    body: JSON.stringify({ resumeId, forceNew }),
  });
  return res.json();
}

export async function getTailoredVersions(jobId: number, resumeId?: number): Promise<{ versions: TailoredResume[] }> {
  const baseUrl = await getBaseUrl();
  const query = new URLSearchParams();
  if (resumeId) query.set("resumeId", String(resumeId));
  
  const res = await fetchWithAuth(`${baseUrl}/tailor/${jobId}?${query}`);
  return res.json();
}

export async function updateTailoredResume(id: number, content: string): Promise<{ tailoredResume: TailoredResume }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/tailor/${id}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
  return res.json();
}

// Job Detail & Analysis API
export async function getJobDetail(id: number, params?: { resumeId?: number }): Promise<JobDetailResponse> {
  const baseUrl = await getBaseUrl();
  const query = new URLSearchParams();
  if (params?.resumeId) query.set("resumeId", String(params.resumeId));
  
  const res = await fetchWithAuth(`${baseUrl}/jobs/${id}?${query}`);
  return res.json();
}

export async function analyzeJob(jobId: number, resumeId: number, forceRefresh = false): Promise<{ analysis: JobAnalysis }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/jobs/${jobId}/analyze`, {
    method: "POST",
    body: JSON.stringify({ resumeId, forceRefresh }),
  });
  return res.json();
}

export async function getJobAnalysis(jobId: number, resumeId: number): Promise<{ analysis: JobAnalysis | null }> {
  const baseUrl = await getBaseUrl();
  const query = new URLSearchParams();
  query.set("resumeId", String(resumeId));
  
  const res = await fetchWithAuth(`${baseUrl}/jobs/${jobId}/analysis?${query}`);
  return res.json();
}

export async function getJobPrescore(jobId: number, resumeId: number): Promise<{ score: number; keywords: string[] }> {
  const baseUrl = await getBaseUrl();
  const query = new URLSearchParams();
  query.set("resumeId", String(resumeId));

  const res = await fetchWithAuth(`${baseUrl}/jobs/${jobId}/prescore?${query}`);
  return res.json();
}

// ============================================
// Resume Status & Versions
// ============================================

export async function getResumeStatus(id: number): Promise<ResumeStatus> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/resumes/${id}/status`);
  return res.json();
}

export async function getResumeVersions(id: number): Promise<ResumeVersionsResponse> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/resumes/${id}/versions`);
  return res.json();
}

// ============================================
// PDF Upload (frontend-generated)
// ============================================

export async function uploadTailoredPdf(
  tailoredResumeId: number,
  file: Blob,
  filename: string
): Promise<PdfUploadResponse> {
  const baseUrl = await getBaseUrl();
  const form = new FormData();
  form.append("file", file, filename);
  const res = await fetchWithAuth(`${baseUrl}/resumes/tailored/${tailoredResumeId}/pdf`, {
    method: "POST",
    body: form,
  });
  return res.json();
}

// ============================================
// Analytics
// ============================================

export async function getFunnelMetrics(
  period: AnalyticsPeriod = "all"
): Promise<FunnelMetrics> {
  const baseUrl = await getBaseUrl();
  const query = period ? `?period=${period}` : "";
  const res = await fetchWithAuth(`${baseUrl}/analytics/funnel${query}`);
  return res.json();
}

export async function getSkillInsights(): Promise<SkillInsights> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/analytics/skills`);
  return res.json();
}

// ============================================
// Manual Job Creation
// ============================================

export async function createJob(data: CreateJobRequest): Promise<{ job: Job }> {
  const baseUrl = await getBaseUrl();
  const res = await fetchWithAuth(`${baseUrl}/jobs`, {
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
