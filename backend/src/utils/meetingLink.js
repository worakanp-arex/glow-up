const HOST_RULES = [
  { platform: "zoom", test: (host) => host.endsWith("zoom.us") },
  { platform: "google-meet", test: (host) => host === "meet.google.com" },
  { platform: "teams", test: (host) => host.endsWith("teams.microsoft.com") || host.endsWith("teams.live.com") },
  { platform: "line", test: (host) => host.endsWith("line.me") },
];

export function detectMeetingPlatform(url) {
  if (!url) return undefined;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return HOST_RULES.find((rule) => rule.test(host))?.platform || "other";
  } catch {
    return "other";
  }
}
