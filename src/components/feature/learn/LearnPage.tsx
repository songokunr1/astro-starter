"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpenCheck, Eye, EyeOff, Loader2, PlayCircle, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import AuthenticatedShell from "@/components/layouts/AuthenticatedShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import type {
  FlashcardSetSummaryDto,
  LearningSessionFlashcardDto,
  PaginatedResponseDto,
  SubmitReviewCommand,
} from "@/types";

interface LearningSessionResponse {
  data: LearningSessionFlashcardDto[] | null;
}

export async function fetchFlashcardSets(token: string): Promise<FlashcardSetSummaryDto[]> {
  const response = await fetch("/api/v1/sets?page=1&pageSize=50&sortBy=updated_at&sortOrder=desc", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Nie udało się pobrać listy zestawów.");
  }

  const body = (await response.json()) as PaginatedResponseDto<FlashcardSetSummaryDto>;
  return body.data;
}

export async function fetchLearningSessionCards(
  token: string,
  params: { setId: string; limit: number }
): Promise<LearningSessionFlashcardDto[]> {
  const search = new URLSearchParams({
    setId: params.setId,
    limit: String(params.limit),
  });

  const response = await fetch(`/api/v1/learning/session?${search.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.message ?? "Nie udało się zbudować sesji nauki.");
  }

  const payload = (await response.json()) as LearningSessionResponse;
  return payload.data ?? [];
}

export async function submitReviewRequest(token: string, payload: SubmitReviewCommand) {
  const response = await fetch("/api/v1/learning/review", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.message ?? "Nie udało się zapisać odpowiedzi.");
  }

  return response.json();
}

const ratingOptions = [
  { quality: 0, label: "0 • Nie pamiętam", helper: "Powtórz natychmiast", shortcut: "0" },
  { quality: 1, label: "1 • Bardzo trudno", helper: "Potrzebuję wskazówek", shortcut: "1" },
  { quality: 2, label: "2 • Trudno", helper: "Prawie się udało", shortcut: "2" },
  { quality: 3, label: "3 • W porządku", helper: "Zapamiętałem część", shortcut: "3" },
  { quality: 4, label: "4 • Dobrze", helper: "Bez większego wysiłku", shortcut: "4" },
  { quality: 5, label: "5 • Łatwo", helper: "Mam to w małym palcu", shortcut: "5" },
] as const;

interface SessionSummary {
  reviewed: number;
  durationMs: number;
}

function formatDuration(durationMs: number) {
  if (durationMs <= 0) {
    return "0 s";
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function LearnPageContent() {
  const { token } = useAuth();
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState("10");
  const [sessionQueue, setSessionQueue] = useState<LearningSessionFlashcardDto[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);

  useEffect(() => {
    if (!token) {
      window.location.replace("/login");
    }
  }, [token]);

  const {
    data: sets,
    isLoading: isLoadingSets,
    isError: isSetsError,
  } = useQuery({
    queryKey: ["flashcardSets", token],
    queryFn: () => fetchFlashcardSets(token as string),
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!selectedSetId && sets && sets.length > 0) {
      setSelectedSetId(sets[0].id);
    }
  }, [selectedSetId, sets]);

  const selectedSet = useMemo(() => sets?.find((set) => set.id === selectedSetId), [sets, selectedSetId]);

  const startSessionMutation = useMutation({
    mutationFn: (variables: { setId: string; limit: number }) => fetchLearningSessionCards(token as string, variables),
    onSuccess: (cards) => {
      if (cards.length === 0) {
        toast.info("Brak fiszek do powtórki w tym zestawie.");
        return;
      }

      setSessionQueue(cards);
      setSessionTotal(cards.length);
      setReviewedCount(0);
      setIsAnswerVisible(false);
      setSessionSummary(null);
      setSessionStartedAt(Date.now());
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Nie udało się wystartować sesji nauki.";
      toast.error(message);
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: SubmitReviewCommand) => submitReviewRequest(token as string, payload),
    onSuccess: (_, variables) => {
      setSessionQueue((prev) => prev.slice(1));
      setReviewedCount((prev) => {
        const next = prev + 1;
        if (next === sessionTotal) {
          setSessionSummary({
            reviewed: next,
            durationMs: sessionStartedAt ? Date.now() - sessionStartedAt : 0,
          });
        }
        return next;
      });
      setIsAnswerVisible(false);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Nie udało się zapisać odpowiedzi.";
      toast.error(message);
    },
  });

  const activeCard = sessionQueue[0] ?? null;
  const progressPercent = sessionTotal === 0 ? 0 : Math.round((reviewedCount / sessionTotal) * 100);
  const queueRemaining = sessionQueue.length;

  const handleStartSession = () => {
    if (!selectedSetId) {
      toast.error("Wybierz zestaw, aby rozpocząć.");
      return;
    }

    const parsedLimit = Number.parseInt(limitInput, 10);

    if (Number.isNaN(parsedLimit)) {
      toast.error("Limit kart musi być liczbą.");
      return;
    }

    if (parsedLimit < 1 || parsedLimit > 100) {
      toast.error("Limit kart musi mieścić się w zakresie 1-100.");
      return;
    }

    startSessionMutation.mutate({ setId: selectedSetId, limit: parsedLimit });
  };

  const handleResetSession = () => {
    setSessionQueue([]);
    setSessionTotal(0);
    setReviewedCount(0);
    setIsAnswerVisible(false);
    setSessionSummary(null);
    setSessionStartedAt(null);
  };

  const handleReveal = () => {
    if (!activeCard) {
      return;
    }
    setIsAnswerVisible(true);
  };

  const handleReview = useCallback(
    (quality: number) => {
      if (!activeCard || reviewMutation.isPending) {
        return;
      }
      reviewMutation.mutate({
        flashcard_id: activeCard.flashcard_id,
        quality,
      });
    },
    [activeCard, reviewMutation]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!activeCard) {
        return;
      }

      if (event.code === "Space" && !isAnswerVisible) {
        event.preventDefault();
        handleReveal();
        return;
      }

      if (!isAnswerVisible) {
        return;
      }

      const mapping: Record<string, number> = {
        Digit0: 0,
        Digit1: 1,
        Digit2: 2,
        Digit3: 3,
        Digit4: 4,
        Digit5: 5,
        Numpad0: 0,
        Numpad1: 1,
        Numpad2: 2,
        Numpad3: 3,
        Numpad4: 4,
        Numpad5: 5,
      };

      const quality = mapping[event.code];
      if (typeof quality === "number") {
        event.preventDefault();
        handleReview(quality);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeCard, handleReview, isAnswerVisible]);

  const hasSets = (sets?.length ?? 0) > 0;
  const isSessionActive = sessionTotal > 0 && queueRemaining > 0;

  if (!token) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase text-primary">
          <BookOpenCheck className="h-4 w-4" />
          Tryb nauki
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sesja powtórek</h1>
          <p className="text-muted-foreground">
            Wybierz zestaw, odsłoń odpowiedź i oceń swoją pamięć w skali SM‑2 (0-5).
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Plan sesji</CardTitle>
            <CardDescription>Filtruj fiszki według zestawu i liczby kart w kolejce.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="set-select">
                Zestaw fiszek
              </label>
              <select
                id="set-select"
                value={selectedSetId ?? ""}
                onChange={(event) => setSelectedSetId(event.target.value)}
                disabled={isLoadingSets || !hasSets}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed"
              >
                {!selectedSetId && <option value="">Wybierz zestaw</option>}
                {sets?.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.name}
                  </option>
                ))}
              </select>
              {isLoadingSets && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Ładuję zestawy...
                </p>
              )}
              {isSetsError && (
                <p className="text-sm text-destructive">Nie udało się pobrać zestawów. Odśwież stronę.</p>
              )}
              {!isLoadingSets && !hasSets && (
                <div className="rounded-md border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                  Nie masz jeszcze żadnych zestawów.{" "}
                  <Button asChild variant="link" size="sm" className="px-1">
                    <a href="/generate">Przejdź do generatora</a>
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="limit-input">
                Limit kart na sesję
              </label>
              <Input
                id="limit-input"
                type="number"
                min={1}
                max={100}
                value={limitInput}
                onChange={(event) => setLimitInput(event.target.value)}
                disabled={!hasSets || startSessionMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">Zakres 1-100. Domyślnie: 10 kart.</p>
            </div>

            <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <p className="text-muted-foreground">Postęp sesji</p>
              <div className="flex items-center justify-between text-sm font-medium">
                <span>
                  {reviewedCount}/{sessionTotal} fiszek
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                Pozostało {queueRemaining} fiszek{selectedSet ? ` w “${selectedSet.name}”` : ""}.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={handleStartSession}
                disabled={!hasSets || !selectedSetId || startSessionMutation.isPending}
              >
                {startSessionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ładuję fiszki...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Start
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleResetSession}
                disabled={sessionTotal === 0 && queueRemaining === 0}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Resetuj
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="relative min-h-[420px]">
          <CardHeader>
            <CardTitle>Aktywna fiszka</CardTitle>
            <CardDescription>
              {selectedSet ? `Zestaw: ${selectedSet.name}` : "Wybierz zestaw, aby przejść do sesji."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex h-full flex-col gap-4">
            {!hasSets && (
              <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
                <p>Zacznij od utworzenia zestawu fiszek.</p>
              </div>
            )}

            {hasSets && !isSessionActive && !activeCard && !sessionSummary && (
              <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
                <p>Wybierz zestaw i kliknij „Start”, aby rozpocząć powtórkę.</p>
                <p className="text-xs">Skróty: Spacja – pokaż odpowiedź, 0-5 – oceń.</p>
              </div>
            )}

            {sessionSummary && !isSessionActive && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                <h3 className="text-base font-semibold">Sesja zakończona</h3>
                <p className="text-muted-foreground">
                  Przerobione fiszki: {sessionSummary.reviewed}. Czas: {formatDuration(sessionSummary.durationMs)}.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={handleStartSession}>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Nowa sesja
                  </Button>
                  <Button type="button" size="sm" variant="outline" asChild>
                    <a href="/sets">Przeglądaj zestawy</a>
                  </Button>
                </div>
              </div>
            )}

            {activeCard && (
              <>
                <div className="space-y-2">
                  <p className="text-xs uppercase text-muted-foreground">Awers</p>
                  <div className="rounded-lg border border-dashed border-border bg-background/60 p-4 text-lg font-medium leading-relaxed text-foreground">
                    {activeCard.front}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase text-muted-foreground">Rewers</p>
                  <div
                    className={cn(
                      "rounded-lg border border-border bg-muted/30 p-4 text-base leading-relaxed transition-all",
                      isAnswerVisible ? "text-foreground" : "text-muted-foreground blur-sm"
                    )}
                  >
                    {activeCard.back}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {!isAnswerVisible ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleReveal}
                      className="self-start"
                      disabled={reviewMutation.isPending}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Pokaż odpowiedź (Spacja)
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="self-start"
                      onClick={() => setIsAnswerVisible(false)}
                    >
                      <EyeOff className="mr-2 h-4 w-4" />
                      Ukryj odpowiedź
                    </Button>
                  )}

                  <div className="rounded-lg border border-dashed border-border p-3">
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Ocena (0-5)</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {ratingOptions.map((option) => (
                        <Button
                          key={option.quality}
                          type="button"
                          variant={option.quality <= 1 ? "destructive" : option.quality >= 4 ? "default" : "secondary"}
                          className="justify-start px-3 text-left"
                          disabled={!isAnswerVisible || reviewMutation.isPending}
                          onClick={() => handleReview(option.quality)}
                        >
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-background text-xs font-semibold text-foreground">
                            {option.shortcut}
                          </span>
                          <div className="ml-3 flex flex-col whitespace-normal">
                            <span className="text-sm font-semibold">{option.label}</span>
                            <span className="text-xs text-muted-foreground">{option.helper}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Skróty: 0-5 po odsłonięciu odpowiedzi.</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LearnPage() {
  return (
    <AuthenticatedShell>
      <LearnPageContent />
    </AuthenticatedShell>
  );
}
