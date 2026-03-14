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
import { createClient } from "@/lib/supabase/server"

type ChatMessageSummary = {
  content: string
}

type ChatSessionSummary = {
  id: string
  status: string
  createdAt: Date
  messages: ChatMessageSummary[]
}

export default async function PatientDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("No user (Supabase)")
  }

  const prismaUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      patient: {
        include: {
          doctor: { include: { user: true } },
          chatSessions: {
            orderBy: { createdAt: "desc" },
            include: { messages: true },
          },
          therapySessions: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  })

  if (!prismaUser) {
    throw new Error("No user (Prisma)")
  }

  const patient = prismaUser.patient ?? null

  const chatSessions: ChatSessionSummary[] = patient?.chatSessions ?? []

  return (
    <main className="min-h-screen overflow-hidden bg-(image:--page-bg)">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-(image:--page-blob-1) blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-(image:--page-blob-2) blur-3xl" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
        <SiteNav />
        <header className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground font-display">
            Welcome back
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Review your intake details, continue a Socratic chat, and keep the
            clinician informed with clear transcripts.
          </p>
        </header>

        <Card className="bg-background/80">
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
            <CardDescription>
              {user
                ? `Signed in as ${user.email}`
                : "Sign in to view your profile."}
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle>Intake</CardTitle>
              <CardDescription>
                A structured form before the chat begins.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {patient ? (
                <p>Congratulations! You have completed the intake process.</p>
              ) : (
                <>
                  <LinkButton href="/patient/intake">Begin intake</LinkButton>
                  <p className="text-sm text-muted-foreground">
                    Share only what you are comfortable sharing.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle>Socratic chat</CardTitle>
              <CardDescription>
                Continue the LLM conversation at your pace.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <LinkButton href="/patient/chat">Open chat</LinkButton>
              <p className="text-sm text-muted-foreground">
                Tell your woes to your virtual assistant, who will help your
                doctor understand your situation better.
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <section className="grid gap-6 md:grid-cols-2">
          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle>Chat transcripts</CardTitle>
              <CardDescription>
                {patient?.chatSessions.length ?? 0} chat sessions saved.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
                  <p className="mt-2 text-muted-foreground">
                    {session.messages[0]?.content ??
                      "Transcript saved. View on the doctor dashboard."}
                  </p>
                </div>
              ))}
              {!chatSessions.length && (
                <p className="text-sm text-muted-foreground">
                  No chat sessions yet.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        <Card className="bg-background/80">
          <CardHeader>
            <CardTitle>Care team</CardTitle>
            <CardDescription>
              {patient?.doctor
                ? "Assigned clinician"
                : "No clinician assigned yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {patient?.doctor?.user ? (
              <div>
                <p className="font-medium text-foreground">
                  {patient.doctor.user.firstName} {patient.doctor.user.lastName}
                </p>
                <p>{patient.doctor.user.email}</p>
              </div>
            ) : (
              <p>
                Ask your clinician for the correct email to attach your profile.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
