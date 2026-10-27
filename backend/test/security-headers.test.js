import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { pageCspHeader } from "../src/config/csp.js";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => fs.readFileSync(path.join(repo, relative), "utf8");

// A stand-in for the built front end, so the app runs in its single-service mode.
const dist = fs.mkdtempSync(path.join(os.tmpdir(), "glowup-dist-"));
fs.writeFileSync(path.join(dist, "index.html"), "<!doctype html><title>x</title>");
fs.writeFileSync(path.join(dist, "theme-init.js"), "document.documentElement.dataset.theme='light'");
process.env.FRONTEND_DIST = dist;

let app;
before(async () => {
  ({ default: app } = await import("../src/app.js"));
});

async function serve(t) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test("the three places that state the page policy (backend, nginx, Vercel) say exactly the same thing", () => {
  const policy = pageCspHeader();
  const nginx = read("deploy/nginx/security-headers.conf").match(/add_header Content-Security-Policy "([^"]+)"/)?.[1];
  const vercel = JSON.parse(read("frontend/vercel.json")).headers
    .flatMap((entry) => entry.headers)
    .find((header) => header.key === "Content-Security-Policy")?.value;
  assert.equal(nginx, policy, "deploy/nginx/security-headers.conf");
  assert.equal(vercel, policy, "frontend/vercel.json");
});

test("the policy forbids what an injected script would need: inline and third-party scripts, framing, plugins", () => {
  const policy = pageCspHeader();
  assert.match(policy, /script-src 'self' https:\/\/accounts\.google\.com\/gsi\/client(;|$)/);
  assert.doesNotMatch(policy.match(/script-src [^;]+/)[0], /unsafe-inline|unsafe-eval|\*/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /base-uri 'self'/);
  assert.match(policy, /connect-src 'self' https:\/\/accounts\.google\.com\/gsi\//, "data can only be sent to this site and Google sign-in");
  assert.doesNotMatch(policy, /fonts\.googleapis|fonts\.gstatic/, "fonts are served from this site");
});

test("the page the policy protects has no inline script and loads no outside fonts, so it keeps working under the policy", () => {
  const html = read("frontend/index.html");
  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].filter((match) => match[1].trim() !== "");
  assert.equal(inlineScripts.length, 0, "inline <script> would be blocked");
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(html, /<script src="\/theme-init\.js"><\/script>/);
  assert.ok(fs.existsSync(path.join(repo, "frontend/public/theme-init.js")));
});

test("every nginx location that sets its own headers also repeats the security headers (nginx doesn't inherit them otherwise)", () => {
  const conf = read("deploy/nginx/glow-up.conf");
  const include = "include /etc/nginx/snippets/glow-up-security-headers.conf;";
  assert.ok(conf.slice(0, conf.indexOf("location")).includes(include), "server-level include");
  const locations = conf.split(/\n\s*location /).slice(1);
  assert.ok(locations.length >= 5);
  for (const block of locations) {
    assert.ok(block.includes(include), `location ${block.split("{")[0].trim()} is missing the include`);
  }
  assert.match(conf, /server_tokens off;/);
  assert.match(conf, /limit_req zone=glowup_api/);
});

test("pages are served with the policy and the other protective headers; the API keeps helmet's own", { timeout: 15000 }, async (t) => {
  const base = await serve(t);
  const page = await fetch(`${base}/login`);
  await page.text();
  // helmet writes "a;b" where the files say "a; b": same policy, different spacing.
  assert.equal(page.headers.get("content-security-policy").replace(/;\s*/g, "; "), pageCspHeader());
  assert.equal(page.headers.get("x-content-type-options"), "nosniff");
  assert.equal(page.headers.get("referrer-policy"), "no-referrer");
  assert.equal(page.headers.get("cross-origin-opener-policy"), "same-origin-allow-popups", "Google sign-in opens a popup");
  const hsts = page.headers.get("strict-transport-security");
  assert.match(hsts, /max-age=31536000/);
  assert.doesNotMatch(hsts, /includeSubDomains/i);

  const script = await fetch(`${base}/theme-init.js`);
  assert.equal(script.status, 200, "served as a file, not swallowed by the page fallback");
  assert.match(script.headers.get("content-type"), /javascript/);
  await script.text();

  const api = await fetch(`${base}/api/health`);
  await api.text();
  assert.match(api.headers.get("content-security-policy"), /default-src 'self'/);
  assert.notEqual(api.headers.get("content-security-policy"), pageCspHeader());
  assert.doesNotMatch(api.headers.get("strict-transport-security"), /includeSubDomains/i);
});
