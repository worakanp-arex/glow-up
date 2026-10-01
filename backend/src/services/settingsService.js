import Setting from "../models/Setting.js";

// In-process cache so hot paths (e.g. level computation on every points
// summary) don't hit Mongo on every call — admin changes still land within
// this TTL.
const CACHE_TTL_MS = 30_000;
const cache = new Map();

export async function getSetting(key, defaultValue) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const doc = await Setting.findOne({ key });
  const value = doc ? doc.value : defaultValue;
  cache.set(key, { value, at: Date.now() });
  return value;
}

export async function setSetting(key, value) {
  await Setting.findOneAndUpdate({ key }, { key, value }, { upsert: true });
  cache.set(key, { value, at: Date.now() });
}
