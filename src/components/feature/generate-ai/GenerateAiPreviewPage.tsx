"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Check, X, Trash2 } from "lucide-react";

import AuthenticatedShell from "@/components/layouts/AuthenticatedShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AiGenerationProvider, useAiGeneration, type AiGeneratedFlashcard } from "@/lib/ai-generation-context";
import { useAuth } from "@/lib/auth-context";
import { AcceptDraftError, useAcceptDraftMutation } from "./hooks";
import { getLanguageLabel } from "./languages";

function GenerateAiPreviewContent() {
  const { token } = useAuth();
  const {
    state: { form, result },
    setResultState,
    reset,
  } = useAiGeneration();
  const acceptDraftMutation = useAcceptDraftMutation();

  const [editableFlashcards, setEditableFlashcards] = useState<AiGeneratedFlashcard[]>(result?.flashcards ?? []);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingFront, setEditingFront] = useState("");
  const [editingBack, setEditingBack] = useState("");

  useEffect(() => {
    if (result?.flashcards) {
      setEditableFlashcards(result.flashcards);
    }
  }, [result?.flashcards]);

  useEffect(() => {
    if (!token) {
      window.location.replace("/login");
    }
  }, [token]);

  useEffect(() => {
    if (!result) {
      toast.error("No AI draft found. Create one first.");
      window.location.replace("/generate-ai");
    }
  }, [result]);

  const handleUpdateCard = useCallback(
    (id: string, updates: Partial<Pick<AiGeneratedFlashcard, "front" | "back">>) => {
      const nextCards = editableFlashcards.map((card) => (card.id === id ? { ...card, ...updates } : card));
      setEditableFlashcards(nextCards);
      if (result) {
        setResultState({ ...result, flashcards: nextCards });
      }
    },
    [editableFlashcards, result, setResultState]
  );

  const handleRemoveCard = useCallback(
    (id: string) => {
      const nextCards = editableFlashcards.filter((card) => card.id !== id);
      setEditableFlashcards(nextCards);
      if (result) {
        setResultState({ ...result, flashcards: nextCards });
      }
      toast.success("Flashcard removed from the draft.");
    },
    [editableFlashcards, result, setResultState]
  );

  const handleStartEditing = (card: AiGeneratedFlashcard) => {
    setEditingCardId(card.id);
    setEditingFront(card.front);
    setEditingBack(card.back);
  };

  const handleCancelEditing = () => {
    setEditingCardId(null);
    setEditingFront("");
    setEditingBack("");
  };

  const handleConfirmEditing = useCallback(() => {
    if (!editingCardId) return;

    if (!editingFront.trim() || !editingBack.trim()) {
      toast.error("Both front and back fields are required.");
      return;
    }

    handleUpdateCard(editingCardId, {
      front: editingFront.trim(),
      back: editingBack.trim(),
    });

    handleCancelEditing();
    toast.success("Flashcard updated in the draft.");
  }, [editingCardId, editingFront, editingBack, handleUpdateCard]);

  const handleSave = async () => {
    if (!token || !result) {
      toast.error("Session expired or draft is missing. Please try again.");
      return;
    }

    const payload = {
      ...result,
      flashcards: editableFlashcards,
    };

    try {
      const createdSet = await acceptDraftMutation.mutateAsync({ token, payload });
      toast.success(`Set "${createdSet.name}" has been saved successfully!`);
      reset();
      window.location.assign(`/sets/${createdSet.id}`);
    } catch (error) {
      if (error instanceof AcceptDraftError) {
        switch (error.type) {
          case "unauthorized":
            toast.error("Session expired. Please log in again.");
            window.location.replace("/login");
            break;
          case "validation":
            toast.error("Invalid data in the draft. Please regenerate it.");
            break;
          default:
            toast.error("Failed to save the draft. Please try again later.");
            break;
        }
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    }
  };

  const handleDiscard = () => {
    reset();
    toast.success("Draft has been discarded.");
    window.location.replace("/generate-ai");
  };

  const flashcardCount = editableFlashcards.length;

  const cardList = useMemo(() => {
    return editableFlashcards.map((card, index) => {
      const isEditing = editingCardId === card.id;
      return (
        <li key={card.id} className="rounded-lg border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/50 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">
            <span>Card {index + 1}</span>
            <div className="flex items-center gap-1">
              {isEditing ? (
                <>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={handleConfirmEditing}
                    aria-label="Confirm changes"
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={handleCancelEditing}
                    aria-label="Cancel editing"
                  >
                    <X className="size-4" />
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => handleStartEditing(card)}
                  aria-label="Edit flashcard"
                >
                  <Pencil className="size-4" />
                </Button>
              )}
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => handleRemoveCard(card.id)}
                aria-label="Remove flashcard"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor={`front-${card.id}`}>
                Front
              </label>
              {isEditing ? (
                <Textarea
                  id={`front-${card.id}`}
                  value={editingFront}
                  onChange={(e) => setEditingFront(e.target.value)}
                  className="text-sm"
                  rows={3}
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm text-foreground">{card.front}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor={`back-${card.id}`}>
                Back
              </label>
              {isEditing ? (
                <Textarea
                  id={`back-${card.id}`}
                  value={editingBack}
                  onChange={(e) => setEditingBack(e.target.value)}
                  className="text-sm"
                  rows={3}
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm text-foreground">{card.back}</p>
              )}
            </div>
          </div>
        </li>
      );
    });
  }, [editableFlashcards, editingCardId, editingFront, editingBack, handleConfirmEditing, handleRemoveCard]);

  const isProcessing = acceptDraftMutation.isPending;

  return (
    <main className="container mx-auto flex flex-1 flex-col gap-6 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">AI draft preview</h1>
          <p className="text-muted-foreground">Review and edit the generated cards before saving the set.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <a href="/generate-ai">Back to prompt</a>
          </Button>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Generated flashcards</CardTitle>
            <CardDescription>Review and edit the generated cards before saving the set.</CardDescription>
          </CardHeader>
          <CardContent>
            {flashcardCount === 0 ? (
              <p className="text-sm text-muted-foreground">No flashcards yet. Run a generation to see results here.</p>
            ) : (
              <ol className="space-y-3" aria-live="polite">
                {cardList}
              </ol>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Set details</CardTitle>
              <CardDescription>Snapshot of the prompt used for this generation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground/80">Set name</p>
                <p className="text-base text-foreground">{form?.setName ?? result?.setName ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground/80">Front language</p>
                <p className="text-base text-foreground">
                  {getLanguageLabel(result?.languages?.front ?? form?.frontLanguage)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground/80">Back language</p>
                <p className="text-base text-foreground">
                  {getLanguageLabel(result?.languages?.back ?? form?.backLanguage)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground/80">Requested limit</p>
                <p className="text-base text-foreground">
                  {result?.flashcardLimit ?? form?.flashcardLimit ?? "Not set"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground/80">Temperature</p>
                <p className="text-base text-foreground">{result?.temperature ?? form?.temperature ?? "Default"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Save the set or discard the draft.</CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col gap-3">
              <Button
                type="button"
                className="w-full"
                onClick={handleSave}
                disabled={isProcessing || flashcardCount === 0}
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : "Save set"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleDiscard}
                disabled={isProcessing}
              >
                Discard draft
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>
    </main>
  );
}

export function GenerateAiPreviewPage() {
  return (
    <AuthenticatedShell>
      <AiGenerationProvider>
        <GenerateAiPreviewContent />
      </AiGenerationProvider>
    </AuthenticatedShell>
  );
}

export default GenerateAiPreviewPage;
