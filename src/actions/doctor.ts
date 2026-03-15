"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { ensureDoctorProfile } from "@/lib/doctor"
import { prisma } from "@/lib/prisma"
import { therapySchema, type therapySchemaInput } from "@/schemas/therapy"
import { createClient } from "@/lib/supabase/server"
import type { ServerActionResult } from "@/types/server-action"

type SaveTherapySessionData = {
  sessionId: string
}

function buildFallbackSummary(transcript?: string) {
  if (!transcript) {
    return null
  }

  const chunks = transcript
    .split(".")
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  if (!chunks.length) {
    return null
  }

  return chunks.slice(0, 2).join(". ")
}

export async function assignPatientToDoctor(patientId: string) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect("/sign-in")
  }

  const doctor = await ensureDoctorProfile(authUser.id)

  if (!doctor) {
    redirect("/patient")
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { doctorId: true },
  })

  if (!patient) {
    redirect("/doctor")
  }

  if (!patient.doctorId) {
    await prisma.patient.update({
      where: { id: patientId },
      data: { doctorId: doctor.id },
    })
  }

  revalidatePath("/doctor")
  revalidatePath(`/doctor/patients/${patientId}`)

  redirect(`/doctor/patients/${patientId}`)
}

export async function saveTherapySession(
  input: therapySchemaInput,
): Promise<ServerActionResult<SaveTherapySessionData>> {
  const parsed = therapySchema.safeParse(input)

  if (!parsed.success) {
    return { ok: false, error: "Invalid therapy session payload" }
  }

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return { ok: false, error: "Unauthorized" }
  }

  const doctor = await ensureDoctorProfile(authUser.id)

  if (!doctor) {
    return { ok: false, error: "Only doctors can save therapy sessions" }
  }

  const patient = await prisma.patient.findFirst({
    where: {
      user: {
        email: parsed.data.patientEmail,
      },
    },
    select: {
      id: true,
      doctorId: true,
    },
  })

  if (!patient) {
    return { ok: false, error: "No patient found for that email" }
  }

  if (patient.doctorId && patient.doctorId !== doctor.id) {
    return { ok: false, error: "Patient is assigned to another clinician" }
  }

  if (!patient.doctorId) {
    await prisma.patient.update({
      where: { id: patient.id },
      data: { doctorId: doctor.id },
    })
  }

  const title = parsed.data.title?.trim() || null
  const transcript = parsed.data.transcript?.trim() || null
  const summary =
    parsed.data.summary?.trim() || buildFallbackSummary(transcript ?? undefined)

  const transcriptLines = (transcript ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const session = await prisma.therapySession.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      title,
      transcript,
      summary,
      ...(transcriptLines.length
        ? {
            messages: {
              create: transcriptLines.slice(0, 150).map((content) => ({
                role: "note",
                content,
              })),
            },
          }
        : {}),
    },
    select: { id: true },
  })

  revalidatePath("/doctor")
  revalidatePath(`/doctor/patients/${patient.id}`)

  return { ok: true, data: { sessionId: session.id } }
}
