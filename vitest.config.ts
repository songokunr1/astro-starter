import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export default defineConfig({
  test: {
    // Set the environment to Node.js for server-side tests
    environment: "node",
  },
});
