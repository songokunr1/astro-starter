import { test, expect } from "@playwright/test";
import { randomBytes } from "crypto";

test.describe("Set and Flashcard Creation", () => {
  test("should allow a user to log in, create a new set, and add a flashcard", async ({ page }) => {
    console.log("Starting the test...");

    // Step 1: Log in
    console.log("Navigating to login page...");
    await page.goto("/login");
    console.log("Login page loaded.");

    const username = process.env.E2E_USERNAME;
    const password = process.env.E2E_PASSWORD;

    if (!username || !password) {
      throw new Error("E2E_USERNAME and E2E_PASSWORD environment variables must be set in .env.test");
    }

    // Wait for the login form to be fully loaded
    await page.getByLabel("Email").waitFor({ state: "visible", timeout: 5000 });
    await page.getByLabel("Hasło").waitFor({ state: "visible", timeout: 5000 });
    console.log("Login form is ready.");

    console.log("Filling login credentials...");
    await page.getByLabel("Email").fill(username);
    await page.getByLabel("Hasło").fill(password);
    console.log("Credentials filled.");

    console.log("Clicking login button...");
    await page.getByRole("button", { name: "Log in" }).click();
    console.log("Login button clicked. Waiting for redirection to /generate...");

    // Wait for the "New set" button to be visible (confirms successful login)
    // Increased timeout for slower network/authentication
    await page.getByRole("button", { name: "New set" }).waitFor({ state: "visible", timeout: 15000 });
    console.log("'New set' button is visible - login successful.");

    await expect(page).toHaveURL("/generate");
    console.log("Successfully redirected to /generate.");

    // Step 2: Create a new set
    const setName = `Test Set ${randomBytes(4).toString("hex")}`;
    const setDescription = "This is a test description.";

    console.log("Clicking 'New set' button...");
    await page.getByRole("button", { name: "New set" }).click();
    console.log("'New set' button clicked.");

    // Wait for the new set form to appear
    await page.getByLabel("Name").waitFor({ state: "visible", timeout: 5000 });
    console.log("New set form appeared.");

    console.log(`Filling new set form with name: ${setName}`);
    await page.getByLabel("Name").fill(setName);
    await page.getByLabel("Description (optional)").fill(setDescription);
    console.log("New set form filled.");

    console.log("Clicking 'Create set' button...");
    await page.getByRole("button", { name: "Create set" }).click();
    console.log("'Create set' button clicked. Waiting for set creation...");

    // Wait for the success toast to appear
    await page.getByText("Set created").waitFor({ state: "visible", timeout: 10000 });
    console.log("Success toast appeared - set created successfully.");

    // Wait for the flashcard form to be visible (confirms we can now add flashcards)
    await page.getByPlaceholder("Question or prompt").waitFor({ state: "visible", timeout: 5000 });
    console.log("Flashcard form is visible and ready.");

    // We remain on /generate page (no redirection happens)
    await expect(page).toHaveURL("/generate");
    console.log("Still on /generate page as expected.");

    // Step 3: Add a new flashcard
    const flashcardFront = "What is Playwright?";
    const flashcardBack = "Playwright is an end-to-end testing framework.";

    console.log("Filling new flashcard form...");
    await page.getByPlaceholder("Question or prompt").fill(flashcardFront);
    await page.getByPlaceholder("Answer").fill(flashcardBack);
    console.log("New flashcard form filled.");

    console.log("Clicking 'Add flashcard' button...");
    await page.getByRole("button", { name: "Add flashcard" }).click();
    console.log("'Add flashcard' button clicked.");

    // Wait a moment for the flashcard to be added to the list
    await page.waitForTimeout(1000);
    console.log("Waited for flashcard to be processed.");

    // Assert that the new flashcard is visible on the page
    console.log("Asserting flashcard visibility...");
    await expect(page.getByText(flashcardFront)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(flashcardBack)).toBeVisible({ timeout: 5000 });
    console.log("Flashcard is visible. Test completed successfully!");
  });
});
