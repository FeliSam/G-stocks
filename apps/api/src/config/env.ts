export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  API_PORT: Number(process.env.API_PORT || 4000),
  API_HOST: process.env.API_HOST || "localhost",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
  JWT_SECRET:
    process.env.JWT_SECRET || "gstock-local-dev-secret-key-minimum-32-characters-long-2026",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "12h",
  COOKIE_SECURE: process.env.COOKIE_SECURE === "true",
  STORAGE_DRIVER: process.env.STORAGE_DRIVER || "local",
  LOCAL_STORAGE_PATH: process.env.LOCAL_STORAGE_PATH || "./uploads",
  BILLING_PROVIDER: (process.env.BILLING_PROVIDER || "simulated_dev") as
    | "simulated_dev"
    | "stripe",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "whsec_dev_simulated_secret",
};
