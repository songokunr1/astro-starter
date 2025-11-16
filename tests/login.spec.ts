import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should allow a user to log in and be redirected", async ({ page }) => {
    // Navigate to the login page
    await page.goto("/login");

    // Check if E2E credentials are set
    const username = process.env.E2E_USERNAME;
    const password = process.env.E2E_PASSWORD;

    if (!username || !password) {
      throw new Error("E2E_USERNAME and E2E_PASSWORD environment variables must be set in .env.test");
    }

    // Fill in the form
    await page.getByLabel("Email").fill(username);
    await page.getByLabel("Hasło").fill(password);

    // Click the login button
    await page.getByRole("button", { name: "Log in" }).click();

    // Assert that the user is redirected to the generate page
    await expect(page).toHaveURL("/generate", { timeout: 10000 });
  });
});
