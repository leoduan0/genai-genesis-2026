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

type PatientSummary = {
  id: string
  user: {
    firstName: string
    lastName: string
    email: string
  }
  intakeForms: Array<{ id: string }>
  chatSessions: Array<{ id: string }>
  therapySessions: Array<{ id: string }>
}

export default async function DoctorDashboard() {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const authUser = authData.user

  const user = authUser
    ? await prisma.user.findUnique({
        where: { id: authUser.id },
        include: {
          doctor: {
            include: {
              patients: {
                include: {
                  user: true,
                  chatSessions: true,
                  therapySessions: true,
                },
              },
            },
          },
        },
      })
    : null

  const doctor = user?.doctor ?? null
  const patients: PatientSummary[] = doctor?.patients ?? []

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
              {user
                ? `Signed in as ${user.email}`
                : "Sign in to view your caseload."}
            </CardDescription>
          </CardHeader>
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
              <CardTitle>Patient intake overview</CardTitle>
              <CardDescription>
                {doctor?.patients.length ?? 0} patients connected.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Intake forms and chat transcripts appear on each patient profile.
            </CardContent>
          </Card>
        </div>

        <Separator />

        <section className="grid gap-6 md:grid-cols-2">
          {patients.map((patient) => (
            <Card key={patient.id} className="bg-background/80">
              <CardHeader>
                <CardTitle>
                  {patient.user.firstName} {patient.user.lastName}
                </CardTitle>
                <CardDescription>{patient.user.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex flex-wrap gap-2">
                  <Badge>{patient.intakeForms.length} intake</Badge>
                  <Badge>{patient.chatSessions.length} chats</Badge>
                  <Badge>{patient.therapySessions.length} therapy notes</Badge>
                </div>
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
                  Patients appear once they are connected to your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Ask your patients to complete intake and chat to populate their
                profile history.
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </main>
  )
}
