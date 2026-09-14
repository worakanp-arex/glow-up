import { XMLParser } from "fast-xml-parser";
import User from "../models/User.js";
import { notifyUser } from "./notificationService.js";

const FEED_URL = "https://www.hfocus.org/rss.xml";
const CACHE_TTL_MS = 20 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

const parser = new XMLParser({ ignoreAttributes: false });

let cache = { items: [], fetchedAt: 0 };
// Tracks the newest article already announced, so only genuinely new articles
// notify. Starts null so the very first fetch after a server start just sets
// the baseline instead of notifying everyone about the whole existing feed.
let notifiedLink = null;

const FALLBACK_ARTICLES = [
  {
    id: "fallback-1",
    title: "รู้จัก Craving และวิธีรับมือเมื่อความอยากกลับมา",
    excerpt:
      "อาการอยากเสพซ้ำเป็นเรื่องปกติที่เกิดขึ้นได้ระหว่างการฟื้นฟู การสังเกตสัญญาณล่วงหน้าและมีแผนรับมือช่วยลดความเสี่ยงได้มาก",
    link: "https://www.hfocus.org",
    image: null,
    source: "Hfocus เจาะลึกระบบสุขภาพ",
    publishedAt: null,
  },
  {
    id: "fallback-2",
    title: "การสนับสนุนจากครอบครัวและชุมชน กุญแจสำคัญของการฟื้นฟู",
    excerpt:
      "งานวิจัยหลายชิ้นชี้ว่าผู้ที่มีเครือข่ายสนับสนุนที่เข้มแข็งมีโอกาสกลับไปใช้ชีวิตปกติและคงสภาพการฟื้นฟูได้ยั่งยืนกว่า",
    link: "https://www.hfocus.org",
    image: null,
    source: "Hfocus เจาะลึกระบบสุขภาพ",
    publishedAt: null,
  },
  {
    id: "fallback-3",
    title: "การมีงานทำ ส่งผลต่อสุขภาพจิตและความมั่นคงในชีวิตอย่างไร",
    excerpt:
      "การกลับเข้าสู่ตลาดแรงงานไม่ได้เป็นเพียงเรื่องรายได้ แต่ยังช่วยฟื้นฟูคุณค่าในตนเองและความรู้สึกเป็นส่วนหนึ่งของสังคม",
    link: "https://www.hfocus.org",
    image: null,
    source: "Hfocus เจาะลึกระบบสุขภาพ",
    publishedAt: null,
  },
];

function stripHtml(html) {
  if (typeof html !== "string") return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toHttps(url) {
  return typeof url === "string" ? url.replace(/^http:\/\//, "https://") : url;
}

function extractImage(html) {
  if (typeof html !== "string") return null;
  const match = html.match(/<img[^>]+src="([^"]+)"/);
  return match ? toHttps(match[1]) : null;
}

function buildExcerpt(description, title) {
  const text = stripHtml(description);
  const withoutTitle = title && text.startsWith(title) ? text.slice(title.length) : text;
  const trimmed = withoutTitle.trim();
  if (trimmed.length <= 160) return trimmed;
  return `${trimmed.slice(0, 160).trim()}…`;
}

function normalizeItem(item, index) {
  const title = typeof item.title === "string" ? item.title.trim() : "";
  const description = typeof item.description === "string" ? item.description : "";
  const link = typeof item.link === "string" ? toHttps(item.link.trim()) : "";
  const pubDate = typeof item.pubDate === "string" ? new Date(item.pubDate) : null;

  return {
    id: link || `hfocus-${index}`,
    title,
    excerpt: buildExcerpt(description, title),
    link,
    image: extractImage(description),
    source: "Hfocus เจาะลึกระบบสุขภาพ",
    publishedAt: pubDate && !Number.isNaN(pubDate.getTime()) ? pubDate.toISOString() : null,
  };
}

async function fetchFeed() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(FEED_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`RSS feed responded with ${res.status}`);

    const xml = await res.text();
    const parsed = parser.parse(xml);
    const rawItems = parsed?.rss?.channel?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    return items.map(normalizeItem).filter((item) => item.title && item.link);
  } finally {
    clearTimeout(timeout);
  }
}

async function notifyUsersOfNewArticle(items) {
  const newest = items[0];
  if (!newest?.link) return;

  if (notifiedLink === null) {
    notifiedLink = newest.link; // baseline on first fetch — don't spam existing users
    return;
  }
  if (newest.link === notifiedLink) return;
  notifiedLink = newest.link;

  const recipients = await User.find({ role: "user" }).select("_id");
  await Promise.allSettled(
    recipients.map((recipient) =>
      notifyUser(recipient._id, `มีบทความใหม่: ${newest.title}`, "news", { link: `/#news-${encodeURIComponent(newest.id)}` })
    )
  );
}

export async function getRecoveryNews(limit = 6) {
  const now = Date.now();
  const isStale = now - cache.fetchedAt > CACHE_TTL_MS;

  if (isStale) {
    try {
      const items = await fetchFeed();
      if (items.length > 0) {
        cache = { items, fetchedAt: now };
        notifyUsersOfNewArticle(items).catch(() => {});
      }
    } catch {
      // keep serving the previous cache (or fallback below) if the feed is unreachable
    }
  }

  const source = cache.items.length > 0 ? cache.items : FALLBACK_ARTICLES;
  return source.slice(0, limit);
}
