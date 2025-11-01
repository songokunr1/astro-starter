import { createClient } from "@supabase/supabase-js";
import { defineMiddleware } from "astro:middleware";
import { supabase as anonSupabase } from "../db/supabase.client";
import type { Database } from "../db/database.types";

const protectedRoutes = ["/api/"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request } = context;
  const { pathname } = url;

  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    const authHeader = request.headers.get("Authorization");
    const accessToken = authHeader?.split(" ")[1];

    if (!accessToken) {
      return new Response("Unauthorized: Missing access token", { status: 401 });
    }

    const supabase = createClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return new Response("Unauthorized: Invalid access token", { status: 401 });
    }

    context.locals.user = user;
    context.locals.supabase = supabase;
  } else {
    context.locals.supabase = anonSupabase;
  }

  return next();
});
