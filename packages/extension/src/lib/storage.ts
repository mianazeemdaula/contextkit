// Thin typed wrapper around chrome.storage.local. Service workers terminate
// unpredictably, so per the MV3 service-worker guide we never hold state in
// module-level globals — read/write through here.

export async function getLocal<T>(key: string): Promise<T | null> {
  const obj = await chrome.storage.local.get(key);
  const value = obj[key];
  return (value as T | undefined) ?? null;
}

export async function setLocal<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export async function removeLocal(key: string): Promise<void> {
  await chrome.storage.local.remove(key);
}
