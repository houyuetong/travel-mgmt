import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node src/app.js',
      cwd: '../server',
      port: 3001,
      timeout: 10000,
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev',
      cwd: '../client',
      port: 5173,
      timeout: 15000,
      reuseExistingServer: true,
    },
  ],
});