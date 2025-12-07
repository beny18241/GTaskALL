import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Public pages that don't require authentication
const publicPages = ["/login", "/privacy", "/terms"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isPublicPage = publicPages.includes(pathname);
  const isApiRoute = pathname.startsWith("/api");
  const isAuthRoute = pathname.startsWith("/api/auth");

  // Allow auth routes
  if (isAuthRoute) {
    return NextResponse.next();
  }

  // Allow public pages
  if (isPublicPage) {
    // If logged in and trying to access login page, redirect to home
    if (isLoggedIn && pathname === "/login") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // If not logged in and trying to access protected routes
  if (!isLoggedIn && !isApiRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
