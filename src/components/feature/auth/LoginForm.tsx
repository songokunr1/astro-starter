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

interface SupabaseTokenResponse {
  access_token: string;
}

async function getSupabaseToken(values: LoginFormValues): Promise<SupabaseTokenResponse> {
  let response: Response;

  try {
    response = await fetch("http://127.0.0.1:54321/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
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
      toast.success("Login successful");
      window.location.assign("/generate");
    },
    onError: (error) => {
      const description = error instanceof LoginError ? error.message : "Unexpected error.";

      form.setError("root", {
        type: "server",
        message: description,
      });

      toast.error("Login failed", {
        description,
      });
    },
  });

  const { isPending } = mutation;

  async function onSubmit(values: LoginFormValues) {
    mutation.mutate(values);
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
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log in
            </Button>
            {form.formState.errors.root && (
              <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default LoginForm;
