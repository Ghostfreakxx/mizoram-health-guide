import { defineConfig, devices } from "@playwright/test";

// End-to-end and accessibility tests. Run after `npm run build`:
//   npm run test:e2e
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3300", trace: "off" },
  webServer: {
    command: "npx next start -p 3300",
    url: "http://localhost:3300",
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 5"] } },
  ],
});
