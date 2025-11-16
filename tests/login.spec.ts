import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should allow a user to log in and be redirected", async ({ page }) => {
    // Listen to console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the login page
    await page.goto("/login");

    // Check if E2E credentials are set
    const username = process.env.E2E_USERNAME;
    const password = process.env.E2E_PASSWORD;

    if (!username || !password) {
      throw new Error("E2E_USERNAME and E2E_PASSWORD environment variables must be set in .env.test");
    }

    // Wait for page to be fully loaded
    await page.waitForLoadState("networkidle");

    // Fill in the form
    await page.getByLabel("Email").fill(username);
    await page.getByLabel("Hasło").fill(password);

    // Take screenshot before login
    await page.screenshot({ path: "test-results/before-login.png" });

    // Click the login button and wait for navigation
    try {
      await Promise.all([
        page.waitForURL("/generate", { timeout: 30000 }), // Zwiększony timeout
        page.getByRole("button", { name: "Log in" }).click(),
      ]);
    } catch (error) {
      // Take screenshot on error
      await page.screenshot({ path: "test-results/login-error.png" });
      console.log("Console errors:", consoleErrors);
      console.log("Current URL:", page.url());
      throw error;
    }

    // Assert that the user is redirected to the generate page
    await expect(page).toHaveURL("/generate");
  });
});
