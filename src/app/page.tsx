import { SiteNav } from "@/components/site-nav"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { APP_DESCRIPTION } from "@/lib/constants"

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-(image:--page-bg)">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-(image:--page-blob-1) blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-(image:--page-blob-2) blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-12">
        <SiteNav />

        <header className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-6xl font-display">
              Calm, structured intake for modern mental health care.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              {APP_DESCRIPTION}. Guide patients through respectful reflection,
              capture transcripts instantly, and deliver doctor-ready summaries
              without crossing therapy boundaries.
            </p>
          </div>

          <Card className="relative bg-background/80">
            <CardHeader>
              <CardTitle>Live intake preview</CardTitle>
              <CardDescription>Adaptive, reflective, and calm.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-foreground">
                Assistant: What feels most important for your clinician to
                understand today?
              </div>
              <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                Patient: I feel stuck in perfectionism and the pressure is
                exhausting.
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-foreground">
                Assistant: When do you notice that pressure rising the most?
              </div>
              <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                Transcript auto-saved for clinician review.
              </div>
            </CardContent>
          </Card>
        </header>

        <Separator />

        <section className="grid gap-6 md:grid-cols-3">
          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle>1. Intake form</CardTitle>
              <CardDescription>
                Capture context, history, and boundaries.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Consent-aware prompts aligned with shadcn/react-hook-form
              guidance.
            </CardContent>
          </Card>
          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle>2. Socratic chat</CardTitle>
              <CardDescription>
                The LLM listens and reflects without advising.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Patients stay in control while transcripts update in real time.
            </CardContent>
          </Card>
          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle>3. Clinician handoff</CardTitle>
              <CardDescription>
                Summaries and notes in one dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Review intake, chat, and therapy session notes without extra lift.
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
