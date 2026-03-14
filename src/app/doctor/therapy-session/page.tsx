"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { saveTherapySession } from "@/actions/doctor"
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LinkButton } from "@/components/ui/link-button"
import { Textarea } from "@/components/ui/textarea"

const therapySchema = z.object({
  patientEmail: z.email("Enter a valid email."),
  title: z.string().optional(),
  transcript: z.string().optional(),
  summary: z.string().optional(),
})

type TherapyValues = z.infer<typeof therapySchema>

type SaveState = "idle" | "saving" | "success" | "error"

function buildClientSummary(transcript?: string) {
  if (!transcript) {
    return ""
  }

  const sentences = transcript
    .split(".")
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  return sentences.slice(0, 2).join(". ")
}

export default function TherapySessionPage() {
  const [saveState, setSaveState] = useState<SaveState>("idle")

  const form = useForm<TherapyValues>({
    resolver: zodResolver(therapySchema),
    defaultValues: {
      patientEmail: "",
      title: "",
      transcript: "",
      summary: "",
    },
  })

  const transcriptValue = form.watch("transcript")
  const summarySuggestion = useMemo(
    () => buildClientSummary(transcriptValue),
    [transcriptValue],
  )

  async function onSubmit(values: TherapyValues) {
    setSaveState("saving")

    const result = await saveTherapySession(values)

    if (!result.ok) {
      setSaveState("error")
      return
    }

    setSaveState("success")
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f5f2,transparent_55%),radial-gradient(circle_at_bottom,#e8f0ec,transparent_45%)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
        <SiteNav />
        <header className="flex flex-col gap-4">
          <Badge className="border-foreground/20 text-foreground">
            Therapy session mode
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground font-display">
            Live transcript + summary
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Paste a transcript or type notes during the session. A summary is
            generated while you work.
          </p>
          <div>
            <LinkButton href="/doctor">Back to dashboard</LinkButton>
          </div>
        </header>

        <Card className="bg-background/80">
          <CardHeader>
            <CardTitle>Session details</CardTitle>
            <CardDescription>
              Captured notes are linked to the patient profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="patientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="alex@email.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage>
                        {form.formState.errors.patientEmail?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session title (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Initial consult" {...field} />
                      </FormControl>
                      <FormMessage>
                        {form.formState.errors.title?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transcript"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transcript or notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Type notes as you go or paste a transcript."
                          className="min-h-56"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage>
                        {form.formState.errors.transcript?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="summary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session summary</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Summary generated while you type."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage>
                        {form.formState.errors.summary?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />

                {summarySuggestion && !form.watch("summary") && (
                  <p className="text-sm text-muted-foreground">
                    Suggested summary: {summarySuggestion}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={saveState === "saving"}>
                    {saveState === "saving" ? "Saving..." : "Save session"}
                  </Button>
                  {saveState === "success" && (
                    <span className="text-sm text-foreground">
                      Session saved to the patient profile.
                    </span>
                  )}
                  {saveState === "error" && (
                    <span className="text-sm text-destructive">
                      Something went wrong. Try again.
                    </span>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
