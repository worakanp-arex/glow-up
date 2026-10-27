import { sanitizeText } from "../utils/sanitizeText.js";
export const REJECT_MESSAGE = "ข้อความนี้มีถ้อยคำไม่เหมาะสม กรุณาปรับข้อความแล้วลองอีกครั้ง";


const BAD_WORDS = [
  "ควย", "หี", "เหี้ย", "สัส", "สัด", "เย็ด", "ฉิบหาย", "ชิบหาย", "ชิปหาย", "ระยำ", "จัญไร",
  "ตอแหล", "ดอกทอง", "อีดอก", "กะหรี่", "ส้นตีน", "ชาติหมา", "ไอ้สัตว์", "อีสัตว์", "ไอ้เวร", "ไอ้โง่",
  "ไปตายซะ", "ไปตายเถอะ", "พ่อมึงตาย", "แม่มึงตาย",
];

const ALLOW_WORDS = [
  "หีบ", "เหี่ยว", "โหดเหี้ยม", "เหี้ยมโหด", "เหี้ยมหาญ", "สัดส่วน", "สัสดี", "ตอแหล่ง",
  "แกงกะหรี่", "ผงกะหรี่", "กะหรี่ปั๊บ",
];

const LATIN_WORDS = [
  "fuck", "shit", "bitch", "bastard", "asshole", "cunt", "whore", "slut", "dick", "dickhead", "pussy", "ass",
];

const LEET = { "@": "a", $: "s", 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t" };
const INVISIBLE = /[­​-‍⁠﻿]/g;

const THAI_MARKS = /[็-์]/g;
const THAI_REPEAT = /([ก-๛])\1+/g;
const SEPARATORS = /[\s\p{P}\p{S}\p{Cc}]+/u;
const ALL_SEPARATORS = /[\s\p{P}\p{S}\p{Cc}]+/gu;

function baseForm(text) {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(INVISIBLE, "")
    .replace(THAI_MARKS, "")
    .replace(/[a-z0-9@$]+/g, (run) => (/[a-z]/.test(run) ? [...run].map((c) => LEET[c] ?? c).join("") : run));
}

const collapseRepeats = (text) => text.replace(THAI_REPEAT, "$1");

// "ไอ้ ค ว ย" and "ค.ว.ย" -> "ไอ ควย": runs of single characters are glued back
// together, while ordinary words keep their spaces so neighbouring words can't
// combine into a false match.
function joinSpacedLetters(text) {
  const out = [];
  let run = "";
  for (const token of text.split(SEPARATORS).filter(Boolean)) {
    if ([...token].length === 1) {
      run += token;
      continue;
    }
    if (run) out.push(run);
    run = "";
    out.push(token);
  }
  if (run) out.push(run);
  return out.join(" ");
}

const normalizeWord = (word) => collapseRepeats(baseForm(word));
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const THAI_BAD = BAD_WORDS.map(normalizeWord);
const ALLOWED = new RegExp(
  ALLOW_WORDS.map(normalizeWord).sort((a, b) => b.length - a.length).map(escapeRegExp).join("|"),
  "g"
);

function latinPattern(word) {
  const runs = word.match(/(.)\1*/g).map((run) => (run.length > 1 ? `${run[0]}{${run.length},}` : `${run}+`));
  return new RegExp(`(?<![a-z])${runs.join("")}(?:ing|ed|er|ers|es|s)?(?![a-z])`);
}
const LATIN_BAD = LATIN_WORDS.map(latinPattern);

// Phrases written with spaces between the words ("ชาติ หมา") are only found
// with every separator stripped. Short entries are skipped there: across word
// boundaries they would match by accident.
const MIN_LENGTH_WITHOUT_SEPARATORS = 4;

// Layer 1. Synchronous, no network.
export function containsListedWord(text) {
  const base = collapseRepeats(baseForm(text));
  const spaced = joinSpacedLetters(base).replace(ALLOWED, " ");
  const stripped = base.replace(ALL_SEPARATORS, "").replace(ALLOWED, " ");
  return (
    THAI_BAD.some((word) => spaced.includes(word)) ||
    THAI_BAD.some((word) => word.length >= MIN_LENGTH_WITHOUT_SEPARATORS && stripped.includes(word)) ||
    LATIN_BAD.some((pattern) => pattern.test(spaced))
  );
}

const API_TIMEOUT_MS = 3000;
// iApp bills per 400 characters and takes the text in the URL, so long text is
// cut into pieces and only the first few are sent. The word list still reads all of it.
const IAPP_CHUNK = 400;
const IAPP_MAX_CHUNKS = 3;
const IAPP_DEFAULT_THRESHOLD = 0.8;
// Harassment, hate and sexual content only. Self-harm and violence are left
// out on purpose: people recovering from addiction or depression talk about
// those honestly, and a blocked message is the wrong response to someone in pain.
const OPENAI_BLOCKED_CATEGORIES = ["harassment", "harassment/threatening", "hate", "hate/threatening", "sexual"];

async function flaggedByOpenAI(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return false;
  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODERATION_MODEL || "omni-moderation-latest", input: text }),
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`OpenAI moderation answered ${response.status}`);
  const result = (await response.json()).results?.[0];
  return OPENAI_BLOCKED_CATEGORIES.some((category) => result?.categories?.[category] === true);
}

async function flaggedByIapp(text) {
  const key = process.env.IAPP_API_KEY;
  if (!key) return false;
  const threshold = Number(process.env.IAPP_TOXIC_THRESHOLD) || IAPP_DEFAULT_THRESHOLD;
  const chunks = [];
  for (let i = 0; i < text.length && chunks.length < IAPP_MAX_CHUNKS; i += IAPP_CHUNK) {
    chunks.push(text.slice(i, i + IAPP_CHUNK));
  }
  const verdicts = await Promise.all(
    chunks.map(async (chunk) => {
      const response = await fetch(
        `https://api.iapp.co.th/v3/store/nlp/toxicity-classification?text=${encodeURIComponent(chunk)}`,
        { method: "POST", headers: { apikey: key }, signal: AbortSignal.timeout(API_TIMEOUT_MS) }
      );
      if (!response.ok) throw new Error(`iApp toxicity answered ${response.status}`);
      const data = await response.json();
      return data.label === "toxic" && Number(data.score) >= threshold;
    })
  );
  return verdicts.some(Boolean);
}

const PROVIDERS = { openai: flaggedByOpenAI, iapp: flaggedByIapp };

// Layer 2. Never throws: any failure counts as "not flagged".
async function flaggedByApi(text) {
  const provider = PROVIDERS[(process.env.MODERATION_PROVIDER || "").trim().toLowerCase()];
  if (!provider) return false;
  try {
    return await provider(text);
  } catch (err) {
    // Log the reason only; the text is a private message and stays out of the logs.
    console.warn("[moderation] API check skipped:", err.name, "-", err.message);
    return false;
  }
}

export async function isProfane(text) {
  if (typeof text !== "string" || !text.trim()) return false;
  return containsListedWord(text) || (await flaggedByApi(text));
}

// Route middleware: rejects the request when req.body[field] is not acceptable.
// Place it after `validate` so only well-formed bodies reach the moderation API.
export function profanityGuard(field) {
  return async function profanityGuardMiddleware(req, res, next) {
    try {
      // Screen what will be stored: the controllers strip markup first.
      if (await isProfane(sanitizeText(req.body?.[field]))) {
        return res.status(400).json({ message: REJECT_MESSAGE });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
