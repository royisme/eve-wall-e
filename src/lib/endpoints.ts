/**
 * Centralized API endpoint definitions for Eve API
 *
 * This file contains all API endpoint paths used throughout the application.
 * By centralizing these definitions, we:
 * - Make it easier to maintain and update API paths
 * - Reduce duplication and potential typos
 * - Provide a single source of truth for the API structure
 */

export const endpoints = {
  // ============================================
  // Authentication & Health
  // ============================================
  health: "/health",
  auth: {
    verify: "/auth/verify",
    pair: "/auth/pair",
  },

  // ============================================
  // Jobs - All Wall-E functionality under /jobs namespace
  // ============================================
  jobs: {
    // Chat
    chat: "/jobs/chat",
    chatStop: "/jobs/chat/stop",
    chatHistory: "/jobs/chat/history",

    // Job Management
    list: "/jobs",
    create: "/jobs",
    stats: "/jobs/stats",
    sync: "/jobs/sync",
    ingest: "/jobs/ingest",
    byId: (id: number) => `/jobs/${id}`,
    update: (id: number) => `/jobs/${id}`,
    delete: (id: number) => `/jobs/${id}`,
    star: (id: number) => `/jobs/${id}/star`,
    analyze: (id: number) => `/jobs/${id}/analyze`,
    analysis: (id: number) => `/jobs/${id}/analysis`,
    prescore: (id: number) => `/jobs/${id}/prescore`,

    // Resumes
    resumes: {
      list: "/jobs/resumes",
      create: "/jobs/resumes",
      byId: (id: number) => `/jobs/resumes/${id}`,
      update: (id: number) => `/jobs/resumes/${id}`,
      delete: (id: number) => `/jobs/resumes/${id}`,
      setDefault: (id: number) => `/jobs/resumes/${id}/set-default`,
      status: (id: number) => `/jobs/resumes/${id}/status`,
      versions: (id: number) => `/jobs/resumes/${id}/versions`,
    },

    // Tailored Resumes
    tailor: {
      create: (jobId: number) => `/jobs/tailor/${jobId}`,
      versions: (jobId: number) => `/jobs/tailor/${jobId}/versions`,
      pdf: (jobId: number) => `/jobs/tailor/${jobId}/pdf`,
      update: (id: number) => `/jobs/tailor/${id}`,
      uploadPdf: (tailoredResumeId: number) =>
        `/jobs/tailor/${tailoredResumeId}/pdf`,
    },

    // Tools & Agent
    tools: "/jobs/tools",
    agent: {
      status: "/jobs/agent/status",
    },

    // Analytics
    analytics: {
      funnel: "/jobs/analytics/funnel",
      skills: "/jobs/analytics/skills",
    },
  },
  
  // ============================================
  // Email
  // ============================================
  email: {
    status: "/email/status",
  },
} as const;

/**
 * Helper function to build full URL from base URL and endpoint
 * @param baseUrl - The base URL of the Eve server
 * @param endpoint - The endpoint path or function
 * @returns The full URL
 */
export function buildUrl(baseUrl: string, endpoint: string): string {
  return `${baseUrl}${endpoint}`;
}
