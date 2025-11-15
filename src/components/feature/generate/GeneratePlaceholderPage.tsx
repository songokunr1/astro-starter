"use client";

import { useEffect, useMemo, useState } from "react";

import AuthenticatedShell from "@/components/layouts/AuthenticatedShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import type { FlashcardSetDetailDto, FlashcardSetSummaryDto, PaginatedResponseDto } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, PlusCircle, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface CreateSetPayload {
  name: string;
  description?: string;
}

interface CreateFlashcardPayload {
  setId: string;
  front: string;
  back: string;
}

async function fetchSets(token: string): Promise<FlashcardSetSummaryDto[]> {
  const response = await fetch("/api/v1/sets?page=1&pageSize=50", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load flashcard sets");
  }

  const data = (await response.json()) as PaginatedResponseDto<FlashcardSetSummaryDto>;
  return data.data;
}

async function fetchSetDetail(token: string, setId: string): Promise<FlashcardSetDetailDto> {
  const response = await fetch(`/api/v1/sets/${setId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load flashcards");
  }

  return response.json() as Promise<FlashcardSetDetailDto>;
}

async function createSet(token: string, payload: CreateSetPayload) {
  const response = await fetch("/api/v1/sets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to create set");
  }

  return (await response.json()) as FlashcardSetSummaryDto;
}

async function createFlashcard(token: string, payload: CreateFlashcardPayload) {
  const response = await fetch(`/api/v1/sets/${payload.setId}/flashcards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      front: payload.front,
      back: payload.back,
      media_url: null,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create flashcard");
  }

  return response.json();
}

interface UpdateFlashcardPayload {
  setId: string;
  flashcardId: string;
  front: string;
  back: string;
}

