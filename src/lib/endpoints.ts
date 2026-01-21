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
  // Chat & Agent
  // ============================================
  chat: "/chat",
  agent: {
    status: "/agent/status",
  },

  // ============================================
  // Jobs
  // ============================================
  jobs: {
    list: "/jobs",
    stats: "/jobs/stats",
    sync: "/jobs/sync",
    byId: (id: number) => `/jobs/${id}`,
    star: (id: number) => `/jobs/${id}/star`,
    analyze: (jobId: number) => `/jobs/${jobId}/analyze`,
    analysis: (jobId: number) => `/jobs/${jobId}/analysis`,
    prescore: (jobId: number) => `/jobs/${jobId}/prescore`,
  },

  // ============================================
  // Resumes
  // ============================================
  resumes: {
    list: "/resumes",
    create: "/resumes",
    byId: (id: number) => `/resumes/${id}`,
    update: (id: number) => `/resumes/${id}`,
    delete: (id: number) => `/resumes/${id}`,
    setDefault: (id: number) => `/resumes/${id}/default`,
    status: (id: number) => `/resumes/${id}/status`,
    versions: (id: number) => `/resumes/${id}/versions`,
  },

  // ============================================
  // Tailored Resumes
  // ============================================
  tailor: {
    create: (jobId: number) => `/tailor/${jobId}`,
    get: (jobId: number) => `/tailor/${jobId}`,
    update: (id: number) => `/tailor/${id}`,
    uploadPdf: (tailoredResumeId: number) => `/resumes/tailored/${tailoredResumeId}/pdf`,
  },

  // ============================================
  // Analytics
  // ============================================
  analytics: {
    funnel: "/analytics/funnel",
    skills: "/analytics/skills",
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
