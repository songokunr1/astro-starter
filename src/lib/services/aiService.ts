import type { AiGeneratedFlashcard, GenerateFlashcardsCommand, GenerateFlashcardsResponseDto } from "../../../types";

const SYSTEM_PROMPT = `You are an expert in creating concise and effective flashcards.
Your task is to generate a list of flashcards from the provided text.
Each flashcard must have a 'front' (the question or term) and a 'back' (the answer or definition).
The flashcards should be returned as a valid JSON array of objects, where each object has a "front" and a "back" key.
Do not include any other text or explanations in your response, only the JSON array.

Example response:
[
  {
    "front": "What is the capital of Poland?",
    "back": "Warsaw"
  },
  {
    "front": "What is the powerhouse of the cell?",
    "back": "Mitochondria"
  }
]`;

export async function generateFlashcardsFromText(
  command: GenerateFlashcardsCommand
): Promise<{ data: GenerateFlashcardsResponseDto | null; error: string | null }> {
  try {
    const { source_text, setName } = command;
    const openrouterApiKey = import.meta.env.OPENROUTER_API_KEY;

    if (!openrouterApiKey) {
      console.error("OPENROUTER_API_KEY is not set.");
      return { data: null, error: "AI service is not configured." };
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b:free",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: source_text },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI service request failed with status ${response.status}: ${errorText}`);
      return { data: null, error: `AI service failed: ${response.statusText}` };
    }

    const jsonResponse = await response.json();
    const content = jsonResponse.choices[0]?.message?.content;

    if (!content) {
      console.error("AI service returned an empty response.");
      return { data: null, error: "AI service returned an empty response." };
    }

    const flashcards: AiGeneratedFlashcard[] = JSON.parse(content);

    const result: GenerateFlashcardsResponseDto = {
      temp_id: crypto.randomUUID(),
      setName,
      source_text,
      flashcards,
    };

    return { data: result, error: null };
  } catch (error) {
    console.error("Error generating flashcards:", error);
    if (error instanceof SyntaxError) {
      return { data: null, error: "Failed to parse AI service response." };
    }
    return { data: null, error: "An unexpected error occurred while generating flashcards." };
  }
}
