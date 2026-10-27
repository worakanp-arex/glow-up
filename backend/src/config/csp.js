// Content-Security-Policy for the web app's pages (not the JSON API, which keeps
// helmet's stricter default). It lists everything the page is allowed to load, so
// a script injected into it could neither run (no inline or third-party scripts
// beyond Google Sign-In) nor send data anywhere except this site and Google's
// sign-in service.
//
// The same policy is written out by hand in deploy/nginx/security-headers.conf and
// frontend/vercel.json, which cannot import this file; test/security-headers.test.js
// fails if the three drift apart. Change them together.
export const PAGE_CSP_DIRECTIVES = {
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "object-src": ["'none'"],
  "frame-ancestors": ["'none'"],
  "form-action": ["'self'"],
  // The app's own bundle, plus Google's sign-in script.
  "script-src": ["'self'", "https://accounts.google.com/gsi/client"],
  // Stylesheets are the app's own files (and Google's sign-in button styles);
  // React's style="" attributes need the attribute-only exception. Google's
  // sign-in script also writes one fixed <style> element into the page; it is
  // allowed by its hash (what the browser reports as blocked) instead of opening
  // up inline styles in general. If Google changes that CSS the hash stops
  // matching: the console shows a violation and the button loses only cosmetics.
  "style-src": ["'self'", "https://accounts.google.com/gsi/style", "'sha256-RU4sU0AaS8IBGZx8XrGt/pa9A5SLA3dQszGeqT5L3Kw='"],
  "style-src-attr": ["'unsafe-inline'"],
  // Profile pictures and article images come from other https sites; blob: is
  // the preview of a file the person just picked.
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "font-src": ["'self'"],
  "connect-src": ["'self'", "https://accounts.google.com/gsi/"],
  "frame-src": ["https://accounts.google.com/gsi/"],
};

export function pageCspHeader() {
  return Object.entries(PAGE_CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");
}
