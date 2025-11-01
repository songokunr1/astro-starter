import { describe, it, expect } from "vitest";
import request from "supertest";

const API_URL = "http://localhost:3001";

// --- Environment Variable Prerequisites ---
// Before running these tests, create a .env file in the root of your project
// and add the following variables:
//
// TEST_SUPABASE_JWT="your_valid_jwt_token"
// TEST_EXISTING_SET_ID="an_existing_flashcard_set_id"
//
// You can get a JWT from your application's session/local storage after logging in.
// You can get a set ID directly from your Supabase database table 'flashcard_sets'.
// -----------------------------------------

const { TEST_SUPABASE_JWT, TEST_EXISTING_SET_ID } = process.env;

describe("GET /api/v1/sets/{setId}", () => {
  it("should return 401 Unauthorized if no token is provided", async () => {
    const response = await request(API_URL).get(`/api/v1/sets/${TEST_EXISTING_SET_ID}`);
    expect(response.status).toBe(401);
  });

  it("should return 400 Bad Request for an invalid UUID", async () => {
    const response = await request(API_URL)
      .get("/api/v1/sets/invalid-uuid-format")
      .set("Authorization", `Bearer ${TEST_SUPABASE_JWT}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Invalid set ID format");
  });

  it("should return 404 Not Found for a non-existent set ID", async () => {
    const nonExistentId = "00000000-0000-0000-0000-000000000000";
    const response = await request(API_URL)
      .get(`/api/v1/sets/${nonExistentId}`)
      .set("Authorization", `Bearer ${TEST_SUPABASE_JWT}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toContain(`Flashcard set with ID ${nonExistentId} not found`);
  });

  it("should return 200 OK and the flashcard set for a valid request", async () => {
    if (!TEST_SUPABASE_JWT || !TEST_EXISTING_SET_ID) {
      throw new Error("Missing required environment variables: TEST_SUPABASE_JWT or TEST_EXISTING_SET_ID");
    }

    const response = await request(API_URL)
      .get(`/api/v1/sets/${TEST_EXISTING_SET_ID}`)
      .set("Authorization", `Bearer ${TEST_SUPABASE_JWT}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(TEST_EXISTING_SET_ID);
    expect(response.body).toHaveProperty("name");
    expect(response.body).toHaveProperty("flashcards");
    expect(Array.isArray(response.body.flashcards)).toBe(true);
  });
});
