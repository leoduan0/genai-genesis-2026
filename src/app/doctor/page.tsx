import { SiteNav } from "@/components/site-nav"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { LinkButton } from "@/components/ui/link-button"
import { Separator } from "@/components/ui/separator"
import { ROLES } from "@/generated/prisma/enums"
import { ensureDoctorProfile } from "@/lib/doctor"
import { buildScreeningPreview } from "@/lib/screening-preview"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

type PatientDashboardRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  age: number
  gender: string
  chatCount: number
  therapyCount: number
  lastActivity: Date | null
  topSignalLabel: string | null
  topSignalScore: number
  confidence: number
  hasCrisisLanguage: boolean
  assignmentState: "assigned" | "incoming"
}

type PatientRecord = {
  id: string
  age: number
  gender: string
  user: {
    firstName: string
    lastName: string
    email: string
  }
  chatSessions: Array<{
    createdAt: Date
    messages: Array<{
      role: string
      content: string
    }>
  }>
  therapySessions: Array<{
    id: string
    createdAt: Date
  }>
}

function latestDate(values: Array<Date | null | undefined>) {
  const validDates = values.filter((value): value is Date => value instanceof Date)

  if (!validDates.length) {
    return null
  }

  return new Date(Math.max(...validDates.map((value) => value.getTime())))
}

function formatDate(value: Date | null) {
  if (!value) {
    return "No activity yet"
  }

  return value.toLocaleDateString()
}

function buildPatientRow(
  patient: PatientRecord,
  assignmentState: PatientDashboardRow["assignmentState"],
): PatientDashboardRow {
  const patientMessages = patient.chatSessions.flatMap((session) =>
    session.messages
      .filter((message) => message.role.toLowerCase() === "patient")
      .map((message) => message.content),
  )

  const screening = buildScreeningPreview(patientMessages)
  const latestChatDate = patient.chatSessions[0]?.createdAt ?? null
  const latestTherapyDate = patient.therapySessions[0]?.createdAt ?? null

  return {
    id: patient.id,
    firstName: patient.user.firstName,
    lastName: patient.user.lastName,
    email: patient.user.email,
    age: patient.age,
    gender: patient.gender.toLowerCase(),
    chatCount: patient.chatSessions.length,
    therapyCount: patient.therapySessions.length,
    lastActivity: latestDate([latestChatDate, latestTherapyDate]),
    topSignalLabel: screening.topSignal?.label ?? null,
    topSignalScore: screening.topSignal?.score ?? 0,
    confidence: screening.confidence,
    hasCrisisLanguage: screening.hasCrisisLanguage,
    assignmentState,
  }
}

