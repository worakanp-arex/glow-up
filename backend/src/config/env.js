import "dotenv/config";

export function validateEnvironment(env = process.env) {
  for (const key of ["MONGODB_URI", "JWT_SECRET"]) {
    if (!env[key]) throw new Error(`Missing required configuration: ${key}`);
  }
  if (env.NODE_ENV === "production" && (env.JWT_SECRET.length < 32 || env.JWT_SECRET === "change_this_secret")) {
    throw new Error("JWT_SECRET must contain at least 32 characters in production");
  }
  if (env.NODE_ENV === "production" && ![env.SMTP_HOST, env.SMTP_USER, env.SMTP_PASS].every(Boolean)) {
    throw new Error("SMTP configuration is required in production for account verification");
  }
}
