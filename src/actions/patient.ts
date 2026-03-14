"use server"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { chatSchema, type chatSchemaInput } from "@/schemas/chat"
import { intakeSchema, type intakeSchemaInput } from "@/schemas/intake"
import type { ServerActionResult } from "@/types/server-action"

export async function saveIntake(
  input: intakeSchemaInput,
): Promise<ServerActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("No user (Supabase)")
  }

  const parsed = intakeSchema.safeParse(input)

  if (!parsed.success) {
    return { ok: false, error: "Invalid input" }
  }

  const prismaUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      patient: true,
    },
  })

  if (!prismaUser) {
    throw new Error("No user (Prisma)")
  }

  await prisma.patient.create({
    data: {
      age: parsed.data.age,
      gender: parsed.data.gender,
      user: { connect: { id: user.id } },
    },
  })

  return { ok: true }
}

export async function saveChatTranscript(
  input: chatSchemaInput,
): Promise<ServerActionResult> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { ok: false, error: "Unauthorized" }
  }

  const parsed = chatSchema.safeParse(input)

  if (!parsed.success) {
    return { ok: false, error: "Invalid input" }
  }

  const { messages } = parsed.data

  const userId = authData.user.id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })

  if (!user) {
    return { ok: false, error: "User profile not found" }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: "PATIENT" },
  })

  const patient = await prisma.patient.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!patient) {
    return { ok: false, error: "Patient profile not found" }
  }

  await prisma.chatSession.create({
    data: {
      patientId: patient.id,
      status: "closed",
      endedAt: new Date(),
      messages: {
        create: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      },
    },
  })

  return { ok: true }
}
