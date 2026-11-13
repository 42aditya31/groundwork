import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic check only: sends visitors without a session cookie to the login screen.
 * Real authorization happens server-side in every page, action and route handler.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("gw_session_"));
  const { pathname } = request.nextUrl;
  if (!hasSession && pathname !== "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|api/).*)"],
};
