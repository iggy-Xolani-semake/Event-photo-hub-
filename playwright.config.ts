import { defineConfig, devices } from "@playwright/test";

const ci = Boolean(process.env.CI);
const backendPort = 3333;
const appPort = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? "github" : "list",
  outputDir: "test-results",
  use: {
    baseURL: `http://127.0.0.1:${appPort}`,
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/e2e/mock-backend.mjs",
      url: `http://127.0.0.1:${backendPort}/health`,
      reuseExistingServer: !ci,
      timeout: 30_000,
    },
    {
      command: `npm run dev -- --hostname 127.0.0.1 --port ${appPort}`,
      url: `http://127.0.0.1:${appPort}`,
      reuseExistingServer: !ci,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${backendPort}`,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "e2e-service-role-key",
        R2_ACCOUNT_ID: "e2e",
        R2_ACCESS_KEY_ID: "e2e-access-key",
        R2_SECRET_ACCESS_KEY: "e2e-secret-key",
        R2_BUCKET_NAME: "event-photo-hub",
        R2_ENDPOINT: `http://127.0.0.1:${backendPort}`,
        NEXT_PUBLIC_APP_URL: "https://shutamzala.example",
        PAYFAST_MODE: "sandbox",
        PAYFAST_MERCHANT_ID: "10000100",
        PAYFAST_MERCHANT_KEY: "e2e-merchant-key",
        PAYFAST_PASSPHRASE: "e2e-passphrase",
      },
    },
  ],
});
