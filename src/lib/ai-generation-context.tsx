"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { z } from "zod";

export const AiGenerationFormSchema = z.object({
  setName: z
    .string()
    .min(3, "Set name must be at least 3 characters long.")
    .max(80, "Set name can have up to 80 characters."),
  sourceText: z
    .string()
    .min(40, "Provide at least 40 characters of learning material.")
    .max(10_000, "Source text is too long (limit 10 000 characters)."),
  frontLanguage: z
    .string()
    .min(2, "Language code should be at least 2 characters.")
    .max(10, "Language value is too long.")
    .default("pl"),
  backLanguage: z
    .string()
    .min(2, "Language code should be at least 2 characters.")
    .max(10, "Language value is too long.")
    .default("pl"),
  flashcardLimit: z
    .number({ invalid_type_error: "Flashcard limit must be a number." })
    .int("Flashcard limit must be an integer.")
    .min(0, "Flashcard limit cannot be negative.")
    .optional(),
  temperature: z
    .number({ invalid_type_error: "Temperature must be a number." })
    .min(0, "Temperature cannot be below 0.")
    .max(1, "Temperature cannot exceed 1.")
    .optional(),
});

export type AiGenerationFormState = z.infer<typeof AiGenerationFormSchema>;
export type AiGenerationFormInput = z.input<typeof AiGenerationFormSchema>;

export interface AiGeneratedFlashcard {
  id: string;
  front: string;
  back: string;
}

