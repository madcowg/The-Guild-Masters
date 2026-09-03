import { defineConfig, devices } from '@playwright/test';

// This project's vite.config.js hardcodes server.port 5199 with
// strictPort: true (not Vite's default 5173), so that's the fallback here.
const baseURL = process.env.BASE_URL || 'http://localhost:5199';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
