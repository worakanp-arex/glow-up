const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]", "::1"];

// Demo content and load-test accounts use well-known passwords (they are in the
// public repository), so the scripts that create them must only ever run against
// a database on this machine. NODE_ENV alone is not a safeguard: it is simply
// unset when someone runs the script by hand with a production URI in their .env.
export function assertLocalDatabase(uri = process.env.MONGODB_URI) {
  let host = "";
  try {
    host = new URL(uri).hostname.toLowerCase();
  } catch {
    // Unparseable (for example a multi-host replica set URI) counts as not local.
  }
  if (!LOCAL_HOSTS.includes(host)) {
    throw new Error(
      `Refusing to run: MONGODB_URI points at "${host || "an unrecognised host"}", not this machine. ` +
        "This script creates data with publicly known passwords and may only target a local database."
    );
  }
}
