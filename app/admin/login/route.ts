import type { NextRequest } from "next/server";
import { signIn } from "@/lib/auth/admin";

// A route handler, not a page — Auth.js needs to set the OAuth state/PKCE
// cookies as part of the redirect to Authentik, and Next only allows cookie
// mutations from a Server Action or Route Handler, not a page render.
export async function GET(request: NextRequest) {
  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
  await signIn("authentik", { redirectTo: callbackUrl || "/admin" });
}
