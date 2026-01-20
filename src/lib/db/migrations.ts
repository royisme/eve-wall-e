import { type WallEDB } from "./schema";
import { initDB } from "./schema";

export async function migrate(db: IDBDatabase, oldVersion: number | null, newVersion: number) {
  console.log(`[Migration] v${oldVersion} -> v${newVersion}`);

  // Version 1: Initial schema - no migration needed
  if (newVersion === 1) {
    // All stores are created in initDB(), nothing to migrate
    console.log("[Migration] Initial schema created");
    return;
  }

  // Future migrations would go here
  // Example for v2:
  // if (newVersion === 2 && oldVersion < 2) {
  //   await addNewStore(db);
  // }
}

export async function getCurrentVersion(): Promise<number> {
  return new Promise((resolve) => {
    const request = indexedDB.open("wall-e-db");
    request.onupgradeneeded = () => {
      resolve(request.result?.version || 1);
    };
    request.onerror = () => resolve(1);
  });
}
