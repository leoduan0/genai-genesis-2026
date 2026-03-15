"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type IntakePhase = "writing" | "processing" | "transition";

export default function ScreeningIntakePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<IntakePhase>("writing");
  const [autoScoredCount, setAutoScoredCount] = useState(0);

  async function handleSubmit() {
    if (!text.trim()) return;

    const sessionId = sessionStorage.getItem("screeningSessionId");
    if (!sessionId) {
      router.push("/patient/screening");
      return;
    }

    setPhase("processing");

    try {
      const res = await fetch(`/api/screening/${sessionId}/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAutoScoredCount(data.autoScoredCount);

      // Store first item for chat page
      if (data.selectedItem) {
        sessionStorage.setItem("screeningFirstItem", JSON.stringify(data.selectedItem));
      }

      setPhase("transition");
    } catch (err) {
      console.error("Failed to process intake:", err);
      setPhase("writing");
    }
  }

  function handleContinue() {
    router.push("/patient/screening/chat");
  }

  if (phase === "processing") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(image:--page-bg)">
        <div className="flex flex-col items-center gap-4">
          <Spinner />
          <p className="text-lg text-muted-foreground">
            Understanding your response...
          </p>
        </div>
      </main>
    );
  }

  if (phase === "transition") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(image:--page-bg)">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tight font-display">
            Thank you for sharing
          </h2>
          <p className="text-muted-foreground">
            We&apos;ve noted what you shared.
            {autoScoredCount > 0 &&
              ` We were able to understand ${autoScoredCount} aspect${autoScoredCount > 1 ? "s" : ""} from your description.`}{" "}
            Now we&apos;ll ask a few specific questions to understand better.
          </p>
          <Button
            size="lg"
            className="rounded-xl text-base"
            onClick={handleContinue}
          >
            Continue to questions
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-(image:--page-bg)">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
        <Badge className="w-fit" variant="secondary">
          Step 1 of 3
        </Badge>

        <h1 className="text-2xl font-semibold tracking-tight font-display">
          Tell us what&apos;s been going on
        </h1>

        <textarea
          className="min-h-[200px] w-full resize-y rounded-xl border border-border bg-background p-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Share what feels important to you..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <p className="text-sm text-muted-foreground">
          There are no wrong answers. You can share as much or as little as you
          like.
        </p>

        <Button
          size="lg"
          className="w-full rounded-xl text-base"
          onClick={handleSubmit}
          disabled={!text.trim()}
        >
          Continue
        </Button>
      </div>
    </main>
  );
}