async function updateFlashcard(token: string, payload: UpdateFlashcardPayload) {
  const response = await fetch(`/api/v1/sets/${payload.setId}/flashcards/${payload.flashcardId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      front: payload.front,
      back: payload.back,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to update flashcard");
  }

  return response.json();
}

interface DeleteFlashcardPayload {
  setId: string;
  flashcardId: string;
}

async function deleteFlashcardRequest(token: string, payload: DeleteFlashcardPayload) {
  const response = await fetch(`/api/v1/sets/${payload.setId}/flashcards/${payload.flashcardId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete flashcard");
  }
}

function ManualFlashcardForm({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [selectedSetId, setSelectedSetId] = useState<string | "new">("new");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [newSetName, setNewSetName] = useState("");
  const [newSetDescription, setNewSetDescription] = useState("");
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingFront, setEditingFront] = useState("");
  const [editingBack, setEditingBack] = useState("");
  const [isCreateSetFormVisible, setIsCreateSetFormVisible] = useState(false);

  const {
    data: sets,
    isLoading: isLoadingSets,
    isError: isSetsError,
  } = useQuery({
    queryKey: ["flashcardSets"],
    queryFn: () => fetchSets(token),
    staleTime: 30_000,
  });

  const {
    data: selectedSet,
    isLoading: isLoadingSetDetail,
    isError: isSetDetailError,
  } = useQuery({
    queryKey: ["flashcardSet", selectedSetId],
    queryFn: () => fetchSetDetail(token, selectedSetId as string),
    enabled: selectedSetId !== "new",
  });

  useEffect(() => {
    if (!hasInitializedSelection && sets && sets.length > 0) {
      setSelectedSetId(sets[0].id);
      setHasInitializedSelection(true);
    }
  }, [sets, hasInitializedSelection]);

  const createSetMutation = useMutation({
    mutationFn: (payload: CreateSetPayload) => createSet(token, payload),
    onSuccess: (created) => {
      toast.success("Set created");
      queryClient.invalidateQueries({ queryKey: ["flashcardSets"] });
      setSelectedSetId(created.id);
      setHasInitializedSelection(true);
      setNewSetName("");
      setNewSetDescription("");
      setIsCreateSetFormVisible(false);
    },
    onError: () => {
      toast.error("Failed to create set");
    },
  });

  const createFlashcardMutation = useMutation({
    mutationFn: (payload: CreateFlashcardPayload) => createFlashcard(token, payload),
    onSuccess: (_, variables) => {
      toast.success("Flashcard added");
      setFront("");
      setBack("");
      queryClient.invalidateQueries({ queryKey: ["flashcardSet", variables.setId] });
    },
    onError: () => {
      toast.error("Failed to add flashcard");
    },
  });

  const updateFlashcardMutation = useMutation({
    mutationFn: (payload: UpdateFlashcardPayload) => updateFlashcard(token, payload),
    onSuccess: (_, variables) => {
      toast.success("Flashcard updated");
      queryClient.invalidateQueries({ queryKey: ["flashcardSet", variables.setId] });
      setEditingCardId(null);
      setEditingFront("");
      setEditingBack("");
    },
    onError: () => {
      toast.error("Failed to update flashcard");
    },
  });

  const deleteFlashcardMutation = useMutation({
    mutationFn: (payload: DeleteFlashcardPayload) => deleteFlashcardRequest(token, payload),
    onSuccess: (_, variables) => {
      toast.success("Flashcard deleted");
      queryClient.invalidateQueries({ queryKey: ["flashcardSet", variables.setId] });
      if (editingCardId === variables.flashcardId) {
        handleCancelEditing();
      }
    },
    onError: () => {
      toast.error("Failed to delete flashcard");
    },
  });

  const handleCreateSet = () => {
    if (!newSetName.trim()) {
      toast.error("Set name is required");
      return;
    }

    createSetMutation.mutate({
      name: newSetName.trim(),
      description: newSetDescription.trim() || undefined,
    });
  };

  const handleCreateFlashcard = () => {
    if (selectedSetId === "new") {
      toast.error("Please choose or create a set first");
      return;
    }

    if (!front.trim() || !back.trim()) {
      toast.error("Both sides of the flashcard are required");
      return;
    }

    createFlashcardMutation.mutate({
      setId: selectedSetId,
      front: front.trim(),
      back: back.trim(),
    });
  };

  const handleStartEditing = (cardId: string, currentFront: string, currentBack: string) => {
    setEditingCardId(cardId);
    setEditingFront(currentFront);
    setEditingBack(currentBack);
  };

  const handleCancelEditing = () => {
    setEditingCardId(null);
    setEditingFront("");
    setEditingBack("");
  };

  const handleSaveFlashcard = () => {
    if (!editingCardId || selectedSetId === "new") {
      return;
    }

    if (!editingFront.trim() || !editingBack.trim()) {
      toast.error("Both sides of the flashcard are required");
      return;
    }

    updateFlashcardMutation.mutate({
      setId: selectedSetId,
      flashcardId: editingCardId,
      front: editingFront.trim(),
      back: editingBack.trim(),
    });
  };

  const isCreatingSet = createSetMutation.isPending;
  const isCreatingFlashcard = createFlashcardMutation.isPending;
  const isUpdatingFlashcard = updateFlashcardMutation.isPending;
  const isDeletingFlashcard = deleteFlashcardMutation.isPending;

  const hasSets = useMemo(() => (sets?.length ?? 0) > 0, [sets]);
  const canDisplayFlashcards = selectedSetId !== "new";

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Manual flashcard creation</CardTitle>
        <CardDescription>Select a set (or create one) and add a new flashcard.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-2">
          <label className="text-sm font-medium" htmlFor="setSelect">
            Target set
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              id="setSelect"
              value={selectedSetId}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedSetId(value);
                setIsCreateSetFormVisible(value === "new");
              }}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed"
              disabled={isLoadingSets}
            >
              {!hasSets && <option value="new">No sets available</option>}
              {sets?.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.name}
                </option>
              ))}
              <option value="new">Create new set</option>
            </select>
            <Button
              type="button"
              variant="secondary"
              className="sm:w-auto"
              onClick={() => {
                setSelectedSetId("new");
                setIsCreateSetFormVisible(true);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              New set
            </Button>
          </div>
          {isLoadingSets && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading sets...
            </p>
          )}
          {isSetsError && <p className="text-sm text-destructive">Failed to load sets. Try again later.</p>}
        </section>

        {isCreateSetFormVisible && (
          <section className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Create new set</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="new-set-name">
                  Name
                </label>
                <Input
                  id="new-set-name"
                  value={newSetName}
                  onChange={(event) => setNewSetName(event.target.value)}
                  placeholder="My new flashcard set"
                  disabled={isCreatingSet}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="new-set-description">
                  Description (optional)
                </label>
                <Input
                  id="new-set-description"
                  value={newSetDescription}
                  onChange={(event) => setNewSetDescription(event.target.value)}
                  placeholder="Short description"
                  disabled={isCreatingSet}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateSetFormVisible(false)}
                disabled={isCreatingSet}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleCreateSet} disabled={isCreatingSet}>
                {isCreatingSet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create set
              </Button>
            </div>
          </section>
        )}

        <section className="space-y-3">
          <div className="grid gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="flashcard-front">
                Front
              </label>
              <Input
                id="flashcard-front"
                value={front}
                onChange={(event) => setFront(event.target.value)}
                placeholder="Question or prompt"
                disabled={isCreatingFlashcard}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="flashcard-back">
                Back
              </label>
              <Textarea
                id="flashcard-back"
                value={back}
                onChange={(event) => setBack(event.target.value)}
                placeholder="Answer"
                disabled={isCreatingFlashcard}
                rows={4}
              />
            </div>
          </div>
          <Button type="button" onClick={handleCreateFlashcard} disabled={isCreatingFlashcard} className="w-full">
            {isCreatingFlashcard && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add flashcard
          </Button>
        </section>

        {canDisplayFlashcards && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase text-muted-foreground">Flashcards in set</h2>
              {isLoadingSetDetail && (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading flashcards...
                </span>
              )}
            </div>
            {isSetDetailError && (
              <p className="text-sm text-destructive">Failed to load flashcards. Try again later.</p>
            )}
            {!isLoadingSetDetail && !isSetDetailError && selectedSet && (
              <div className="space-y-3">
                {selectedSet.flashcards.length === 0 ? (
                  <p className="text-sm text-muted-foreground">This set has no flashcards yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {selectedSet.flashcards.map((card) => {
                      const isEditing = editingCardId === card.id;
                      return (
                        <li
                          key={card.id}
                          className="space-y-3 rounded-lg border border-border bg-background p-4 text-left shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-1">
                              <label className="text-sm font-semibold" htmlFor={`card-front-${card.id}`}>
                                Front
                              </label>
                              {isEditing ? (
                                <Input
                                  id={`card-front-${card.id}`}
                                  value={editingFront}
                                  onChange={(event) => setEditingFront(event.target.value)}
                                  disabled={isUpdatingFlashcard}
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">{card.front}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {isEditing ? (
                                <>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleSaveFlashcard}
                                    disabled={isUpdatingFlashcard}
                                    aria-label="Save flashcard"
                                  >
                                    {isUpdatingFlashcard ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Check className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleCancelEditing}
                                    disabled={isUpdatingFlashcard}
                                    aria-label="Cancel editing"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleStartEditing(card.id, card.front, card.back)}
                                  aria-label="Edit flashcard"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (isDeletingFlashcard) return;
                                  const confirmed = window.confirm("Are you sure you want to delete this flashcard?");
                                  if (!confirmed || selectedSetId === "new") {
                                    return;
                                  }
                                  deleteFlashcardMutation.mutate({
                                    setId: selectedSetId,
                                    flashcardId: card.id,
                                  });
                                }}
                                disabled={isDeletingFlashcard}
                                aria-label="Delete flashcard"
                              >
                                {isDeletingFlashcard ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-semibold" htmlFor={`card-back-${card.id}`}>
                              Back
                            </label>
                            {isEditing ? (
                              <Textarea
                                id={`card-back-${card.id}`}
                                value={editingBack}
                                onChange={(event) => setEditingBack(event.target.value)}
                                disabled={isUpdatingFlashcard}
                                rows={4}
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{card.back}</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </section>
        )}
        {!canDisplayFlashcards && hasSets && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Flashcards in set</h2>
            <p className="text-sm text-muted-foreground">Select a set above to view its flashcards.</p>
          </section>
        )}
      </CardContent>
    </Card>
  );
}

function GeneratePageContent() {
  const { token } = useAuth();

  const hasToken = Boolean(token);

  useEffect(() => {
    if (!hasToken) {
      window.location.replace("/login");
    }
  }, [hasToken]);

  if (!token) {
    return (
      <main className="container mx-auto flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="text-sm text-muted-foreground">Redirecting to login...</p>
      </main>
    );
  }

  return (
    <main className="container mx-auto flex flex-1 flex-col items-center gap-6 p-6">
      <div className="w-full max-w-3xl space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Flashcard generator (manual)</h1>
        <p className="text-muted-foreground">Create a new flashcard manually or add it to one of your existing sets.</p>
      </div>

      <div className="w-full max-w-3xl">
        <p className="mb-2 text-xs uppercase text-muted-foreground">JWT token</p>
        <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-all rounded-md border border-border bg-muted/60 p-3 text-xs">
          {token}
        </pre>
      </div>

      <ManualFlashcardForm token={token} />
    </main>
  );
}

export function GeneratePlaceholderPage() {
  return (
    <AuthenticatedShell>
      <GeneratePageContent />
    </AuthenticatedShell>
  );
}

export default GeneratePlaceholderPage;
