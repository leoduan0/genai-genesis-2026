"use server"

import { createClient } from "@/lib/supabase/server"
import type { ServerActionResult } from "@/types/server-action"

export async function signOut(): Promise<ServerActionResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut({ scope: "local" })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
