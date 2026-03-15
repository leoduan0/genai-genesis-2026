"use server"

import { prisma } from "@/lib/prisma"
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

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (authError) {
    return { ok: false, error: authError.message }
  }

  if (authData.user) {
    const prismaUser = await prisma.user.findUnique({
      where: { id: authData.user.id },
      select: { role: true },
    })

    if (prismaUser) {
      await supabase.auth.updateUser({
        data: {
          role: prismaUser.role.toLowerCase(),
        },
      })
    }
  }

  return { ok: true }
}
