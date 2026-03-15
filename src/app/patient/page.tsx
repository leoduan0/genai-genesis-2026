import { SiteNav } from "@/components/site-nav"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { LinkButton } from "@/components/ui/link-button"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

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
        },
      },
    },
  })

  if (!prismaUser) {
    throw new Error("No user (Prisma)")
  }

  const patient = prismaUser.patient ?? null

  return (
    <main className="min-h-screen overflow-hidden bg-(image:--page-bg)">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-(image:--page-blob-1) blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-(image:--page-blob-2) blur-3xl" />

      <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-12 py-20">
        <SiteNav />
        <header className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground font-display">
            Welcome back
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Start or continue your mental health assessment and keep your
            clinician informed.
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

        <Card className="bg-background/80">
          <CardHeader>
            <CardTitle>Mental Health Assessment</CardTitle>
            <CardDescription>
              A personalized, adaptive screening to help your clinician
              understand how you are doing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LinkButton href="/patient/screening">
              Start assessment
            </LinkButton>
          </CardContent>
        </Card>

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
