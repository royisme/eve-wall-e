import { initDB, type WallEDB } from "./schema";
import type { JobRecord, ResumeRecord, TailoredResumeRecord, ActionRecord } from "./schema";

// Generic type for store names
type StoreName = "jobs" | "resumes" | "tailoredResumes" | "actionQueue";

// Generic CRUD operations
async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await initDB();
  return db.getAll(storeName);
}

async function get<T>(storeName: StoreName, id: number): Promise<T | undefined> {
  const db = await initDB();
  return db.get(storeName, id);
}

async function put<T>(storeName: StoreName, data: T): Promise<void> {
  const db = await initDB();
  await db.put(storeName, data);
}

async function deleteRecord(storeName: StoreName, id: number): Promise<void> {
  const db = await initDB();
  await db.delete(storeName, id);
}

async function clear(storeName: StoreName): Promise<void> {
  const db = await initDB();
  await db.clear(storeName);
}

// Job-specific operations
export async function getAllJobs(): Promise<JobRecord[]> {
  return getAll<JobRecord>("jobs");
}

export async function getJob(id: number): Promise<JobRecord | undefined> {
  return get<JobRecord>("jobs", id);
}

export async function saveJob(job: JobRecord): Promise<void> {
  await put("jobs", { ...job, syncedAt: new Date().toISOString() });
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

// Resume-specific operations
export async function getAllResumes(): Promise<ResumeRecord[]> {
  return getAll<ResumeRecord>("resumes");
}

export async function getResume(id: number): Promise<ResumeRecord | undefined> {
  return get<ResumeRecord>("resumes", id);
}

export async function saveResume(resume: ResumeRecord): Promise<void> {
  await put("resumes", { ...resume, syncedAt: new Date().toISOString() });
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
  await put("resumes", { ...existing, ...data, updatedAt: new Date().toISOString() });
}

// Tailored Resume operations
export async function getAllTailoredResumes(): Promise<TailoredResumeRecord[]> {
  return getAll<TailoredResumeRecord>("tailoredResumes");
}

export async function getTailoredResumesByJobId(jobId: number): Promise<TailoredResumeRecord[]> {
  const db = await initDB();
  const index = db.transaction("tailoredResumes", "readonly").store.index("by-job");
  return index.getAll(jobId);
}

export async function getLatestTailoredResume(jobId: number): Promise<TailoredResumeRecord | undefined> {
  const db = await initDB();
  const all = await getTailoredResumesByJobId(jobId);
  // Return the one with highest version or newest flag
  return all.reduce((latest, current) => {
    if (current.isNew) return current;
    if (!latest || current.version > latest.version) return current;
    return latest;
  }, undefined);
}

export async function saveTailoredResume(resume: TailoredResumeRecord): Promise<void> {
  await put("tailoredResumes", { ...resume, syncedAt: new Date().toISOString() });
}

// Action Queue operations
export async function getAllActions(): Promise<ActionRecord[]> {
  return getAll<ActionRecord>("actionQueue");
}

export async function queueAction(
  type: ActionRecord["type"],
  payload: unknown
): Promise<ActionRecord> {
  const db = await initDB();
  const id = await db.add("actionQueue", {
    type,
    payload,
    createdAt: Date.now(),
    status: "pending" as ActionRecord["status"],
    retryCount: 0,
  });
  return id;
}

export async function updateActionStatus(
  id: number,
  status: ActionRecord["status"]
): Promise<void> {
  const db = await initDB();
  const existing = await db.get("actionQueue", id);
  if (!existing) throw new Error(`Action ${id} not found`);
  await put("actionQueue", { ...existing, status });
}

export async function incrementRetryCount(id: number): Promise<void> {
  const db = await initDB();
  const existing = await db.get("actionQueue", id);
  if (!existing) throw new Error(`Action ${id} not found`);
  await put("actionQueue", { ...existing, retryCount: existing.retryCount + 1 });
}

export async function removeAction(id: number): Promise<void> {
  await deleteRecord("actionQueue", id);
}

export async function clearActionQueue(): Promise<void> {
  await clear("actionQueue");
}

// Utility: Clear all data
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
