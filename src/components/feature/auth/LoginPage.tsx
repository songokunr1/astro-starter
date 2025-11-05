"use client";

import Providers from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

import { LoginForm } from "./LoginForm";

export function LoginPage() {
  return (
    <Providers>
      <main className="container mx-auto flex-grow p-4">
        <div className="mx-auto flex h-full max-w-md items-center justify-center">
          <LoginForm />
        </div>
      </main>
      <Toaster />
    </Providers>
  );
}

export default LoginPage;

