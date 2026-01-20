import * as db from "@/lib/db";
import type { Job, Resume, TailoredResume } from "@/lib/api";
import type { JobRecord, ResumeRecord, TailoredResumeRecord } from "@/lib/db/schema";

type CacheStrategy = "cache-first" | "network-first" | "network-only";

interface CacheOptions {
  maxAge?: number; // TTL in milliseconds
  strategy?: CacheStrategy;
}

interface CacheMetadata {
  lastFetched: number;
}

// Convert API types to DB records
function jobToRecord(job: Job): JobRecord {
  return {
    ...job,
    syncedAt: new Date().toISOString(),
  };
}

function resumeToRecord(resume: Resume): ResumeRecord {
  return {
    ...resume,
    syncedAt: new Date().toISOString(),
  };
}

function tailoredToRecord(tailored: TailoredResume): TailoredResumeRecord {
  return {
    ...tailored,
    syncedAt: new Date().toISOString(),
  };
}

// Cache-first wrapper for API calls
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { maxAge = 5 * 60 * 1000, strategy = "cache-first" } = options; // Default 5 min TTL

  // Network-only: always fetch from server
  if (strategy === "network-only") {
    return fetcher();
  }

  // Try to get from cache
  const cached = await getCacheEntry(key);
  const isStale = cached
    ? Date.now() - (cached.metadata?.lastFetched || 0) > maxAge
    : true;

  if (strategy === "cache-first" && cached && !isStale) {
    // Return cached data
    return cached.data as T;
  }

  if (strategy === "network-first" || isStale) {
    try {
      // Try to fetch from network
      const data = await fetcher();
      await setCacheEntry(key, data);
      return data;
    } catch (error) {
      // If network fails and we have cached data, return it
      if (cached) {
        console.warn(`Network failed, using cached data for ${key}`);
        return cached.data as T;
      }
      throw error;
    }
  }

  // Fallback to cache
  if (cached) {
    return cached.data as T;
  }

  // No cache, must fetch
  const data = await fetcher();
  await setCacheEntry(key, data);
  return data;
}

// Simple in-memory cache for metadata
const cacheMetadata = new Map<string, CacheMetadata>();

async function getCacheEntry(key: string): Promise<{ data: unknown; metadata?: CacheMetadata } | null> {
  const metadata = cacheMetadata.get(key);

  // Parse cache key to determine store and id
  const [store, id] = key.split(":");

  try {
    switch (store) {
      case "jobs": {
        if (id === "all") {
          const jobs = await db.getAllJobs();
          return jobs.length > 0 ? { data: { jobs }, metadata } : null;
        }
        const job = await db.getJob(parseInt(id, 10));
        return job ? { data: { job }, metadata } : null;
      }
      case "resumes": {
        if (id === "all") {
          const resumes = await db.getAllResumes();
          return resumes.length > 0 ? { data: { resumes }, metadata } : null;
        }
        const resume = await db.getResume(parseInt(id, 10));
        return resume ? { data: { resume }, metadata } : null;
      }
      case "tailored": {
        const versions = await db.getTailoredResumesByJobId(parseInt(id, 10));
        return versions.length > 0 ? { data: { versions }, metadata } : null;
      }
      default:
        return null;
    }
  } catch (error) {
    console.warn(`Cache read error for ${key}:`, error);
    return null;
  }
}

async function setCacheEntry(key: string, data: unknown): Promise<void> {
  const [store, id] = key.split(":");

  cacheMetadata.set(key, { lastFetched: Date.now() });

  try {
    switch (store) {
      case "jobs": {
        const jobsData = data as { jobs?: Job[]; job?: Job };
        if (jobsData.jobs) {
          await db.saveJobs(jobsData.jobs.map(jobToRecord));
        } else if (jobsData.job) {
          await db.saveJob(jobToRecord(jobsData.job));
        }
        break;
      }
      case "resumes": {
        const resumesData = data as { resumes?: Resume[]; resume?: Resume };
        if (resumesData.resumes) {
          await db.saveResumes(resumesData.resumes.map(resumeToRecord));
        } else if (resumesData.resume) {
          await db.saveResume(resumeToRecord(resumesData.resume));
        }
        break;
      }
      case "tailored": {
        const tailoredData = data as { versions?: TailoredResume[] } | TailoredResume;
        if ("versions" in tailoredData && tailoredData.versions) {
          for (const v of tailoredData.versions) {
            await db.saveTailoredResume(tailoredToRecord(v));
          }
        } else if ("id" in tailoredData) {
          await db.saveTailoredResume(tailoredToRecord(tailoredData as TailoredResume));
        }
        break;
      }
    }
  } catch (error) {
    console.warn(`Cache write error for ${key}:`, error);
  }
}

// Invalidate cache entry
export function invalidateCache(key: string): void {
  cacheMetadata.delete(key);
}

// Invalidate all cache entries for a store
export function invalidateCacheByStore(store: string): void {
  for (const key of cacheMetadata.keys()) {
    if (key.startsWith(`${store}:`)) {
      cacheMetadata.delete(key);
    }
  }
}

// Clear all cache metadata
export function clearCacheMetadata(): void {
  cacheMetadata.clear();
}

// Get cache status for debugging
export function getCacheStatus(): { entries: number; keys: string[] } {
  return {
    entries: cacheMetadata.size,
    keys: Array.from(cacheMetadata.keys()),
  };
}
