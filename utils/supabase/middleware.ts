import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const guestOnlyRoutes = new Set([
  "/login",
  "/register",
  "/forgot-password",
]);

const publicRoutes = new Set([
  ...guestOnlyRoutes,
  "/reset-password",
  "/auth/confirm",
  "/auth/callback",
]);

function isPublicPath(pathname: string) {
  return publicRoutes.has(pathname);
}

function isGuestOnlyRoute(pathname: string) {
  return guestOnlyRoutes.has(pathname);
}

export const createClient = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  function redirectTo(path: string) {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  if (!user && !isPublicPath(pathname)) {
    return redirectTo("/login");
  }

  if (!user) {
    return supabaseResponse;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email_confirmed_at")
    .eq("id", user.id)
    .maybeSingle();

  const emailConfirmed = Boolean(profile?.email_confirmed_at);
  const confirmationRoute =
    pathname === "/check-email" ||
    pathname === "/auth/confirm" ||
    pathname === "/auth/callback" ||
    pathname === "/reset-password";

  if (!emailConfirmed && !confirmationRoute) {
    return redirectTo("/check-email");
  }

  if (emailConfirmed && (isGuestOnlyRoute(pathname) || pathname === "/check-email")) {
    return redirectTo("/invoices");
  }

  return supabaseResponse;
};
