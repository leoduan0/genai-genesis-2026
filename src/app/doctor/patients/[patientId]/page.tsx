import { notFound } from "next/navigation"
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
import { prisma } from "@/lib/prisma"

type PatientDetailPageProps = {
  params: {
    patientId: string
  }
}

type IntakeFormSummary = {
  id: string
  age: number
  gender: "MALE" | "FEMALE" | "OTHER"
  createdAt: Date
}

type ChatMessageSummary = {
  id: string
  role: string
  content: string
}

type ChatSessionSummary = {
  id: string
  status: string
  createdAt: Date
  messages: ChatMessageSummary[]
}

type TherapySessionSummary = {
  id: string
  summary: string | null
  createdAt: Date
}

export default async function PatientDetailPage({
  params,
}: PatientDetailPageProps) {
  const user = await prisma.user.findUnique({
    where: { id: params.patientId },
  })

  const patient = await prisma.patient.findUnique({
    where: { id: params.patientId },
    include: {
      doctor: { include: { user: true } },
      user: true,
      intakeForms: { orderBy: { createdAt: "desc" } },
      chatSessions: {
        orderBy: { createdAt: "desc" },
        include: { messages: true },
      },
      therapySessions: { orderBy: { createdAt: "desc" } },
    },
  })

  if (!user || !patient) {
    notFound()
  }

  const intakeForms: IntakeFormSummary[] = patient.intakeForms
  const chatSessions: ChatSessionSummary[] = patient.chatSessions
  const therapySessions: TherapySessionSummary[] = patient.therapySessions

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f5f2,transparent_55%),radial-gradient(circle_at_bottom,#e8f0ec,transparent_45%)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
        <SiteNav />
        <header className="flex flex-col gap-4">
          <Badge className="border-foreground/20 text-foreground">
            Patient profile
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground font-display">
            {user.firstName} {user.lastName}
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
            <Badge>{patient.intakeForms.length} intake forms</Badge>
            <Badge>{patient.chatSessions.length} chat sessions</Badge>
            <Badge>{patient.therapySessions.length} therapy notes</Badge>
          </CardContent>
        </Card>

        <Separator />

        <section className="grid gap-6">
          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle>Intake forms</CardTitle>
              <CardDescription>
                Latest submissions from the patient.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {intakeForms.map((form) => (
                <div
                  key={form.id}
                  className="rounded-none border border-border p-4 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {form.createdAt.toLocaleDateString()}
                    </span>
                    <Badge>Intake</Badge>
                  </div>
                  <p className="mt-2 text-muted-foreground">
                    Age {form.age}, gender {form.gender.toLowerCase()}
                  </p>
                </div>
              ))}
              {!intakeForms.length && (
                <p className="text-sm text-muted-foreground">
                  No intake submissions yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle>Chat transcripts</CardTitle>
              <CardDescription>LLM-led Socratic sessions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-none border border-border p-4 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {session.createdAt.toLocaleDateString()}
                    </span>
                    <Badge>{session.status}</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {session.messages.slice(0, 3).map((message) => (
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
              {!chatSessions.length && (
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
              {therapySessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-none border border-border p-4 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {session.createdAt.toLocaleDateString()}
                    </span>
                    <Badge>Session</Badge>
                  </div>
                  <p className="mt-2 text-muted-foreground">
                    {session.summary ?? "Summary pending."}
                  </p>
                </div>
              ))}
              {!therapySessions.length && (
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
