"use server"

import { createClient } from "@/lib/supabase/server"
import { signInSchema, type signInSchemaInput } from "@/schemas/sign-in"
import type { ServerActionResult } from "@/types/server-action"

export async function signIn(
  formData: signInSchemaInput,
): Promise<ServerActionResult> {
  const parsed = signInSchema.safeParse(formData)

  if (!parsed.success) {
    return { ok: false, error: "Invalid input" }
  }

  const data = parsed.data

  // supabase auth
  const supabase = await createClient()

  const { data: _, error: authError } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (authError) {
    return { ok: false, error: authError.message }
  }

  return { ok: true }
}