export interface AiGenerationResultState {
  tempId?: string;
  setName: string;
  sourceText: string;
  flashcards: AiGeneratedFlashcard[];
  generatedAt: string;
  languages: {
    front: string;
    back: string;
  };
  flashcardLimit?: number;
  temperature?: number;
  model?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export type AiGenerationStatus = "idle" | "submitting" | "ready";

interface AiGenerationState {
  form: AiGenerationFormState | null;
  result: AiGenerationResultState | null;
  status: AiGenerationStatus;
}

interface AiGenerationContextValue {
  state: AiGenerationState;
  setFormState: (form: AiGenerationFormState | null) => void;
  setResultState: (result: AiGenerationResultState | null, nextStatus?: AiGenerationStatus) => void;
  setStatus: (status: AiGenerationStatus) => void;
  reset: () => void;
}

const STORAGE_KEY = "ai-generation-state";

const blankState: AiGenerationState = {
  status: "idle",
  form: null,
  result: null,
};

const mockState: AiGenerationState = {
  status: "ready",
  form: AiGenerationFormSchema.parse({
    setName: "Neurobiology Basics",
    sourceText:
      "Neurons are specialized cells responsible for transmitting information through electrochemical signals.\n" +
      "The synapse is the junction between two neurons, where neurotransmitters facilitate communication.",
    frontLanguage: "pl",
    backLanguage: "pl",
    flashcardLimit: 6,
    temperature: 0.4,
  }),
  result: {
    tempId: "mock-temp-id",
    setName: "Neurobiology Basics",
    sourceText:
      "Neurons are specialized cells responsible for transmitting information through electrochemical signals.\n" +
      "The synapse is the junction between two neurons, where neurotransmitters facilitate communication.",
    generatedAt: new Date().toISOString(),
    model: "mock-gpt-4o-mini",
    languages: {
      front: "pl",
      back: "pl",
    },
    flashcardLimit: 6,
    temperature: 0.4,
    tokenUsage: {
      prompt: 512,
      completion: 238,
      total: 750,
    },
    flashcards: [
      {
        id: "card-1",
        front: "Czym jest neuron i jaka jest jego podstawowa funkcja?",
        back: "Neuron to wyspecjalizowana komórka nerwowa odpowiedzialna za przewodzenie impulsów elektrycznych i przekazywanie informacji w układzie nerwowym.",
      },
      {
        id: "card-2",
        front: "Jaką rolę pełni dendryt w neuronie?",
        back: "Dendryt odbiera sygnały od innych neuronów i przekazuje je do ciała komórki nerwowej.",
      },
      {
        id: "card-3",
        front: "Co to jest akson?",
        back: "Akson to długa wypustka neuronu, która przewodzi impuls nerwowy od ciała komórki do kolejnych komórek nerwowych lub efektorów.",
      },
      {
        id: "card-4",
        front: "Czym jest synapsa?",
        back: "Synapsa to miejsce kontaktu między dwoma neuronami, w którym impuls przekazywany jest za pomocą neuroprzekaźników.",
      },
      {
        id: "card-5",
        front: "Jakie znaczenie mają neuroprzekaźniki?",
        back: "Neuroprzekaźniki są chemicznymi substancjami, które pozwalają na przekazywanie sygnałów przez synapsę z jednego neuronu do drugiego.",
      },
      {
        id: "card-6",
        front: "Dlaczego osłonka mielinowa jest ważna dla funkcjonowania neuronu?",
        back: "Osłonka mielinowa izoluje akson i przyspiesza przewodzenie impulsów nerwowych, co zwiększa efektywność komunikacji między neuronami.",
      },
    ],
  },
};

function getInitialState(): AiGenerationState {
  if (typeof window === "undefined") {
    return blankState;
  }

  const storedValue = window.sessionStorage.getItem(STORAGE_KEY);

  if (storedValue) {
    try {
      const parsed = JSON.parse(storedValue) as AiGenerationState;
      let form: AiGenerationFormState | null = null;

      if (parsed.form) {
        const validated = AiGenerationFormSchema.safeParse(parsed.form);
        if (validated.success) {
          form = validated.data;
        }
      }

      const languages = {
        front: form?.frontLanguage ?? "pl",
        back: form?.backLanguage ?? "pl",
      };

      return {
        status: parsed.status ?? "idle",
        form,
        result: parsed.result
          ? {
              ...parsed.result,
              languages: parsed.result.languages ?? languages,
              setName: parsed.result.setName ?? form?.setName ?? "",
              sourceText: parsed.result.sourceText ?? form?.sourceText ?? "",
              flashcardLimit:
                parsed.result.flashcardLimit && parsed.result.flashcardLimit > 0
                  ? parsed.result.flashcardLimit
                  : undefined,
            }
          : null,
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn("Failed to parse ai-generation state from sessionStorage", error);
      }
    }
  }

  return import.meta.env.DEV ? mockState : blankState;
}

const AiGenerationContext = createContext<AiGenerationContextValue | undefined>(undefined);

export function AiGenerationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AiGenerationState>(getInitialState);

  const setFormState = useCallback((form: AiGenerationFormState | null) => {
    setState((previous) => ({
      ...previous,
      form,
    }));
  }, []);

  const setResultState = useCallback((result: AiGenerationResultState | null, nextStatus?: AiGenerationStatus) => {
    setState((previous) => ({
      ...previous,
      result,
      status: nextStatus ?? previous.status,
    }));
  }, []);

  const setStatus = useCallback((status: AiGenerationStatus) => {
    setState((previous) => ({
      ...previous,
      status,
    }));
  }, []);

  const reset = useCallback(() => {
    setState(blankState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (state.status === "idle" && !state.form && !state.result) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn("Failed to persist ai-generation state", error);
      }
    }
  }, [state]);

  const value = useMemo<AiGenerationContextValue>(
    () => ({
      state,
      setFormState,
      setResultState,
      setStatus,
      reset,
    }),
    [state, setFormState, setResultState, setStatus, reset]
  );

  return <AiGenerationContext.Provider value={value}>{children}</AiGenerationContext.Provider>;
}

export function useAiGeneration() {
  const context = useContext(AiGenerationContext);

  if (!context) {
    throw new Error("useAiGeneration must be used within AiGenerationProvider");
  }

  return context;
}