export default async function DoctorDashboard() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  const doctorUser = authUser
    ? await prisma.user.findUnique({
        where: { id: authUser.id },
        select: {
          id: true,
          email: true,
          role: true,
        },
      })
    : null

  const doctor = authUser ? await ensureDoctorProfile(authUser.id) : null

  const patientInclude = {
    user: true,
    chatSessions: {
      orderBy: { createdAt: "desc" as const },
      include: {
        messages: {
          select: {
            role: true,
            content: true,
          },
        },
      },
    },
    therapySessions: {
      orderBy: { createdAt: "desc" as const },
      select: {
        id: true,
        createdAt: true,
      },
    },
  }

  const assignedPatientRecords = doctor
    ? await prisma.patient.findMany({
        where: { doctorId: doctor.id },
        include: patientInclude,
      })
    : []

  const incomingPatientRecords = doctor
    ? await prisma.patient.findMany({
        where: { doctorId: null },
        include: patientInclude,
      })
    : []

  const sortPatients = (rows: PatientDashboardRow[]) =>
    rows.sort((a, b) => {
      if (!a.lastActivity && !b.lastActivity) {
        return 0
      }

      if (!a.lastActivity) {
        return 1
      }

      if (!b.lastActivity) {
        return -1
      }

      return b.lastActivity.getTime() - a.lastActivity.getTime()
    })

  const patients = sortPatients(
    assignedPatientRecords.map((patient) => buildPatientRow(patient, "assigned")),
  )

  const incomingPatients = sortPatients(
    incomingPatientRecords.map((patient) => buildPatientRow(patient, "incoming")),
  )

  const urgentCount = [...patients, ...incomingPatients].filter(
    (patient) => patient.hasCrisisLanguage,
  ).length

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f5f2,transparent_55%),radial-gradient(circle_at_bottom,#e8f0ec,transparent_45%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
        <SiteNav />
        <header className="flex flex-col gap-4">
          <Badge className="border-foreground/20 text-foreground">
            Doctor dashboard
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground font-display">
            Clinician workspace
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Monitor patients, review Socratic transcripts, and add therapy
            session notes in real time.
          </p>
        </header>

        <Card className="bg-background/80">
          <CardHeader>
            <CardTitle>Your caseload</CardTitle>
            <CardDescription>
              {doctorUser
                ? `Signed in as ${doctorUser.email}`
                : "Sign in to view your caseload."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge>{patients.length} assigned patients</Badge>
            <Badge>{incomingPatients.length} incoming screenings</Badge>
            <Badge>{urgentCount} need urgent review</Badge>
            {doctorUser?.role !== ROLES.DOCTOR && (
              <Badge>Doctor access required</Badge>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle>Therapy session mode</CardTitle>
              <CardDescription>
                Capture live transcripts and auto summaries.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <LinkButton href="/doctor/therapy-session">
                Start a session
              </LinkButton>
              <p className="text-sm text-muted-foreground">
                Paste a transcript or write notes while you speak.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle>How this works</CardTitle>
              <CardDescription>
                What you should expect to do on this page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>1. Patients complete intake and chat.</p>
              <p>2. New, unassigned screenings appear below for review.</p>
              <p>3. Open a patient, review transcript signals, then claim the case or add therapy notes.</p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <section className="grid gap-6">
          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Your patients
              </h2>
              <p className="text-sm text-muted-foreground">
                Patients already connected to your clinician account.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
          {patients.map((patient) => (
            <Card key={patient.id} className="bg-background/80">
              <CardHeader>
                <CardTitle>
                  {patient.firstName} {patient.lastName}
                </CardTitle>
                <CardDescription>{patient.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex flex-wrap gap-2">
                  <Badge>
                    {patient.age} years, {patient.gender}
                  </Badge>
                  <Badge>{patient.chatCount} chats</Badge>
                  <Badge>{patient.therapyCount} therapy notes</Badge>
                </div>

                <p>
                  Last activity: <span className="font-medium text-foreground">{formatDate(patient.lastActivity)}</span>
                </p>

                {patient.topSignalLabel && patient.topSignalScore > 0 ? (
                  <p>
                    Top signal: <span className="font-medium text-foreground">{patient.topSignalLabel}</span> ({patient.topSignalScore}/100)
                    <span className="ml-1 text-xs">confidence {patient.confidence}%</span>
                  </p>
                ) : (
                  <p>No transcript-derived signals yet.</p>
                )}

                {patient.hasCrisisLanguage && (
                  <p className="text-destructive">
                    Crisis language detected in transcript. Review latest chat.
                  </p>
                )}

                <LinkButton href={`/doctor/patients/${patient.id}`}>
                  View patient
                </LinkButton>
              </CardContent>
            </Card>
          ))}
          {!patients.length && (
            <Card className="bg-background/80">
              <CardHeader>
                <CardTitle>No patients yet</CardTitle>
                <CardDescription>
                  No one is assigned to you yet.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Review the incoming screenings queue below, or use therapy
                session mode with a patient email to attach a patient to your
                caseload.
              </CardContent>
            </Card>
          )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Incoming screenings
              </h2>
              <p className="text-sm text-muted-foreground">
                Unassigned patient screenings that are available for review.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {incomingPatients.map((patient) => (
                <Card key={patient.id} className="bg-background/80">
                  <CardHeader>
                    <CardTitle>
                      {patient.firstName} {patient.lastName}
                    </CardTitle>
                    <CardDescription>{patient.email}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex flex-wrap gap-2">
                      <Badge>Unassigned</Badge>
                      <Badge>
                        {patient.age} years, {patient.gender}
                      </Badge>
                      <Badge>{patient.chatCount} chats</Badge>
                    </div>

                    <p>
                      Last activity: <span className="font-medium text-foreground">{formatDate(patient.lastActivity)}</span>
                    </p>

                    {patient.topSignalLabel && patient.topSignalScore > 0 ? (
                      <p>
                        Top signal: <span className="font-medium text-foreground">{patient.topSignalLabel}</span> ({patient.topSignalScore}/100)
                        <span className="ml-1 text-xs">confidence {patient.confidence}%</span>
                      </p>
                    ) : (
                      <p>Screening has intake data only. No strong transcript signal yet.</p>
                    )}

                    {patient.hasCrisisLanguage && (
                      <p className="text-destructive">
                        Crisis language detected in transcript. Review now.
                      </p>
                    )}

                    <LinkButton href={`/doctor/patients/${patient.id}`}>
                      Review screening
                    </LinkButton>
                  </CardContent>
                </Card>
              ))}

              {!incomingPatients.length && (
                <Card className="bg-background/80">
                  <CardHeader>
                    <CardTitle>No incoming screenings</CardTitle>
                    <CardDescription>
                      New patient activity will appear here.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Once a patient completes intake or chat without an assigned
                    clinician, their screening will show up in this queue.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
