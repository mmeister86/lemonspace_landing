/**
 * The function `createSupabaseUserContext` creates a Supabase client with user context based on the
 * request's authentication information.
 * @param {NextRequest} request - The `request` parameter in the `createSupabaseUserContext` function
 * is of type `NextRequest` and represents the incoming HTTP request object in a Next.js server-side
 * function. It contains information about the request such as headers, cookies, and other request
 * details. This parameter is used to
 * @returns The function `createSupabaseUserContext` returns an object with three properties:
 * 1. `supabase`: The Supabase client created using the `createClient` function.
 * 2. `user`: The user object retrieved from Supabase authentication. It could be the user object
 * obtained from the cookie-based authentication or token-based authentication.
 * 3. `error`: Any error that occurred during
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Creates a Supabase client with user context from request
 * Handles both cookie-based auth and token-based auth
 */
export async function createSupabaseUserContext(request: NextRequest) {
  const supabase = await createClient();

  let {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user) {
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;
    const token = bearerToken ?? request.headers.get("x-supabase-auth-token");

    if (token) {
      const {
        data: { user: tokenUser },
        error: tokenError,
      } = await supabase.auth.getUser(token);

      user = tokenUser ?? null;
      error = tokenError;
    }
  }

  return { supabase, user, error };
}
