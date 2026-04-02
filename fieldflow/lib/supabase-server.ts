import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
// Re-export for convenience so server files only need one import
export { createServiceRoleClient } from './supabase'

// Server-side Supabase client (Server Components, Route Handlers, Server Actions only)
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as any)
            )
          } catch {
            // Server Component — cannot set cookies
          }
        },
      },
    }
  )
}
