import Setting from "../models/Setting.js";

// แคชในโปรเซส เพื่อไม่ให้เส้นทางที่ถูกเรียกบ่อย (เช่น การคำนวณระดับในทุกสรุปคะแนน)
// ต้องไปถาม Mongo ทุกครั้ง — การเปลี่ยนของแอดมินยังมีผลภายใน
// TTL นี้
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
