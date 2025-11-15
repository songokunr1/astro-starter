"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowUpDown, Loader2, PlusCircle, RefreshCcw } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";

import AuthenticatedShell from "@/components/layouts/AuthenticatedShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import type { FlashcardSetSummaryDto, PaginatedResponseDto } from "@/types";

type SortKey = "name" | "created_at" | "updated_at";
type SortOrder = "asc" | "desc";

interface FetchSetsParams {
  page: number;
  pageSize: number;
  sortBy: SortKey;
  sortOrder: SortOrder;
}

type FetchSetsResponse = PaginatedResponseDto<FlashcardSetSummaryDto>;

async function fetchSets(token: string, params: FetchSetsParams): Promise<FetchSetsResponse> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });

  const response = await fetch(`/api/v1/sets?${search.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message ?? "Nie udało się pobrać zestawów.");
  }

  return response.json() as Promise<FetchSetsResponse>;
}

function SetsListPageContent() {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<SortKey>("updated_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!token) {
      window.location.replace("/login");
    }
  }, [token]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<FetchSetsResponse, Error>({
    queryKey: ["flashcardSetsList", token, page, pageSize, sortBy, sortOrder],
    queryFn: () => fetchSets(token as string, { page, pageSize, sortBy, sortOrder }),
    enabled: Boolean(token),
    placeholderData: (previousData) => previousData,
  });

  const filteredSets = useMemo(() => {
    if (!data?.data) {
      return [];
    }
    if (!searchTerm.trim()) {
      return data.data;
    }

    const normalized = searchTerm.trim().toLowerCase();
    return data.data.filter(
      (set) => set.name.toLowerCase().includes(normalized) || (set.description ?? "").toLowerCase().includes(normalized)
    );
  }, [data, searchTerm]);

  const totalPages = data ? Math.max(1, Math.ceil(data.pagination.total / pageSize)) : 1;

  const toggleSort = (key: SortKey) => {
    setPage(1);
    if (sortBy === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(key);
    setSortOrder("asc");
  };

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const result = await refetch();
      if (result.error) {
        throw result.error;
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Odświeżono listę zestawów.");
    },
    onError: () => {
      toast.error("Nie udało się odświeżyć danych.");
    },
  });

  const handleGoToGenerate = () => {
    window.location.assign("/generate");
  };

  if (!token) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Moje zestawy</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Flashcard sets</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refreshMutation.mutate()} disabled={isFetching}>
              {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Odśwież
            </Button>
            <Button size="sm" onClick={handleGoToGenerate}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nowy zestaw
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Przeglądaj utworzone zestawy i przechodź do generatora, aby dodawać kolejne fiszki.
        </p>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap gap-3">
          <div>
            <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor="set-search">
              Szukaj
            </label>
            <Input
              id="set-search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nazwa lub opis zestawu"
              className="w-full min-w-[240px]"
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor="page-size-select">
              Liczba na stronę
            </label>
            <select
              id="page-size-select"
              className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Poprzednia
          </Button>
          <span className="text-sm text-muted-foreground">
            Strona {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Następna
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista zestawów</CardTitle>
          <CardDescription>Sortuj według nazwy, daty utworzenia lub aktualizacji.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Ładowanie zestawów...
            </div>
          )}

          {isError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-destructive">
              Nie udało się pobrać zestawów. Spróbuj odświeżyć stronę.
            </div>
          )}

          {!isLoading && filteredSets.length === 0 && (
            <div className="rounded-md border border-dashed border-border bg-muted/40 p-6 text-center text-muted-foreground">
              Brak zestawów do wyświetlenia. Utwórz pierwszy zestaw w generatorze ręcznym lub AI.
            </div>
          )}

          {!isLoading && filteredSets.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium text-foreground"
                        onClick={() => toggleSort("name")}
                      >
                        Nazwa
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">Opis</th>
                    <th className="px-4 py-3 text-left">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium text-foreground"
                        onClick={() => toggleSort("created_at")}
                      >
                        Utworzono
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium text-foreground"
                        onClick={() => toggleSort("updated_at")}
                      >
                        Ostatnia zmiana
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSets.map((set) => (
                    <tr key={set.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{set.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {set.description ? (
                          set.description
                        ) : (
                          <span className="italic text-muted-foreground/70">Brak opisu</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(set.created_at), "dd MMM yyyy", { locale: pl })}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(set.updated_at), "dd MMM yyyy", { locale: pl })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => window.location.assign(`/sets/${set.id}`)}>
                          Szczegóły
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetsListPage() {
  return (
    <AuthenticatedShell>
      <SetsListPageContent />
    </AuthenticatedShell>
  );
}
