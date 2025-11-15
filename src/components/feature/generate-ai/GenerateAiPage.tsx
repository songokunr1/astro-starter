"use client";

import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import AuthenticatedShell from "@/components/layouts/AuthenticatedShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AiGenerationFormSchema,
  type AiGenerationFormInput,
  type AiGenerationFormState,
  AiGenerationProvider,
  type AiGenerationResultState,
  useAiGeneration,
} from "@/lib/ai-generation-context";
import { useAuth } from "@/lib/auth-context";
import { GenerateAiError, useGenerateAiDraftMutation } from "./hooks";
import { LANGUAGE_OPTIONS, getLanguageLabel, getQuestionPrefix } from "./languages";

function normalizeFlashcardLimit(limit?: number | null): number | undefined {
  if (typeof limit !== "number" || Number.isNaN(limit)) {
    return undefined;
  }

  const floored = Math.floor(limit);

  if (floored <= 0) {
    return undefined;
  }

  return floored;
}

function createDraftFromForm(values: AiGenerationFormState): AiGenerationResultState {
  const segments = values.sourceText
    .split(/\n+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const normalizedLimit = normalizeFlashcardLimit(values.flashcardLimit);

  const finalSegments = segments.length > 0 ? segments : [values.sourceText.trim()];

  const selectedSegments = normalizedLimit ? finalSegments.slice(0, normalizedLimit) : finalSegments;

  const cards = selectedSegments.map((segment, index) => {
    const summary = segment.length > 120 ? `${segment.slice(0, 117)}...` : segment;
    const questionPrefix = getQuestionPrefix(values.frontLanguage);

    const front = `${questionPrefix} #${index + 1}?`;

    return {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `card-${Date.now()}-${index}`,
      front,
      back: summary,
    };
  });

  const promptTokens = values.sourceText.length;
  const completionTokens = cards.reduce((acc, card) => acc + card.back.length, 0);

  return {
    tempId: `mock-${Date.now()}`,
    setName: values.setName,
    sourceText: values.sourceText,
    flashcards: cards,
    generatedAt: new Date().toISOString(),
    languages: {
      front: values.frontLanguage,
      back: values.backLanguage,
    },
    flashcardLimit: normalizedLimit,
    temperature: values.temperature ?? undefined,
    model: "mock-draft-generator",
    tokenUsage: {
      prompt: promptTokens,
      completion: completionTokens,
      total: promptTokens + completionTokens,
    },
  };
}

function mapFlashcardsWithIds(cards: { front: string; back: string }[]): AiGenerationResultState["flashcards"] {
  return cards.map((card, index) => ({
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `card-${Date.now()}-${index}`,
    front: card.front,
    back: card.back,
  }));
}

function GenerateAiPageContent() {
  const { token } = useAuth();
  const {
    state: { form, status, result },
    setFormState,
    setResultState,
    setStatus,
  } = useAiGeneration();
  const generateDraftMutation = useGenerateAiDraftMutation();

  const defaultFlashcardLimit = form ? normalizeFlashcardLimit(form.flashcardLimit) : 10;

  useEffect(() => {
    if (!token) {
      window.location.replace("/login");
    }
  }, [token]);

  const formInstance = useForm<AiGenerationFormInput, undefined, AiGenerationFormState>({
    resolver: zodResolver(AiGenerationFormSchema),
    mode: "onChange",
    defaultValues: {
      setName: form?.setName ?? "",
      sourceText: form?.sourceText ?? "",
      frontLanguage: form?.frontLanguage ?? "pl",
      backLanguage: form?.backLanguage ?? "pl",
      flashcardLimit: defaultFlashcardLimit,
      temperature: form?.temperature ?? 0.4,
    },
  });

  const {
    control,
    handleSubmit,
    formState: { isValid, isSubmitting },
    watch,
  } = formInstance;

  useEffect(() => {
    const subscription = watch((currentValues) => {
      const parsed = AiGenerationFormSchema.safeParse(currentValues);
      if (!parsed.success) {
        setFormState(null);
        return;
      }

      const normalized: AiGenerationFormState = {
        ...parsed.data,
        flashcardLimit: normalizeFlashcardLimit(parsed.data.flashcardLimit),
      };

      setFormState(normalized);
    });

    return () => subscription.unsubscribe();
  }, [setFormState, watch]);

  const flashcardCount = result?.flashcards.length ?? 0;

  const statusLabel = useMemo(() => {
    switch (status) {
      case "submitting":
        return "Generating";
      case "ready":
        return "Ready";
      default:
        return "Idle";
    }
  }, [status]);

  const onSubmit = async (values: AiGenerationFormState) => {
    if (!token) {
      toast.error("Session expired. Please log in again.");
      window.location.replace("/login");
      return;
    }

    setStatus("submitting");
    setFormState(values);

    try {
      const response = await generateDraftMutation.mutateAsync({ token, payload: values });

      const cards = Array.isArray(response.flashcards) ? response.flashcards : [];

      const draft: AiGenerationResultState = {
        tempId: response.temp_id ?? `temp-${Date.now()}`,
        setName: response.setName ?? values.setName,
        sourceText: response.source_text ?? values.sourceText,
        flashcards: mapFlashcardsWithIds(cards),
        generatedAt: new Date().toISOString(),
        languages: {
          front: values.frontLanguage,
          back: values.backLanguage,
        },
        flashcardLimit: values.flashcardLimit && values.flashcardLimit > 0 ? values.flashcardLimit : undefined,
        temperature: values.temperature ?? undefined,
        model: "openai/gpt-3.5-turbo",
      };

      setResultState(draft, "ready");
      toast.success("AI draft prepared. Review it before saving.");
      window.location.assign("/generate-ai/preview");
    } catch (error) {
      setStatus("idle");
      if (error instanceof GenerateAiError) {
        switch (error.type) {
          case "unauthorized":
            toast.error("Session expired. Please log in again.");
            window.location.replace("/login");
            return;
          case "rate-limit": {
            const retrySuffix = error.retryAfter ? ` Spróbuj ponownie za ${error.retryAfter} s.` : "";
            toast.error(`Limit zapytań do AI został osiągnięty.${retrySuffix}`);
            break;
          }
          case "validation":
            toast.error(error.message || "Provided data is invalid.");
            break;
          case "server":
            if (import.meta.env.DEV) {
              const draft = createDraftFromForm(values);
              setResultState(draft, "ready");
              toast.warning("AI service niedostępna, używam trybu mock.");
              window.location.assign("/generate-ai/preview");
              return;
            }
            toast.error("Serwer AI ma problem, spróbuj później.");
            break;
          case "network":
          default:
            toast.error("Problem z połączeniem. Sprawdź sieć i spróbuj ponownie.");
            break;
        }
        return;
      }

      toast.error("Failed to generate flashcards. Try again.");
    }
  };

  const disableSubmit = status === "submitting" || isSubmitting || generateDraftMutation.isPending || !isValid;

  return (
    <main className="container mx-auto flex flex-1 flex-col gap-6 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Generate flashcards with AI</h1>
          <p className="text-muted-foreground">
            Provide learning material, pick a language, and let the AI craft a ready-to-review flashcard set.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary">
            <a href="/generate-ai/preview">Open preview</a>
          </Button>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Describe your flashcard set</CardTitle>
            <CardDescription>
              Fill the form and let the AI summarise your learning material into a draft flashcard set.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...formInstance}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={control}
                  name="setName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Set name</FormLabel>
                      <FormControl>
                        <Input placeholder="Intro to neurobiology" {...field} />
                      </FormControl>
                      <FormDescription>Visible title for your future flashcard set.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="sourceText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source text</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={10}
                          className="resize-y"
                          placeholder="Paste the lesson notes or article excerpt here"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide the content that the AI should transform into question & answer flashcards.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={control}
                    name="frontLanguage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Front language</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {LANGUAGE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormDescription>
                          Language that will be used for the question (front) side of each flashcard.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="backLanguage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Back language</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {LANGUAGE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormDescription>Language for the answer (back) side.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={control}
                  name="flashcardLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flashcard limit (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          placeholder="10"
                          value={field.value ?? ""}
                          onChange={(event) => {
                            const rawValue = event.target.value;

                            if (rawValue === "") {
                              field.onChange(undefined);
                              return;
                            }

                            const parsed = Number(rawValue);

                            if (Number.isNaN(parsed)) {
                              return;
                            }

                            const normalized = parsed <= 0 ? 0 : Math.floor(parsed);
                            field.onChange(normalized);
                          }}
                          onBlur={(event) => {
                            const rawValue = event.target.value;

                            if (rawValue === "") {
                              field.onChange(undefined);
                              return;
                            }

                            const parsed = Number(rawValue);

                            if (Number.isNaN(parsed)) {
                              field.onChange(undefined);
                              return;
                            }

                            const normalized = parsed <= 0 ? 0 : Math.floor(parsed);
                            field.onChange(normalized);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Leave empty or set to 0 to let AI decide how many cards are needed.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperature (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step={0.1}
                          min={0}
                          max={1}
                          placeholder="0.4"
                          value={field.value ?? ""}
                          onChange={(event) => {
                            const nextValue = event.target.valueAsNumber;
                            field.onChange(Number.isNaN(nextValue) ? undefined : nextValue);
                          }}
                          onBlur={(event) => {
                            const nextValue = event.target.valueAsNumber;
                            if (Number.isNaN(nextValue)) {
                              return;
                            }

                            const clamped = Math.min(Math.max(nextValue, 0), 1);
                            if (clamped !== nextValue) {
                              field.onChange(clamped);
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>Lower values ensure more deterministic answers.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col items-start gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Submit to generate a draft. You can edit and accept cards on the preview screen.
                  </p>
                  <Button type="submit" disabled={disableSubmit} className="min-w-[160px]">
                    {status === "submitting" || isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating
                      </>
                    ) : (
                      "Generate with AI"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Generation status</CardTitle>
            <CardDescription>Live preview of data stored in AiGenerationContext.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Status</span>
              <span
                className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                aria-live="polite"
              >
                {statusLabel}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Flashcards prepared</span>
              <span className="text-base font-semibold">{flashcardCount}</span>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Front language: {getLanguageLabel(result?.languages?.front ?? form?.frontLanguage ?? "pl")}</p>
              <p>Back language: {getLanguageLabel(result?.languages?.back ?? form?.backLanguage ?? "pl")}</p>
              <p>
                Flashcard limit:{" "}
                {result?.flashcardLimit && result.flashcardLimit > 0
                  ? result.flashcardLimit
                  : form?.flashcardLimit && form.flashcardLimit > 0
                    ? form.flashcardLimit
                    : "AI decides"}
              </p>
              <p>Temperature: {result?.temperature ?? form?.temperature ?? "Default"}</p>
              <p>Generated at: {result?.generatedAt ? new Date(result.generatedAt).toLocaleString() : "–"}</p>
              <p>Model: {result?.model ?? "–"}</p>
              {result?.tokenUsage && (
                <p>
                  Tokens: {result.tokenUsage.total} (prompt {result.tokenUsage.prompt} + completion{" "}
                  {result.tokenUsage.completion})
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export function GenerateAiPage() {
  return (
    <AuthenticatedShell>
      <AiGenerationProvider>
        <GenerateAiPageContent />
      </AiGenerationProvider>
    </AuthenticatedShell>
  );
}

export default GenerateAiPage;
