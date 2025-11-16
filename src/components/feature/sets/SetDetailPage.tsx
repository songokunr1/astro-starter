"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";

import AuthenticatedShell from "@/components/layouts/AuthenticatedShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import type { FlashcardDto, FlashcardSetDetailDto } from "@/types";

async function fetchSetDetail(token: string, setId: string): Promise<FlashcardSetDetailDto> {
  const response = await fetch(`/api/v1/sets/${setId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message ?? "Nie udało się pobrać zestawu.");
  }

  return response.json();
}

async function updateFlashcardRequest(token: string, setId: string, card: FlashcardDto) {
  const response = await fetch(`/api/v1/sets/${setId}/flashcards/${card.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      front: card.front,
      back: card.back,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message ?? "Nie udało się zaktualizować fiszki.");
  }

  return response.json();
}

async function deleteFlashcardRequest(token: string, setId: string, cardId: string) {
  const response = await fetch(`/api/v1/sets/${setId}/flashcards/${cardId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message ?? "Nie udało się usunąć fiszki.");
  }
}

interface Props {
  setId: string;
}

function SetDetailPageContent({ setId }: Props) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [draftFront, setDraftFront] = useState("");
  const [draftBack, setDraftBack] = useState("");

  useEffect(() => {
    if (!token) {
      window.location.replace("/login");
    }
  }, [token]);

  const {
    data: setDetail,
    isLoading,
    isError,
    refetch,
  } = useQuery<FlashcardSetDetailDto, Error>({
    queryKey: ["flashcardSetDetail", setId, token],
    queryFn: () => fetchSetDetail(token as string, setId),
    enabled: Boolean(token && setId),
  });

  const updateMutation = useMutation({
    mutationFn: (card: FlashcardDto) => updateFlashcardRequest(token as string, setId, card),
    onSuccess: () => {
      toast.success("Fiszka zaktualizowana.");
      setEditingCardId(null);
      setDraftFront("");
      setDraftBack("");
      queryClient.invalidateQueries({ queryKey: ["flashcardSetDetail", setId, token] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Edycja nie powiodła się.";
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (cardId: string) => deleteFlashcardRequest(token as string, setId, cardId),
    onSuccess: () => {
      toast.success("Fiszka usunięta.");
      if (editingCardId) {
        handleCancelEdit();
      }
      queryClient.invalidateQueries({ queryKey: ["flashcardSetDetail", setId, token] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Nie udało się usunąć fiszki.";
      toast.error(message);
    },
  });

  const handleStartEdit = (card: FlashcardDto) => {
    setEditingCardId(card.id);
    setDraftFront(card.front);
    setDraftBack(card.back);
  };

  const handleCancelEdit = () => {
    setEditingCardId(null);
    setDraftFront("");
    setDraftBack("");
  };

  const handleSave = (cardId: string) => {
    if (!draftFront.trim() || !draftBack.trim()) {
      toast.error("Obie strony fiszki są wymagane.");
      return;
    }
    updateMutation.mutate({
      id: cardId,
      front: draftFront.trim(),
      back: draftBack.trim(),
      media_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as FlashcardDto);
  };

  const formattedMeta = useMemo(() => {
    if (!setDetail) {
      return null;
    }
    return {
      created: format(new Date(setDetail.created_at), "dd MMM yyyy HH:mm", { locale: pl }),
      updated: format(new Date(setDetail.updated_at), "dd MMM yyyy HH:mm", { locale: pl }),
    };
  }, [setDetail]);

  if (!token) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2 border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Zestaw</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {setDetail?.name ?? "Ładowanie..."}
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Odśwież
          </Button>
        </div>
        {setDetail && formattedMeta && (
          <p className="text-sm text-muted-foreground">
            Utworzono {formattedMeta.created} • Ostatnia zmiana {formattedMeta.updated}
          </p>
        )}
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Ładuję szczegóły zestawu...
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-destructive">
          Nie udało się wczytać zestawu. Spróbuj ponownie.
        </div>
      )}

      {setDetail && (
        <Card>
          <CardHeader>
            <CardTitle>Opis zestawu</CardTitle>
            <CardDescription>Zawiera {setDetail.flashcards.length} fiszek.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {setDetail.description ? (
              <p className="text-sm text-muted-foreground">{setDetail.description}</p>
            ) : (
              <p className="text-sm italic text-muted-foreground/70">Brak opisu.</p>
            )}
          </CardContent>
        </Card>
      )}

      {setDetail && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Fiszki</h2>
            <Button variant="outline" size="sm" onClick={() => window.location.assign("/generate")}>
              Edytuj w generatorze
            </Button>
          </div>
          <div className="space-y-3">
            {setDetail.flashcards.map((card) => {
              const isEditing = editingCardId === card.id;
              return (
                <Card key={card.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base">Fiszka #{card.id.slice(0, 8)}</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        Ostatnia aktualizacja {format(new Date(card.updated_at), "dd MMM yyyy HH:mm", { locale: pl })}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Button size="sm" onClick={() => handleSave(card.id)} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Zapisz"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                            Anuluj
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => handleStartEdit(card)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edytuj
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("Czy na pewno chcesz usunąć tę fiszkę?")) {
                                deleteMutation.mutate(card.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Usuń
                          </Button>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Awers</p>
                      {isEditing ? (
                        <Input
                          value={draftFront}
                          onChange={(event) => setDraftFront(event.target.value)}
                          disabled={updateMutation.isPending}
                        />
                      ) : (
                        <p className="text-sm text-foreground">{card.front}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Rewers</p>
                      {isEditing ? (
                        <Textarea
                          value={draftBack}
                          onChange={(event) => setDraftBack(event.target.value)}
                          rows={3}
                          disabled={updateMutation.isPending}
                        />
                      ) : (
                        <p className="text-sm text-foreground">{card.back}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default function SetDetailPage({ setId }: Props) {
  return (
    <AuthenticatedShell>
      <SetDetailPageContent setId={setId} />
    </AuthenticatedShell>
  );
}
