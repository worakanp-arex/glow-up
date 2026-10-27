import "dotenv/config";

// Only these two environments may run with relaxed security (weak secret,
// cookies over plain HTTP, raw error messages). Anything else — including an
// unset or mistyped NODE_ENV — is treated like production, so forgetting to set
// it on a server can never leave the published placeholder secret in effect.
const RELAXED_ENVIRONMENTS = ["development", "test"];

export function isProductionLike(env = process.env) {
  return !RELAXED_ENVIRONMENTS.includes(env.NODE_ENV);
}

// The example files ship these values, so anyone can read them on GitHub.
const PLACEHOLDER_SECRET = /change_?this|changeme|your[_-]?secret|^(secret|development-secret)$/i;
const MIN_SECRET_LENGTH = 32;
const MIN_DISTINCT_SECRET_CHARS = 8;

function weakSecretReason(secret) {
  if (secret.length < MIN_SECRET_LENGTH) return `at least ${MIN_SECRET_LENGTH} characters`;
  if (PLACEHOLDER_SECRET.test(secret)) return "a real random value, not the example placeholder";
  if (new Set(secret).size < MIN_DISTINCT_SECRET_CHARS) return "random, not a repeated pattern";
  return null;
}

export function validateEnvironment(env = process.env) {
  for (const key of ["MONGODB_URI", "JWT_SECRET"]) {
    if (!env[key]) throw new Error(`Missing required configuration: ${key}`);
  }
  const productionLike = isProductionLike(env);

  const weakness = weakSecretReason(env.JWT_SECRET);
  if (weakness && productionLike) {
    throw new Error(
      `JWT_SECRET must be ${weakness}. Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))". ` +
        `For local development set NODE_ENV=development in backend/.env (NODE_ENV is "${env.NODE_ENV ?? ""}", which is treated as production).`
    );
  }
  if (weakness) {
    console.warn(`[config] JWT_SECRET should be ${weakness}; allowed only because NODE_ENV=${env.NODE_ENV}.`);
  }

  if (productionLike) {
    for (const key of ["CORS_ORIGIN", "FRONTEND_URL"]) {
      if (!env[key]) throw new Error(`Missing required configuration: ${key} (reset and invite emails would link to localhost)`);
    }
  }

  const smtpReady = [env.SMTP_HOST, env.SMTP_USER, env.SMTP_PASS].every(Boolean);
  const brevoReady = Boolean(env.BREVO_API_KEY && env.EMAIL_FROM);
  if (productionLike && !smtpReady && !brevoReady) {
    throw new Error("SMTP configuration (or BREVO_API_KEY + EMAIL_FROM) is required in production for account verification");
  }
  if (!productionLike && env.NODE_ENV !== "test" && !smtpReady && !brevoReady) {
    console.warn("[config] SMTP_HOST/SMTP_USER/SMTP_PASS (or BREVO_API_KEY + EMAIL_FROM) are not set — OTP, password-reset and invite emails will fail until configured.");
  }
  if (productionLike && !env.TRUST_PROXY) {
    console.warn("[config] TRUST_PROXY is not set. Behind nginx or a platform proxy every visitor shares the proxy's IP, so the login rate limit locks everyone out together. Set TRUST_PROXY (e.g. loopback, or a hop count).");
  }
}
