// Isolate tests from local credentials and external services.
process.env.DOTENV_CONFIG_PATH = "test/nonexistent.env";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-only-secret-never-use-in-production";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/glow-up-test";
for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "GOOGLE_CLIENT_ID"]) process.env[key] = "";
