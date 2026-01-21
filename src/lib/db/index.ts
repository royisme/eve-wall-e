import { initDB } from "./schema";
import type { JobRecord, ResumeRecord, TailoredResumeRecord, ActionRecord, CacheMetadataRecord } from "./schema";

export async function getAllJobs(): Promise<JobRecord[]> {
  const db = await initDB();
  return db.getAll("jobs");
}

export async function getJob(id: number): Promise<JobRecord | undefined> {
  const db = await initDB();
  return db.get("jobs", id);
}

export async function saveJob(job: JobRecord): Promise<void> {
  const db = await initDB();
  await db.put("jobs", { ...job, syncedAt: new Date().toISOString() });
}

export async function saveJobs(jobs: JobRecord[]): Promise<void> {
  const db = await initDB();
  const tx = db.transaction("jobs", "readwrite");
  await Promise.all([
    ...jobs.map((job) => tx.store.put({ ...job, syncedAt: new Date().toISOString() })),
    tx.done,
  ]);
}

export async function getJobsByStatus(status: string): Promise<JobRecord[]> {
  const db = await initDB();
  const index = db.transaction("jobs", "readonly").store.index("by-status");
  return index.getAll(status);
}

export async function getAllResumes(): Promise<ResumeRecord[]> {
  const db = await initDB();
  return db.getAll("resumes");
}

export async function getResume(id: number): Promise<ResumeRecord | undefined> {
  const db = await initDB();
  return db.get("resumes", id);
}

export async function saveResume(resume: ResumeRecord): Promise<void> {
  const db = await initDB();
  await db.put("resumes", { ...resume, syncedAt: new Date().toISOString() });
}

export async function saveResumes(resumes: ResumeRecord[]): Promise<void> {
  const db = await initDB();
  const tx = db.transaction("resumes", "readwrite");
  await Promise.all([
    ...resumes.map((resume) => tx.store.put({ ...resume, syncedAt: new Date().toISOString() })),
    tx.done,
  ]);
}

export async function updateResume(id: number, data: Partial<ResumeRecord>): Promise<void> {
  const db = await initDB();
  const existing = await db.get("resumes", id);
  if (!existing) throw new Error(`Resume ${id} not found`);
  await db.put("resumes", { ...existing, ...data, updatedAt: new Date().toISOString() });
}

export async function getAllTailoredResumes(): Promise<TailoredResumeRecord[]> {
  const db = await initDB();
  return db.getAll("tailoredResumes");
}

export async function getTailoredResumesByJobId(jobId: number): Promise<TailoredResumeRecord[]> {
  const db = await initDB();
  const index = db.transaction("tailoredResumes", "readonly").store.index("by-job");
  return index.getAll(jobId);
}

export async function getLatestTailoredResume(jobId: number): Promise<TailoredResumeRecord | undefined> {
  const all = await getTailoredResumesByJobId(jobId);
  if (all.length === 0) return undefined;
  return all.reduce((latest: TailoredResumeRecord, current: TailoredResumeRecord) => {
    if (current.isNew) return current;
    if (current.version > latest.version) return current;
    return latest;
  }, all[0]);
}

export async function saveTailoredResume(resume: TailoredResumeRecord): Promise<void> {
  const db = await initDB();
  await db.put("tailoredResumes", { ...resume, syncedAt: new Date().toISOString() });
}

export async function getAllActions(): Promise<ActionRecord[]> {
  const db = await initDB();
  return db.getAll("actionQueue");
}

export async function queueAction(
  type: ActionRecord["type"],
  payload: unknown
): Promise<number> {
  const db = await initDB();
  return db.add("actionQueue", {
    type,
    payload,
    createdAt: Date.now(),
    status: "pending" as const,
    retryCount: 0,
  });
}

export async function updateActionStatus(
  id: number,
  status: ActionRecord["status"]
): Promise<void> {
  const db = await initDB();
  const existing = await db.get("actionQueue", id);
  if (!existing) throw new Error(`Action ${id} not found`);
  await db.put("actionQueue", { ...existing, status });
}

export async function incrementRetryCount(id: number): Promise<void> {
  const db = await initDB();
  const existing = await db.get("actionQueue", id);
  if (!existing) throw new Error(`Action ${id} not found`);
  await db.put("actionQueue", { ...existing, retryCount: existing.retryCount + 1 });
}

export async function removeAction(id: number): Promise<void> {
  const db = await initDB();
  await db.delete("actionQueue", id);
}

export async function clearActionQueue(): Promise<void> {
  const db = await initDB();
  await db.clear("actionQueue");
}

export async function clearAll(): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(["jobs", "resumes", "tailoredResumes", "actionQueue"], "readwrite");
  await Promise.all([
    tx.objectStore("jobs").clear(),
    tx.objectStore("resumes").clear(),
    tx.objectStore("tailoredResumes").clear(),
    tx.objectStore("actionQueue").clear(),
    tx.done,
  ]);
}

// Generic get/put for settings and other simple stores
export async function get<T>(storeName: string, key: string): Promise<T | undefined> {
  try {
    await initDB();
    // For settings, we use the jobs store as a workaround since we don't have a dedicated settings store
    // In a real implementation, you'd add a 'settings' store to the schema
    const stored = localStorage.getItem(`wall-e:${storeName}:${key}`);
    return stored ? JSON.parse(stored) : undefined;
  } catch {
    return undefined;
  }
}

export async function put<T extends { id: string }>(storeName: string, data: T): Promise<void> {
  try {
    localStorage.setItem(`wall-e:${storeName}:${data.id}`, JSON.stringify(data));
  } catch (error) {
    console.warn(`Failed to save to ${storeName}:`, error);
  }
}

// ============================================
// Cache Metadata Operations
// ============================================

export async function saveCacheMetadata(key: string, metadata: Omit<CacheMetadataRecord, "key">): Promise<void> {
  const db = await initDB();
  await db.put("cache", { key, ...metadata });
}

export async function getCacheMetadata(key: string): Promise<CacheMetadataRecord | undefined> {
  const db = await initDB();
  return db.get("cache", key);
}

export async function deleteCacheMetadata(key: string): Promise<void> {
  const db = await initDB();
  await db.delete("cache", key);
}

export async function clearAllCacheMetadata(): Promise<void> {
  const db = await initDB();
  await db.clear("cache");
}
