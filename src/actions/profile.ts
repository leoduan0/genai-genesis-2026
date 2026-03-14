"use server"

import { ROLES } from "@/generated/prisma/enums"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export async function getRole() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("No user (Supabase)")
  }

  const prismaUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      role: true,
    },
  })

  if (!prismaUser) {
    throw new Error("No user (Prisma)")
  }

  if (prismaUser.role === ROLES.PATIENT) {
    return ROLES.PATIENT
  } else {
    return ROLES.DOCTOR
  }
}
