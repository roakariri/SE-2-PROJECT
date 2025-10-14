// Simple catalog cache with in-memory map + sessionStorage persistence
// Use a TTL to avoid stale data lingering too long

const memory = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export function saveCatalogCache(key, payload, ttlMs = DEFAULT_TTL) {
  const record = { data: payload, ts: Date.now(), ttl: ttlMs };
  memory.set(key, record);
  try { sessionStorage.setItem(`catalog:${key}`, JSON.stringify(record)); } catch {}
}

export function loadCatalogCache(key) {
  const now = Date.now();
  const mem = memory.get(key);
  if (mem && now - mem.ts < (mem.ttl ?? DEFAULT_TTL)) return mem.data;
  try {
    const raw = sessionStorage.getItem(`catalog:${key}`);
    if (!raw) return null;
    const rec = JSON.parse(raw);
    if (now - rec.ts < (rec.ttl ?? DEFAULT_TTL)) return rec.data;
  } catch {}
  return null;
}

export function clearCatalogCache(key) {
  memory.delete(key);
  try { sessionStorage.removeItem(`catalog:${key}`); } catch {}
}

export function bucketForProduct(product) {
  const name = (product?.product_types?.product_categories?.name || '').toLowerCase();
  if (name.includes('apparel')) return 'apparel-images';
  if (name.includes('accessories')) return 'accessoriesdecorations-images';
  if (name.includes('signage') || name.includes('poster')) return 'signage-posters-images';
  if (name.includes('cards') || name.includes('sticker')) return 'cards-stickers-images';
  if (name.includes('packaging')) return 'packaging-images';
  if (name.includes('3d print')) return '3d-prints-images';
  return 'apparel-images';
}
