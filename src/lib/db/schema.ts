import { openDB, type DBSchema } from "idb";

export interface WallEDB extends DBSchema {
  jobs: {
    key: number;
    value: JobRecord;
    indexes: { "by-status": string };
  };
  resumes: {
    key: number;
    value: ResumeRecord;
  };
  tailoredResumes: {
    key: number;
    value: TailoredResumeRecord;
    indexes: { "by-job": number };
  };
  actionQueue: {
    key: number;
    value: ActionRecord;
  };
}

export interface JobRecord {
  id: number;
  title: string;
  company: string;
  location: string;
  url: string;
  status: "inbox" | "applied" | "interviewing" | "offer" | "rejected" | "skipped";
  matchScore?: number;
  source: "linkedin" | "indeed" | "email" | "manual";
  jdMarkdown?: string;
  createdAt: string;
  appliedAt?: string;
  starred: boolean;
  syncedAt?: string;
}

export interface ResumeRecord {
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
  syncedAt?: string;
}

export interface TailoredResumeRecord {
  id: number;
  jobId: number;
  resumeId: number;
  content: string;
  suggestions: string[];
  version: number;
  isNew: boolean;
  createdAt: string;
  syncedAt?: string;
}

export interface ActionRecord {
  id: number;
  type: "updateJob" | "createJob" | "tailorResume" | "deleteJob" | "updateResume";
  payload: unknown;
  createdAt: number;
  status: "pending" | "syncing" | "failed";
  retryCount: number;
}

const DB_NAME = "wall-e-db";
const DB_VERSION = 1;

export async function initDB(): Promise<WallEDB> {
  return openDB<WallEDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Jobs store
      const jobsStore = db.createObjectStore("jobs", { keyPath: "id" });
      jobsStore.createIndex("by-status", "status");

      // Resumes store
      const resumesStore = db.createObjectStore("resumes", { keyPath: "id" });

      // Tailored resumes store
      const tailoredStore = db.createObjectStore("tailoredResumes", { keyPath: "id" });
      tailoredStore.createIndex("by-job", "jobId");

      // Action queue store
      db.createObjectStore("actionQueue", { keyPath: "id", autoIncrement: true });
    },
  });
}
