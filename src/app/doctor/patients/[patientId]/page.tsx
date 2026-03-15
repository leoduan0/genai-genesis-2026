import { notFound } from "next/navigation"
import { assignPatientToDoctor } from "@/actions/doctor"
import { SiteNav } from "@/components/site-nav"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { LinkButton } from "@/components/ui/link-button"
import { Separator } from "@/components/ui/separator"
import { ensureDoctorProfile } from "@/lib/doctor"
import { prisma } from "@/lib/prisma"
import { buildScreeningPreview } from "@/lib/screening-preview"
import { createClient } from "@/lib/supabase/server"

type PatientDetailPageProps = {
  params: Promise<{
    patientId: string
  }>
}

function formatDate(value: Date) {
  return value.toLocaleDateString()
}

export default async function PatientDetailPage({
  params,
}: PatientDetailPageProps) {
  const { patientId } = await params

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    notFound()
  }

  const doctor = await ensureDoctorProfile(authUser.id)

  if (!doctor) {
    notFound()
  }

  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      OR: [{ doctorId: doctor.id }, { doctorId: null }],
    },
    include: {
      doctor: { include: { user: true } },
      user: true,
      chatSessions: {
        orderBy: { createdAt: "desc" },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      },
      therapySessions: { orderBy: { createdAt: "desc" } },
    },
  })

  if (!patient) {
    notFound()
  }

  const patientMessages = patient.chatSessions.flatMap((session) =>
    session.messages
      .filter((message) => message.role.toLowerCase() === "patient")
      .map((message) => message.content),
  )

  const screening = buildScreeningPreview(patientMessages)
  const activeSignals = screening.signals.filter((signal) => signal.score > 0)
  const isUnassigned = !patient.doctorId

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f5f2,transparent_55%),radial-gradient(circle_at_bottom,#e8f0ec,transparent_45%)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
        <SiteNav />
        <header className="flex flex-col gap-4">
          <Badge className="border-foreground/20 text-foreground">
            Patient profile
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground font-display">
            {patient.user.firstName} {patient.user.lastName}
          </h1>
          <p className="text-muted-foreground">{patient.user.email}</p>
          <div>
            <LinkButton href="/doctor">Back to dashboard</LinkButton>
          </div>
        </header>

        <Card className="bg-background/80">
          <CardHeader>
            <CardTitle>Care summary</CardTitle>
            <CardDescription>
              {patient.doctor?.user
                ? `Assigned clinician: ${patient.doctor.user.firstName} ${patient.doctor.user.lastName}`
                : "No clinician assigned."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {isUnassigned && <Badge>Unassigned screening</Badge>}
            <Badge>
              {patient.age} years, {patient.gender.toLowerCase()}
            </Badge>
            <Badge>{patient.chatSessions.length} chat sessions</Badge>
            <Badge>{patient.therapySessions.length} therapy notes</Badge>
          </CardContent>
        </Card>

        {isUnassigned && (
          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle>Claim this patient</CardTitle>
              <CardDescription>
                This screening is not assigned to any clinician yet.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
              <p>
                Claiming adds this patient to your caseload so they appear on
                your doctor dashboard.
              </p>
              <form action={assignPatientToDoctor.bind(null, patient.id)}>
                <Button type="submit">Claim patient</Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Separator />

        <section className="grid gap-6">
          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle>Bayesian screening preview</CardTitle>
              <CardDescription>
                Prototype signal map derived from patient transcript language. Not
                a diagnosis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge>{screening.messageCount} patient messages</Badge>
                <Badge>{screening.tokenCount} words analyzed</Badge>
                <Badge>confidence {screening.confidence}%</Badge>
              </div>

              {screening.hasCrisisLanguage && (
                <p className="text-sm text-destructive">
                  Crisis language was detected in transcript content. Prioritize
                  review.
                </p>
              )}

              {!!activeSignals.length && (
                <div className="space-y-3">
                  {activeSignals.slice(0, 5).map((signal) => (
                    <div
                      key={signal.id}
                      className="rounded-none border border-border p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-medium text-foreground">
                          {signal.label}
                        </p>
                        <Badge>{signal.score}/100</Badge>
                      </div>
                      <div className="mt-2 h-2 w-full bg-muted">
                        <div
                          className="h-full bg-foreground"
                          style={{ width: `${signal.score}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Mentions: {signal.mentions}. Evidence keywords: {signal.matchedKeywords.slice(0, 4).join(", ")}.
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {!activeSignals.length && (
                <p className="text-sm text-muted-foreground">
                  Not enough patient transcript evidence yet to generate signal
                  scores.
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                This preview is a prototype triage aid and should be interpreted
                alongside clinical interview and validated instruments.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle>Chat transcripts</CardTitle>
              <CardDescription>LLM-led Socratic sessions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {patient.chatSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-none border border-border p-4 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {formatDate(session.createdAt)}
                    </span>
                    <Badge>{session.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {session.messages.length} total transcript messages.
                  </p>
                  <div className="mt-3 space-y-2">
                    {session.messages.slice(0, 4).map((message) => (
                      <p key={message.id} className="text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {message.role}:
                        </span>{" "}
                        {message.content}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
              {!patient.chatSessions.length && (
                <p className="text-sm text-muted-foreground">
                  No chat transcripts saved yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle>Therapy session notes</CardTitle>
              <CardDescription>Clinician-provided transcripts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {patient.therapySessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-none border border-border p-4 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {formatDate(session.createdAt)}
                    </span>
                    <Badge>Session</Badge>
                  </div>
                  {session.title && (
                    <p className="mt-2 font-medium text-foreground">
                      {session.title}
                    </p>
                  )}
                  <p className="mt-2 text-muted-foreground">
                    {session.summary ?? "Summary pending."}
                  </p>
                </div>
              ))}
              {!patient.therapySessions.length && (
                <p className="text-sm text-muted-foreground">
                  No therapy sessions added yet.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
