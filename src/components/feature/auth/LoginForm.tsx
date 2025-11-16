"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const loginFormSchema = z.object({
  email: z.string({ required_error: "Email jest wymagany." }).email("Niepoprawny adres email."),
  password: z.string({ required_error: "Hasło jest wymagane." }).min(1, "Hasło jest wymagane."),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

class LoginError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "LoginError";
  }
}

class ResetRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResetRequestError";
  }
}

interface SupabaseTokenResponse {
  access_token: string;
}

const supabaseRestUrl = (import.meta.env.PUBLIC_SUPABASE_URL ?? import.meta.env.SUPABASE_URL)?.replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? import.meta.env.SUPABASE_KEY;

async function getSupabaseToken(values: LoginFormValues): Promise<SupabaseTokenResponse> {
  if (!supabaseRestUrl || !supabaseAnonKey) {
    throw new LoginError("Brak konfiguracji Supabase. Skontaktuj się z administratorem.");
  }

  let response: Response;

  try {
    response = await fetch(`${supabaseRestUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(values),
    });
  } catch {
    throw new LoginError("Network error. Please check your connection and try again.");
  }

  if (!response.ok) {
    let message = "Unexpected error while logging in. Please try again.";

    if (response.status === 401) {
      message = "Invalid email or password.";
    } else if (response.status === 429) {
      message = "Too many attempts. Please wait a moment before trying again.";
    } else if (response.status >= 500) {
      message = "Server error. Please try again later.";
    }

    throw new LoginError(message, response.status);
  }

  return response.json();
}

async function requestPasswordReset(email: string) {
  if (!supabaseRestUrl || !supabaseAnonKey) {
    throw new ResetRequestError("Brak konfiguracji Supabase. Skontaktuj się z administratorem.");
  }

  let response: Response;

  try {
    response = await fetch(`${supabaseRestUrl}/auth/v1/recover`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        email,
        redirect_to: `${window.location.origin.replace(/\/$/, "")}/reset-password`,
      }),
    });
  } catch {
    throw new ResetRequestError("Nie udało się wysłać prośby o reset hasła. Sprawdź połączenie i spróbuj ponownie.");
  }

  if (!response.ok) {
    let message = "Nie udało się wysłać prośby o reset hasła. Spróbuj ponownie za chwilę.";

    if (response.status === 429) {
      message = "Zbyt wiele prób resetu. Odczekaj chwilę, zanim spróbujesz ponownie.";
    }

    throw new ResetRequestError(message);
  }
}

export function LoginForm() {
  const auth = useAuth();
  const defaultEmail = import.meta.env.PUBLIC_TEST_LOGIN ?? "";
  const defaultPassword = import.meta.env.PUBLIC_TEST_PASSWORD ?? "";
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: defaultEmail,
      password: defaultPassword,
    },
  });

  const mutation = useMutation({
    mutationFn: getSupabaseToken,
    onSuccess: (data) => {
      auth.login(data.access_token);
      toast.success("Logowanie udane");
      window.location.assign("/generate");
    },
    onError: (error) => {
      const description = error instanceof LoginError ? error.message : "Unexpected error.";

      form.setError("root", {
        type: "server",
        message: description,
      });

      toast.error("Logowanie nie powiodło się", {
        description,
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: requestPasswordReset,
    onSuccess: () => {
      toast.success("Jeśli podany adres istnieje, wysłaliśmy instrukcje resetu hasła.", {
        description: "Sprawdź skrzynkę pocztową i postępuj zgodnie z wiadomością.",
      });
    },
    onError: (error) => {
      const description =
        error instanceof ResetRequestError
          ? error.message
          : "Nie udało się wysłać prośby o reset hasła. Spróbuj ponownie.";

      toast.error("Błąd resetu hasła", {
        description,
      });
    },
  });

  const { isPending } = mutation;
  const { isPending: isResetPending } = resetMutation;

  async function onSubmit(values: LoginFormValues) {
    mutation.mutate(values);
  }

  async function handlePasswordReset() {
    const isEmailValid = await form.trigger("email");
    if (!isEmailValid) {
      return;
    }

    const email = form.getValues("email");
    resetMutation.mutate(email);
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Logowanie</CardTitle>
        <CardDescription>Wprowadź swoje dane, aby zalogować się na konto. Użyj danych testowych.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="name@example.com"
                      type="email"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hasło</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="********"
                      autoComplete="current-password"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending || isResetPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log in
            </Button>
            {form.formState.errors.root && (
              <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
            )}
          </form>
        </Form>
        <div className="mt-2 text-right text-sm">
          <Button
            type="button"
            variant="link"
            className="px-0 text-sm text-primary"
            onClick={handlePasswordReset}
            disabled={isPending || isResetPending}
          >
            {isResetPending ? (
              <span className="inline-flex items-center">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Wysyłanie...
              </span>
            ) : (
              "Resetuj hasło"
            )}
          </Button>
        </div>
        <div className="mt-4 text-center text-sm">
          Nie masz konta?{" "}
          <a href="/register" className="underline">
            Zarejestruj się
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default LoginForm;
