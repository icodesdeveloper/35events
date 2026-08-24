import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/admin";

// Runs on the Edge runtime — reads the isAdmin claim already baked into the
// JWT by lib/auth/admin.ts's callbacks, no Prisma access needed here.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  if (!req.auth?.user?.isAdmin) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
