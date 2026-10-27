import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { validationResult } from "express-validator";
import User from "../src/models/User.js";
import { urlBody } from "../src/middleware/validators.js";
import { getRecoveryNews } from "../src/services/newsService.js";

afterEach(() => mock.restoreAll());

async function validate(chain, value) {
  const req = { body: { link: value } };
  await chain.run(req);
  return validationResult(req).isEmpty();
}

test("links people are sent to must be http(s) with the scheme spelled out", async () => {
  const chain = urlBody("link");
  for (const bad of [
    "javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<script>alert(1)</script>", "file:///etc/passwd",
    "ftp://example.com/x", "vbscript:x", "intent://scan/#Intent;scheme=zxing;end", "example.com/meet", "www.example.com",
    "//evil.example/x", "https://", ["https://a.example"], { href: "https://a.example" }, 42, `https://example.com/${"a".repeat(600)}`,
  ]) {
    assert.equal(await validate(chain, bad), false, JSON.stringify(bad).slice(0, 60));
  }
  for (const good of ["https://zoom.us/j/123456789", "http://example.com/a?b=c", "https://meet.google.com/abc-defg-hij", "https://บริษัท.example/สมัคร"]) {
    assert.equal(await validate(chain, good), true, good);
  }
});

test("an optional link may be left blank, a required one may not", async () => {
  assert.equal(await validate(urlBody("link"), ""), true);
  assert.equal(await validate(urlBody("link"), undefined), true);
  assert.equal(await validate(urlBody("link", { required: true }), ""), false);
  assert.equal(await validate(urlBody("link", { required: true }), undefined), false);
});

const rss = (items) => `<?xml version="1.0"?><rss version="2.0"><channel>${items.map((item) => `<item>
  <title>${item.title}</title><link>${item.link}</link>
  <description><![CDATA[<img src="${item.image}" /> ข้อความบทความ]]></description>
  <pubDate>Mon, 05 Jan 2026 10:00:00 GMT</pubDate></item>`).join("")}</channel></rss>`;

test("news articles only link to the publisher, and article pictures are https", async () => {
  mock.method(User, "find", () => ({ select: async () => [] }));
  mock.method(globalThis, "fetch", async () => ({
    ok: true,
    text: async () => rss([
      { title: "ดี", link: "http://www.hfocus.org/content/2026/01/1", image: "https://cdn.hfocus.org/a.jpg" },
      { title: "ลิงก์ไปเว็บอื่น", link: "https://evil.example/hfocus.org", image: "https://cdn.hfocus.org/b.jpg" },
      { title: "ชื่อโดเมนหลอก", link: "https://hfocus.org.evil.example/x", image: "https://cdn.hfocus.org/c.jpg" },
      { title: "สคริปต์", link: "javascript:alert(1)", image: "https://cdn.hfocus.org/d.jpg" },
      { title: "รูปไม่ปลอดภัย", link: "https://www.hfocus.org/content/2026/01/2", image: "javascript:alert(1)" },
      { title: "รูปข้อมูลฝัง", link: "https://hfocus.org/content/2026/01/3", image: "data:image/svg+xml;base64,PHN2Zz4=" },
    ]),
  }));
  const articles = await getRecoveryNews(10);
  assert.deepEqual(articles.map((article) => article.title), ["ดี", "รูปไม่ปลอดภัย", "รูปข้อมูลฝัง"]);
  assert.equal(articles[0].link, "https://www.hfocus.org/content/2026/01/1", "http links are upgraded to https");
  assert.equal(articles[0].image, "https://cdn.hfocus.org/a.jpg");
  assert.equal(articles[1].image, null, "a javascript: picture is dropped, the article stays");
  assert.equal(articles[2].image, null, "a data: picture is dropped");
});
