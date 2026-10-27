import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { containsListedWord, isProfane, profanityGuard, REJECT_MESSAGE } from "../src/services/profanityService.js";
import postRoutes from "../src/routes/postRoutes.js";
import familyRoutes from "../src/routes/familyRoutes.js";

const MODERATION_ENV = ["MODERATION_PROVIDER", "OPENAI_API_KEY", "IAPP_API_KEY", "IAPP_TOXIC_THRESHOLD"];

afterEach(() => {
  mock.restoreAll();
  for (const key of MODERATION_ENV) delete process.env[key];
});

const response = () => ({ code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

async function runGuard(field, body) {
  const res = response();
  const next = mock.fn();
  await profanityGuard(field)({ body }, res, next);
  return { res, next };
}

const jsonResponse = (body, ok = true, status = 200) => ({ ok, status, json: async () => body });

test("the word list catches Thai profanity and the usual ways of hiding it", () => {
  const caught = [
    "ไอ้ควย",
    "ไอ้ ค ว ย",
    "ค.ว.ย",
    "ค-ว-ย",
    "เหี้ยยยยย",
    "เหี่ย้ย",
    "ค​ว​ย",
    "ควยยยย",
    "ไอ้<b>สัด</b>",
    "ชาติ หมา",
    "มึงมันเหี้ยมาก",
    "ฉิบหายแล้ว",
  ];
  for (const text of caught) assert.equal(containsListedWord(text), true, text);
});

test("the word list catches English profanity but not words that merely contain it", () => {
  for (const text of ["fuck you", "FUCK", "f u c k", "fuuuuck", "f.u.c.k", "$hit", "you bitch", "stop fucking around", "what an ass"]) {
    assert.equal(containsListedWord(text), true, text);
  }
  for (const text of ["class", "assume", "pass the exam", "cocktail", "Scunthorpe", "shitake mushrooms", "as soon as possible"]) {
    assert.equal(containsListedWord(text), false, text);
  }
});

test("ordinary Thai that contains a listed word as a substring is not flagged", () => {
  const clean = [
    "เป็นกำลังใจให้นะ",
    "ผมเลิกเหล้าได้ 30 วันแล้ว",
    "หีบเพลงของคุณตา",
    "ดอกไม้เหี่ยวเพราะไม่ได้รดน้ำ",
    "เรื่องนี้โหดเหี้ยมมาก",
    "สัดส่วนของงานวันนี้",
    "ไปหาสัสดีอำเภอ",
    "แกงกะหรี่อร่อยมาก",
    "ต้นตอแหล่งข่าว",
    "5555 ขอบคุณมากนะคะ",
    "วันนี้รู้สึกดีขึ้น สู้ต่อไปนะ",
  ];
  for (const text of clean) assert.equal(containsListedWord(text), false, text);
});

test("words from neighbouring sentences do not combine into a match", () => {
  assert.equal(containsListedWord("ขอบคุณค่ะ วันนี้ย้ายบ้านเสร็จแล้ว"), false);
  assert.equal(containsListedWord("เลข 4 ข 7 ย 3"), false);
});

test("the guard answers 400 with a Thai message and keeps clean text moving", async () => {
  const blocked = await runGuard("content", { content: "ไอ้ ค ว ย" });
  assert.equal(blocked.res.code, 400);
  assert.equal(blocked.res.body.message, REJECT_MESSAGE);
  assert.equal(blocked.next.mock.callCount(), 0);

  const passed = await runGuard("content", { content: "เป็นกำลังใจให้นะ" });
  assert.equal(passed.next.mock.callCount(), 1);
  assert.equal(passed.res.body, null);
});

test("the guard reads only the field it was given and ignores missing or non-text values", async () => {
  assert.equal((await runGuard("message", { content: "ควย" })).next.mock.callCount(), 1);
  assert.equal((await runGuard("message", {})).next.mock.callCount(), 1);
  assert.equal((await runGuard("message", { message: 42 })).next.mock.callCount(), 1);
  assert.equal((await runGuard("message", { message: "   " })).next.mock.callCount(), 1);
});

test("without a provider configured nothing leaves the server", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => jsonResponse({}));
  assert.equal(await isProfane("สวัสดีทุกคน"), false);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("OpenAI moderation blocks harassment but lets self-harm talk through", async () => {
  process.env.MODERATION_PROVIDER = "openai";
  process.env.OPENAI_API_KEY = "sk-test";
  const fetchMock = mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/moderations");
    assert.equal(init.headers.Authorization, "Bearer sk-test");
    const input = JSON.parse(init.body).input;
    if (input.includes("เกลียด")) return jsonResponse({ results: [{ flagged: true, categories: { harassment: true } }] });
    return jsonResponse({ results: [{ flagged: true, categories: { "self-harm": true, "self-harm/intent": true } }] });
  });

  assert.equal(await isProfane("ฉันเกลียดแกมาก ไม่มีใครต้องการแก"), true);
  assert.equal(await isProfane("ช่วงนี้รู้สึกหมดหวังจนอยากหายไป"), false);
  assert.equal(fetchMock.mock.callCount(), 2);
});

