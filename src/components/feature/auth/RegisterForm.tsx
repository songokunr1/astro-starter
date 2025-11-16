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

const registerFormSchema = z
  .object({
    email: z.string({ required_error: "Email jest wymagany." }).email("Niepoprawny adres email."),
    password: z.string({ required_error: "Hasło jest wymagane." }).min(6, "Hasło musi mieć co najmniej 6 znaków."),
    confirmPassword: z.string({ required_error: "Potwierdzenie hasła jest wymagane." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są takie same.",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerFormSchema>;

class RegisterError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "RegisterError";
  }
}

const supabaseRestUrl = (import.meta.env.PUBLIC_SUPABASE_URL ?? import.meta.env.SUPABASE_URL)?.replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? import.meta.env.SUPABASE_KEY;

async function signUpUser(values: RegisterFormValues) {
  if (!supabaseRestUrl || !supabaseAnonKey) {
    throw new RegisterError("Brak konfiguracji Supabase. Skontaktuj się z administratorem.");
  }

  let response: Response;

  try {
    response = await fetch(`${supabaseRestUrl}/auth/v1/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        email: values.email,
        password: values.password,
      }),
    });
  } catch {
    throw new RegisterError("Network error. Please check your connection and try again.");
  }

  if (!response.ok) {
    let message = "Unexpected error while registering. Please try again.";

    if (response.status === 400) {
      message = "Invalid data provided. Please check your input.";
    } else if (response.status === 422) {
      message = "This email is already registered.";
    } else if (response.status >= 500) {
      message = "Server error. Please try again later.";
    }

    throw new RegisterError(message, response.status);
  }
}

export function RegisterForm() {
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: signUpUser,
    onSuccess: () => {
      toast.success("Rejestracja pomyślna!", {
        description: "Sprawdź swoją skrzynkę pocztową, aby potwierdzić adres e-mail.",
      });
      window.location.assign("/login");
    },
    onError: (error) => {
      const description = error instanceof RegisterError ? error.message : "Wystąpił nieoczekiwany błąd.";

      form.setError("root", {
        type: "server",
        message: description,
      });

      toast.error("Rejestracja nie powiodła się", {
        description,
      });
    },
  });

  const { isPending } = mutation;

  async function onSubmit(values: RegisterFormValues) {
    mutation.mutate(values);
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Rejestracja</CardTitle>
        <CardDescription>Wprowadź swoje dane, aby założyć konto.</CardDescription>
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
                      autoComplete="new-password"
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
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Potwierdź hasło</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="********"
                      autoComplete="new-password"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zarejestruj się
            </Button>
            {form.formState.errors.root && (
              <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
            )}
          </form>
        </Form>
        <div className="mt-4 text-center text-sm">
          Masz już konto?{" "}
          <a href="/login" className="underline">
            Zaloguj się
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default RegisterForm;
