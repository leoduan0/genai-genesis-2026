"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const POPULATION_OPTIONS = [
  { value: "GENERAL", label: "General" },
  { value: "CLINICAL", label: "Clinical" },
  { value: "COLLEGE", label: "College student" },
  { value: "PRIMARY_CARE", label: "Primary care" },
] as const;

export default function ScreeningEntryPage() {
  const router = useRouter();
  const [populationType, setPopulationType] = useState<string>("GENERAL");
  const [loading, setLoading] = useState(false);

  async function handleBegin() {
    setLoading(true);
    try {
      const res = await fetch("/api/screening/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ populationType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Store sessionId for subsequent pages
      sessionStorage.setItem("screeningSessionId", data.sessionId);
      router.push("/patient/screening/intake");
    } catch (err) {
      console.error("Failed to start screening:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-(image:--page-bg)">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12">
        <div className="flex flex-col gap-6">
          <Badge className="w-fit" variant="secondary">
            Adaptive screening
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground font-display">
            Personalized mental health screening
          </h1>
          <p className="text-muted-foreground">
            This screening adapts to your responses, focusing on what matters
            most. It typically takes about 25 questions — sometimes fewer,
            sometimes a few more. This is not a diagnosis. Results are meant to
            guide a conversation with your provider.
          </p>
        </div>

        <Card className="bg-background/80">
          <CardHeader>
            <CardTitle className="text-base">Population context</CardTitle>
            <CardDescription>
              This helps calibrate the screening to your situation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {POPULATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPopulationType(opt.value)}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    populationType === opt.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-accent"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          size="lg"
          className="w-full rounded-xl text-base"
          onClick={handleBegin}
          disabled={loading}
        >
          {loading ? "Starting..." : "Begin screening"}
        </Button>
      </div>
    </main>
  );
}
