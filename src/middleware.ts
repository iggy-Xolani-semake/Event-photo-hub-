import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Two jobs:
 *   1. Refresh the Supabase auth cookie on every request (required by
 *      @supabase/ssr so Server Components see a valid session).
 *   2. Gate /admin/* (staff console) and /dashboard/* (client area) —
 *      redirect to the matching login page if there's no session,
 *      and separately redirect away from /admin/login if there IS one.
 *      This is a UX convenience, NOT the security boundary: the real
 *      enforcement is RLS (is_admin() checks in 0002_rls.sql) and the
 *      admin API routes re-checking role server-side. Middleware alone
 *      is trivially bypassed by hitting an API route directly, so every
 *      admin API route in src/app/api/admin/** must independently verify
 *      the caller is an admin — never rely on middleware as the only gate.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminArea = path.startsWith("/admin");
  const isClientArea = path.startsWith("/dashboard");
  // /client is the older collaborator area that came in from main. It signs
  // in through /admin/login, so it is grouped with the staff console here.
  const isCollaboratorArea = path.startsWith("/client");
  const isAdminLogin = path === "/admin/login";

  // Two doors, one rule: /admin is the internal console, /dashboard is the
  // client's own area. Both need a session; which events each can see is
  // decided by RLS, not by which door they used.
  if ((isAdminArea && !isAdminLogin) || isClientArea || isCollaboratorArea) {
    if (!user) {
      const loginUrl = new URL(
        isAdminArea || isCollaboratorArea ? "/admin/login" : "/login",
        request.url
      );
      loginUrl.searchParams.set("redirectTo", path);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isAdminLogin && user) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // A signed-in visitor has no business on a sign-in or sign-up form.
  if ((path === "/login" || path === "/signup") && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/client/:path*", "/dashboard/:path*", "/login", "/signup"],
};