test("iApp moderation needs the toxic label and a score at the threshold", async () => {
  process.env.MODERATION_PROVIDER = "iapp";
  process.env.IAPP_API_KEY = "iapp-key";
  const answers = [
    { label: "toxic", score: 0.95 },
    { label: "toxic", score: 0.6 },
    { label: "non_toxic", score: 0.99 },
  ];
  const fetchMock = mock.method(globalThis, "fetch", async (url, init) => {
    assert.match(url, /^https:\/\/api\.iapp\.co\.th\/v3\/store\/nlp\/toxicity-classification\?text=/);
    assert.equal(init.method, "POST");
    assert.equal(init.headers.apikey, "iapp-key");
    return jsonResponse(answers.shift());
  });

  assert.equal(await isProfane("ข้อความหนึ่ง"), true);
  assert.equal(await isProfane("ข้อความสอง"), false);
  assert.equal(await isProfane("ข้อความสาม"), false);
  assert.equal(fetchMock.mock.callCount(), 3);
});

test("iApp checks long text in at most three pieces", async () => {
  process.env.MODERATION_PROVIDER = "iapp";
  process.env.IAPP_API_KEY = "iapp-key";
  const fetchMock = mock.method(globalThis, "fetch", async () => jsonResponse({ label: "non_toxic", score: 0.9 }));
  await isProfane("ก".repeat(2000));
  assert.equal(fetchMock.mock.callCount(), 3);
});

test("a listed word is rejected without calling the API", async () => {
  process.env.MODERATION_PROVIDER = "openai";
  process.env.OPENAI_API_KEY = "sk-test";
  const fetchMock = mock.method(globalThis, "fetch", async () => jsonResponse({ results: [] }));
  assert.equal(await isProfane("ไอ้เหี้ย"), true);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("when the API fails, times out or answers with an error, the word list result stands", async () => {
  mock.method(console, "warn", () => {});
  process.env.MODERATION_PROVIDER = "openai";
  process.env.OPENAI_API_KEY = "sk-test";

  mock.method(globalThis, "fetch", async () => { throw new DOMException("The operation timed out", "TimeoutError"); });
  assert.equal(await isProfane("สวัสดีครับ"), false);
  assert.equal(await isProfane("ไอ้ ค ว ย"), true);

  mock.restoreAll();
  mock.method(console, "warn", () => {});
  mock.method(globalThis, "fetch", async () => jsonResponse({}, false, 429));
  assert.equal(await isProfane("สวัสดีครับ"), false);

  const { next } = await runGuard("content", { content: "สวัสดีครับ" });
  assert.equal(next.mock.callCount(), 1);
});

test("the API warning never contains the message text", async () => {
  const warn = mock.method(console, "warn", () => {});
  process.env.MODERATION_PROVIDER = "iapp";
  process.env.IAPP_API_KEY = "iapp-key";
  mock.method(globalThis, "fetch", async () => jsonResponse({}, false, 500));
  await isProfane("ข้อความส่วนตัวมากๆ");
  assert.equal(warn.mock.callCount(), 1);
  assert.doesNotMatch(warn.mock.calls[0].arguments.join(" "), /ส่วนตัว/);
});

test("an unknown provider name is ignored", async () => {
  process.env.MODERATION_PROVIDER = "typo";
  const fetchMock = mock.method(globalThis, "fetch", async () => jsonResponse({}));
  assert.equal(await isProfane("สวัสดี"), false);
  assert.equal(fetchMock.mock.callCount(), 0);
});

function handlerNames(router, method, path) {
  const layer = router.stack.find((entry) => entry.route?.path === path && entry.route.methods[method]);
  return layer.route.stack.map((handler) => handler.name);
}

test("comments and family messages go through the guard after validation", () => {
  for (const [router, method, path] of [
    [postRoutes, "post", "/:id/comments"],
    [postRoutes, "put", "/:id/comments/:commentId"],
    [familyRoutes, "post", "/links/:linkId/messages"],
  ]) {
    const names = handlerNames(router, method, path);
    const guard = names.indexOf("profanityGuardMiddleware");
    assert.ok(guard > names.indexOf("validate"), `${method} ${path} is missing the profanity guard after validate`);
  }
});
