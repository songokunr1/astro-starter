import { defineConfig, devices } from "@playwright/test";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read from default ".env" file.
dotenv.config();

// Read from ".env.test" file.
dotenv.config({ path: path.resolve(__dirname, ".env.test") });

const PORT = process.env.PORT || 3001;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  timeout: 30 * 1000,
  testDir: "./tests",
  retries: 2,
  outputDir: "test-results/",

  webServer: {
    command: "npm run dev:e2e",
    url: baseURL,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },

  use: {
    baseURL,
    trace: "retry-with-trace",
  },

  projects: [
    {
      name: "Desktop Chrome",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    // {
    //   name: 'Desktop Firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //   },
    // },
    // {
    //   name: 'Desktop Safari',
    //   use: {
    //     ...devices['Desktop Safari'],
    //   },
    // },
  ],
});
