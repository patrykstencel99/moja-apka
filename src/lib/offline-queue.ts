const DB_NAME = 'patternfinder-offline';
const STORE = 'checkins';
const VERSION = 1;

export type QueuedCheckIn = {
  clientEventId: string;
  payload: {
    localDate?: string;
    mood: number;
    energy: number;
    journal?: string;
    values: Array<{
      activityId: string;
      booleanValue?: boolean;
      numericValue?: number;
    }>;
    timestamp: string;
    clientEventId: string;
  };
  createdAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'clientEventId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueCheckIn(item: QueuedCheckIn): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuedCheckIns(): Promise<QueuedCheckIn[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => {
      const list = (request.result as QueuedCheckIn[]) ?? [];
      list.sort((a, b) => a.createdAt - b.createdAt);
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function removeQueuedCheckIn(clientEventId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(clientEventId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function flushQueuedCheckIns(): Promise<{ sent: number; failed: number }> {
  const queued = await getQueuedCheckIns();
  let sent = 0;
  let failed = 0;

  for (const item of queued) {
    try {
      const response = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload)
      });

      if (!response.ok) {
        failed += 1;
        continue;
      }

      await removeQueuedCheckIn(item.clientEventId);
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  return { sent, failed };
}
