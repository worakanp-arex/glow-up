import sanitizeHtml from "sanitize-html";

// Community content is plain text, not rich text — strip all markup rather
// than allow-listing tags.
export function sanitizeText(value) {
  if (typeof value !== "string") return value;
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}
