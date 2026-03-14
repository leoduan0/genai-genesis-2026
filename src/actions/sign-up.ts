"use server"

import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { signUpSchema, type signUpSchemaInput } from "@/schemas/sign-up"
import type { ServerActionResult } from "@/types/server-action"

export async function signUp(
  formData: signUpSchemaInput,
): Promise<ServerActionResult> {
  const parsed = signUpSchema.safeParse(formData)

  if (!parsed.success) {
    return { ok: false, error: "Invalid input" }
  }

  const data = parsed.data

  // supabase auth
  const supabase = await createClient()

  const { data: auth, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  })

  if (authError) {
    return { ok: false, error: authError.message }
  }

  if (!auth.user) {
    return { ok: false, error: "auth.user is not defined" }
  }

  // prisma

  try {
    await prisma.user.create({
      data: {
        id: auth.user.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      },
    })
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { ok: false, error: "Email already registered" }
    }

    return { ok: false, error: "Something went wrong" }
  }

  return { ok: true }
}
