import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { generateFlashcardsFromText } from "../../../../lib/services/aiService";
import { checkRateLimit } from "../../../../lib/rate-limiter";

// Mock the external dependencies
vi.mock("../../../../lib/services/aiService");
vi.mock("../../../../lib/rate-limiter");

const API_URL = "http://localhost:4321"; // Default Astro dev port
const { TEST_SUPABASE_JWT } = process.env;

describe("POST /api/v1/ai/generate-flashcards", () => {
  beforeEach(() => {
    if (!TEST_SUPABASE_JWT) {
      throw new Error("Missing required environment variable: TEST_SUPABASE_JWT");
    }
    // Default mock for successful rate limit check
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return 401 Unauthorized if no token is provided", async () => {
    const response = await request(API_URL).post("/api/v1/ai/generate-flashcards").send({
      setName: "Test Set",
      source_text: "This is a test.",
    });
    expect(response.status).toBe(401);
  });

  it("should return 400 Bad Request for invalid input (missing setName)", async () => {
    const response = await request(API_URL)
      .post("/api/v1/ai/generate-flashcards")
      .set("Authorization", `Bearer ${TEST_SUPABASE_JWT}`)
      .send({
        source_text: "This is a test.",
      });
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Invalid input");
  });

  it("should return 429 Too Many Requests if rate limited", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, retryAfter: 60 });

    const response = await request(API_URL)
      .post("/api/v1/ai/generate-flashcards")
      .set("Authorization", `Bearer ${TEST_SUPABASE_JWT}`)
      .send({
        setName: "Test Set",
        source_text: "This is a test.",
      });

    expect(response.status).toBe(429);
    expect(response.body.message).toContain("Too Many Requests");
    expect(response.headers["retry-after"]).toBe("60");
  });

  it("should return 500 Internal Server Error if AI service fails", async () => {
    const errorMessage = "AI service failed";
    vi.mocked(generateFlashcardsFromText).mockResolvedValue({ data: null, error: errorMessage });

    const response = await request(API_URL)
      .post("/api/v1/ai/generate-flashcards")
      .set("Authorization", `Bearer ${TEST_SUPABASE_JWT}`)
      .send({
        setName: "Test Set",
        source_text: "This is a test.",
      });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe(errorMessage);
  });

  it("should return 200 OK and the generated flashcards for a valid request", async () => {
    const mockResponse = {
      temp_id: "temp-uuid",
      setName: "Test Set",
      source_text: "This is a test.",
      flashcards: [{ front: "Q1", back: "A1" }],
    };
    vi.mocked(generateFlashcardsFromText).mockResolvedValue({ data: mockResponse, error: null });

    const response = await request(API_URL)
      .post("/api/v1/ai/generate-flashcards")
      .set("Authorization", `Bearer ${TEST_SUPABASE_JWT}`)
      .send({
        setName: "Test Set",
        source_text: "This is a test.",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockResponse);
    expect(generateFlashcardsFromText).toHaveBeenCalledWith({
      setName: "Test Set",
      source_text: "This is a test.",
    });
  });
});
