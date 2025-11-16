"use client";

import { Toaster as SonnerToaster } from "sonner";
import type { ComponentProps } from "react";

export type ToasterProps = ComponentProps<typeof SonnerToaster>;

export function Toaster(props: ToasterProps) {
  return <SonnerToaster richColors position="top-right" {...props} />;
}

export type { ExternalToast, ToastT } from "sonner";
