"use client";

import Providers from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

import { ResetPasswordForm } from "./ResetPasswordForm";

export function ResetPasswordPage() {
  return (
    <Providers>
      <main className="container mx-auto flex-grow p-4">
        <div className="mx-auto flex h-full max-w-md items-center justify-center">
          <ResetPasswordForm />
        </div>
      </main>
      <Toaster />
    </Providers>
  );
}

export default ResetPasswordPage;
