"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import Providers from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth-context";

interface ShellProps {
  children: ReactNode;
}

const navItems = [
  { href: "/generate", label: "Generator manualny" },
  { href: "/generate-ai", label: "Generator AI" },
  { href: "/sets", label: "Moje zestawy" },
  { href: "/learn", label: "Sesja nauki" },
];

function ShellContent({ children }: ShellProps) {
  const auth = useAuth();
  const [pathname, setPathname] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPathname(window.location.pathname);
    }
  }, []);

  const handleNavigate = (href: string) => {
    if (typeof window !== "undefined") {
      window.location.assign(href);
    }
  };

  const handleLogout = () => {
    auth.logout();
    toast.info("Zostałeś wylogowany.");
    window.location.assign("/login");
  };

  const renderedNav = useMemo(() => {
    if (!auth.isAuthenticated) {
      return null;
    }

    return (
      <nav className="flex items-center gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Button
              key={item.href}
              type="button"
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className={isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}
              onClick={() => handleNavigate(item.href)}
            >
              {item.label}
            </Button>
          );
        })}
      </nav>
    );
  }, [auth.isAuthenticated, pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="container mx-auto flex flex-wrap items-center gap-3 px-4 py-3">
          <a href="/generate" className="text-sm font-semibold tracking-tight text-foreground">
            Fiszki AI
          </a>
          <div className="flex flex-1 items-center justify-between gap-3">
            {renderedNav}
            {auth.isAuthenticated && (
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Wyloguj
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto flex-1 px-4 py-6">{children}</main>
      <Toaster richColors position="top-right" />
    </div>
  );
}

export function AuthenticatedShell({ children }: ShellProps) {
  return (
    <Providers>
      <ShellContent>{children}</ShellContent>
    </Providers>
  );
}

export default AuthenticatedShell;
