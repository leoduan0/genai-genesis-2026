"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { saveChatTranscript } from "@/actions/patient"
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
import { Textarea } from "@/components/ui/textarea"

const socraticPrompts = [
  "What feels most important for your clinician to understand?",
  "When do you notice this feeling or pattern the most?",
  "What has been helping you cope, even in small ways?",
  "How does this impact your daily routines or relationships?",
  "If things improved, what would look different in your day?",
  "Is there anything you want to make sure we do not explore right now?",
]

type ChatMessage = {
  role: "patient" | "assistant"
  content: string
}

type SaveState = "idle" | "saving" | "success" | "error"

export default function PatientChatPage() {
  const router = useRouter()

  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Thank you for showing up today. I will only ask reflective questions and will not give therapy or treatment advice. When you are ready, what would you like to start with?",
    },
  ])
  const [saveState, setSaveState] = useState<SaveState>("idle")

  const nextPrompt = useMemo(() => {
    const assistantCount = messages.filter(
      (message) => message.role === "assistant",
    ).length
    return socraticPrompts[assistantCount % socraticPrompts.length]
  }, [messages])

  function handleSend() {
    if (!draft.trim()) {
      return
    }

    setMessages((prev) => [
      ...prev,
      { role: "patient", content: draft.trim() },
      { role: "assistant", content: nextPrompt },
    ])
    setDraft("")
  }

  async function handleSaveTranscript() {
    setSaveState("saving")

    const result = await saveChatTranscript({
      messages,
    })

    if (!result.ok) {
      setSaveState("error")
      return
    }

    setSaveState("success")
    router.push("/patient")
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f5f2,transparent_55%),radial-gradient(circle_at_bottom,#e8f0ec,transparent_45%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
        <SiteNav />
        <header className="flex flex-col gap-4">
          <Badge className="border-foreground/20 text-foreground">
            Socratic chat
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground font-display">
            Reflective, non-therapy conversation
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            The assistant will ask questions and listen. No advice, diagnosis,
            or treatment will be provided.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <LinkButton href="/patient">Back to dashboard</LinkButton>
            <LinkButton
              href="/patient"
              className="border-border bg-background text-foreground hover:bg-muted"
            >
              Close chat
            </LinkButton>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
              <CardDescription>
                Your clinician receives this transcript after you save it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`rounded-none border border-border px-4 py-3 text-sm ${
                      message.role === "assistant"
                        ? "bg-muted/50"
                        : "bg-background"
                    }`}
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {message.role}
                    </p>
                    <p className="mt-1 text-foreground">{message.content}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <Textarea
                  placeholder="Share what feels important."
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" onClick={handleSend}>
                    Send message
                  </Button>
                  <Button
                    type="button"
                    className="border-border bg-background text-foreground hover:bg-muted"
                    onClick={() => setMessages(messages.slice(0, 1))}
                  >
                    Reset chat
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-background/80">
              <CardHeader>
                <CardTitle>Save transcript</CardTitle>
                <CardDescription>
                  Your clinician receives this after you save it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="button"
                  onClick={handleSaveTranscript}
                  disabled={saveState === "saving"}
                  className="w-full"
                >
                  {saveState === "saving" ? "Saving..." : "Save and return"}
                </Button>
                {saveState === "success" && (
                  <p className="text-sm text-foreground">
                    Transcript saved. Redirecting to your dashboard.
                  </p>
                )}
                {saveState === "error" && (
                  <p className="text-sm text-destructive">
                    Unable to save transcript. Try again.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-background/80">
              <CardHeader>
                <CardTitle>Guidelines</CardTitle>
                <CardDescription>For your safety and comfort.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  The assistant listens and reflects. It does not give advice.
                </p>
                <p>You can skip any question or stop whenever you need.</p>
                <p>The transcript is only shared with your clinician.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
