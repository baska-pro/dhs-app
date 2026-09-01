export const createSyncKey = (): string => {
  if (globalThis.crypto?.getRandomValues) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    return `dhs_${Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')}`;
  }
  return `dhs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
};

export const normalizeSyncKey = (value: string): string => {
  const clean = value.trim();
  return /^[A-Za-z0-9_-]{8,128}$/.test(clean) ? clean : '';
};
