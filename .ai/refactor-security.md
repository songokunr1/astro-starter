# Security Refactoring Implementation Plan

## Zmiany do wykonania

### 1. Redirect `/` → `/login`
**Plik**: `src/pages/index.astro`

Zastąpić całą zawartość:

```astro
---
import Layout from "../layouts/Layout.astro";
---

<Layout title="Fiszki AI">
  <script>
    window.location.replace("/login");
  </script>
  <main class="flex min-h-screen items-center justify-center">
    <p class="text-sm text-muted-foreground">Redirecting...</p>
  </main>
</Layout>
```

### 2. Usunąć wyświetlanie JWT tokena
**Plik**: `src/components/feature/generate/GeneratePlaceholderPage.tsx`

Usunąć linie 605-610:

```tsx
// USUŃ TO:
<div className="w-full max-w-3xl">
  <p className="mb-2 text-xs uppercase text-muted-foreground">JWT token</p>
  <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-all rounded-md border border-border bg-muted/60 p-3 text-xs">
    {token}
  </pre>
</div>
```

## Testowanie

### Testowanie manualne

1. Odwiedź `/` → powinno przekierować na `/login`
2. Zaloguj się i sprawdź `/generate` → token nie powinien być widoczny
3. Sprawdź, czy tworzenie fiszek nadal działa

### Uruchomienie istniejących testów

```bash
# Unit testy
npm run test

# E2E testy  
npm run test:e2e
```

