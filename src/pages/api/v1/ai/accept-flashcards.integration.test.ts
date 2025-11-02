import { test, expect, describe } from "vitest";
import { testClient } from "hono/testing";
import { app } from "@/middleware"; 
import { User } from "@supabase/supabase-js";

// Mock user for authenticated requests
const mockUser = { id: "user-2" } as User;
const mockUserWrong = { id: "user-123" } as User;


const validFlashcardsPayload = {
  temp_id: "temp-flashcard-set-123",
  setName: "Test Set from Integration Test",
  source_text: "This is the source text for the test set.",
  flashcards: [
    { front: "Test Front 1", back: "Test Back 1" },
    { front: "Test Front 2", back: "Test Back 2" },
  ],
};

const invalidFlashcardsPayload = {
    ...validFlashcardsPayload,
    setName: "",
  };
  

describe("POST /api/v1/ai/accept-flashcards", () => {
    test("should return 401 for unauthenticated users", async () => {
        const client = testClient(app, { user: undefined });
        const res = await client.api.v1.ai["accept-flashcards"].$post({
          json: validFlashcardsPayload,
        });
        expect(res.status).toBe(401);
      });
    
      test("should return 400 for invalid payload", async () => {
        const client = testClient(app, { user: mockUser });
        const res = await client.api.v1.ai["accept-flashcards"].$post({
          json: invalidFlashcardsPayload,
        });
        expect(res.status).toBe(400);
      });
    
      test("should return 201 and create the flashcard set for a valid payload", async () => {
        const client = testClient(app, { user: mockUser });
        const res = await client.api.v1.ai["accept-flashcards"].$post({
          json: validFlashcardsPayload,
        });
        expect(res.status).toBe(201);
      });
    });
