// Remembers the page the visitor was on before the current one so a page that
// can be opened from anywhere (the profile) can send them back where they came
// from instead of to a fixed page. Kept in sessionStorage so it survives a
// refresh; storage may be unavailable (private windows), so every access is
// guarded and a missing value just means "use the role's home page".
const CURRENT_KEY = "route.current";
const PREVIOUS_KEY = "route.previous";

function read(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore: back navigation falls back to the role home page
  }
}

export function trackRoute(pathname, search = "") {
  const next = pathname + search;
  const current = read(CURRENT_KEY);
  if (current === next) return;
  // Moving between sections of the same page (profile tabs) is not a new place.
  if (current && current.split("?")[0] === pathname) {
    write(CURRENT_KEY, next);
    return;
  }
  if (current) write(PREVIOUS_KEY, current);
  write(CURRENT_KEY, next);
}

// Only internal, same-site paths are ever returned. `requirePathPrefix` keeps a
// back link inside one area (e.g. "/employer/").
export function getPreviousRoute(excludePathPrefix, requirePathPrefix) {
  const previous = read(PREVIOUS_KEY);
  if (!previous || !previous.startsWith("/") || previous.startsWith("//")) return null;
  if (excludePathPrefix && previous.startsWith(excludePathPrefix)) return null;
  if (requirePathPrefix && !previous.startsWith(requirePathPrefix)) return null;
  if (previous.startsWith("/login") || previous.startsWith("/register")) return null;
  return previous;
}
