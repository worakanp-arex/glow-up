import "dotenv/config";

export function validateEnvironment(env = process.env) {
  for (const key of ["MONGODB_URI", "JWT_SECRET"]) {
    if (!env[key]) throw new Error(`Missing required configuration: ${key}`);
  }
  if (env.NODE_ENV === "production" && (env.JWT_SECRET.length < 32 || env.JWT_SECRET === "change_this_secret")) {
    throw new Error("JWT_SECRET must contain at least 32 characters in production");
  }
  const smtpReady = [env.SMTP_HOST, env.SMTP_USER, env.SMTP_PASS].every(Boolean);
  const brevoReady = Boolean(env.BREVO_API_KEY && env.EMAIL_FROM);
  if (env.NODE_ENV === "production" && !smtpReady && !brevoReady) {
    throw new Error("SMTP configuration (or BREVO_API_KEY + EMAIL_FROM) is required in production for account verification");
  }
  if (env.NODE_ENV !== "production" && env.NODE_ENV !== "test" && !smtpReady && !brevoReady) {
    console.warn("[config] SMTP_HOST/SMTP_USER/SMTP_PASS (or BREVO_API_KEY + EMAIL_FROM) are not set — OTP, password-reset and invite emails will fail until configured.");
  }
}
