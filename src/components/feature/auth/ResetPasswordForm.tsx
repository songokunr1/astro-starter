"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const resetPasswordSchema = z
  .object({
    password: z
      .string({ required_error: "Hasło jest wymagane." })
      .min(6, "Hasło musi mieć co najmniej 6 znaków.")
      .max(64, "Hasło może mieć maksymalnie 64 znaki."),
    confirmPassword: z.string({ required_error: "Potwierdź hasło." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Hasła muszą być takie same.",
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

class ResetPasswordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResetPasswordError";
  }
}

const supabaseRestUrl = (import.meta.env.PUBLIC_SUPABASE_URL ?? import.meta.env.SUPABASE_URL)?.replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? import.meta.env.SUPABASE_KEY;

interface ResetPasswordPayload extends ResetPasswordValues {
  token: string;
}

async function submitNewPassword({ password, token }: ResetPasswordPayload) {
  if (!supabaseRestUrl || !supabaseAnonKey) {
    throw new ResetPasswordError("Brak konfiguracji Supabase. Skontaktuj się z administratorem.");
  }

  let response: Response;

  try {
    response = await fetch(`${supabaseRestUrl}/auth/v1/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        type: "recovery",
        token,
        password,
      }),
    });
  } catch {
    throw new ResetPasswordError("Nie udało się ustawić nowego hasła. Sprawdź połączenie i spróbuj ponownie.");
  }

  if (!response.ok) {
    let message = "Nie udało się ustawić nowego hasła. Poproś o kolejny link resetujący.";

    if (response.status === 400 || response.status === 422) {
      message = "Link resetujący jest nieprawidłowy lub wygasł. Poproś o nowy.";
    }

    throw new ResetPasswordError(message);
  }
}

function extractTokenFromLocation(url: URL): string | null {
  const searchToken = url.searchParams.get("token");
  if (searchToken) {
    return searchToken;
  }

  const hash = url.hash.replace(/^#/, "");
  if (!hash) {
    return null;
  }

  const hashParams = new URLSearchParams(hash);
  return hashParams.get("access_token") ?? hashParams.get("token");
}

export function ResetPasswordForm() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const currentToken = extractTokenFromLocation(new URL(window.location.href));
    setToken(currentToken);
  }, []);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ResetPasswordValues) => {
      if (!token) {
        throw new ResetPasswordError("Brakuje tokenu resetującego. Poproś o nowy link.");
      }

      return submitNewPassword({
        ...values,
        token,
      });
    },
    onSuccess: () => {
      toast.success("Hasło zostało zaktualizowane.", {
        description: "Możesz teraz zalogować się przy użyciu nowego hasła.",
      });
      window.location.assign("/login");
    },
    onError: (error) => {
      const description =
        error instanceof ResetPasswordError ? error.message : "Nie udało się ustawić nowego hasła. Spróbuj ponownie.";

      form.setError("root", {
        type: "server",
        message: description,
      });

      toast.error("Błąd resetu hasła", {
        description,
      });
    },
  });

  const { isPending } = mutation;

  async function onSubmit(values: ResetPasswordValues) {
    mutation.mutate(values);
  }

  const tokenMissing = useMemo(() => token === null, [token]);

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Ustaw nowe hasło</CardTitle>
        <CardDescription>Wprowadź nowe hasło, aby odzyskać dostęp do konta.</CardDescription>
      </CardHeader>
      <CardContent>
        {tokenMissing && (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            Link resetujący jest nieprawidłowy lub wygasł. Wróć na stronę logowania i poproś o nowy link.
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nowe hasło</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      disabled={isPending || tokenMissing}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Potwierdź hasło</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      disabled={isPending || tokenMissing}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending || tokenMissing}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zmień hasło
            </Button>
            {form.formState.errors.root && (
              <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
            )}
          </form>
        </Form>
        <div className="mt-4 text-center text-sm">
          <a href="/login" className="underline">
            Wróć do logowania
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default ResetPasswordForm;
