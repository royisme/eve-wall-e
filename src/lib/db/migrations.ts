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
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("wall-e-db");

    request.onsuccess = () => {
      const db = request.result;
      const version = db.version || 1;
      db.close();
      resolve(version);
    };

    request.onupgradeneeded = () => {
      resolve(request.result?.version || 1);
    };

    request.onerror = () => {
      reject(new Error("Failed to get database version"));
    };
  });
}
