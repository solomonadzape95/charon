import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Server Supabase client bound to the request cookies — reads the auth session. */
export async function supabaseServerAuth() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // called from a Server Component — safe to ignore (middleware refreshes).
        }
      },
    },
  });
}
