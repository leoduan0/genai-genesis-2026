"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConditionResult {
  conditionId: string;
  name: string;
  shortCode: string;
  probability: number;
  uncertainty: number;
  classification: "likely" | "flagged" | "ruled_out" | "uncertain";
  wasAssessed: boolean;
}

interface SpectrumSummary {
  spectrumId: string;
  name: string;
  shortCode: string;
  magnitude: string;
  posteriorMean: number;
  wasAssessed: boolean;
  conditions: {
    conditionId: string;
    name: string;
    shortCode: string;
    classification: string;
    probability: number;
    wasAssessed: boolean;
  }[];
}

interface ReportSection {
  title: string;
  content: string;
}

interface ReportData {
  diagnosticProfile: {
    flagged: ConditionResult[];
    unflagged: ConditionResult[];
    spectrumResults: {
      spectrumId: string;
      name: string;
      shortCode: string;
      posteriorMean: number;
      posteriorVariance: number;
      magnitude: string;
      wasAssessed: boolean;
      conditions: ConditionResult[];
    }[];
    notAssessed: { spectrumId: string; name: string; shortCode: string }[];
    totalItemsAdministered: number;
    totalAutoScored: number;
  };
  report: {
    disclaimer: string;
    dimensionalProfile: ReportSection;
    flaggedConditions: {
      condition: ConditionResult;
      talkingPoints: string[];
    }[];
    spectrumSummaries: SpectrumSummary[];
    unflaggedSummary: ReportSection;
    notAssessed: ReportSection;
    uncertaintyDisclosure: string;
  };
  sessionMeta: {
    stage: string;
    itemsAdministered: number;
    startedAt: string;
    completedAt: string | null;
  };
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ScreeningReportPage() {
  const router = useRouter();
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = sessionStorage.getItem("screeningSessionId");
    if (!sessionId) {
      router.push("/patient/screening");
      return;
    }

    fetch(`/api/screening/${sessionId}/report`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load report");
        setData(json);
      })
      .catch((err) => setError(err.message));
  }, [router]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(image:--page-bg)">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => router.push("/patient")}>
            Return to dashboard
          </Button>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(image:--page-bg)">
        <div className="flex flex-col items-center gap-4">
          <Spinner />
          <p className="text-muted-foreground">Preparing your report...</p>
        </div>
      </main>
    );
  }

  const { report, diagnosticProfile, sessionMeta } = data;

  return (
    <TooltipProvider>
      <main className="min-h-screen bg-(image:--page-bg)">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <Badge className="w-fit" variant="secondary">
              Screening complete
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight font-display">
              Your screening results
            </h1>
            <p className="text-sm text-muted-foreground">
              {sessionMeta.itemsAdministered} questions answered
              {diagnosticProfile.totalAutoScored > 0 &&
                ` + ${diagnosticProfile.totalAutoScored} inferred`}
            </p>
          </div>

          {/* Disclaimer */}
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                {report.disclaimer}
              </p>
            </CardContent>
          </Card>

          {/* Two-tab layout */}
          <Tabs defaultValue="conditions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="conditions">Conditions</TabsTrigger>
              <TabsTrigger value="dimensional">Dimensional</TabsTrigger>
            </TabsList>

            {/* ── Tab 1: Conditions ────────────────────────────────── */}
            <TabsContent value="conditions" className="flex flex-col gap-4 mt-4">
              {report.flaggedConditions.length > 0 ? (
                <>
                  <h2 className="text-lg font-medium">Areas to discuss with your provider</h2>
                  {report.flaggedConditions.map(({ condition, talkingPoints }) => (
                    <Card key={condition.conditionId}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            {condition.name}
                          </CardTitle>
                          <ClassificationBadge
                            classification={condition.classification}
                            probability={condition.probability}
                          />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="flex flex-col gap-2">
                          {talkingPoints.map((point, i) => (
                            <li
                              key={i}
                              className="flex gap-2 text-sm text-muted-foreground"
                            >
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">
                      No conditions were flagged during this screening. If you have specific concerns,
                      please mention them to your provider.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Unflagged summary */}
              {diagnosticProfile.unflagged.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {report.unflaggedSummary.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {report.unflaggedSummary.content}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── Tab 2: Dimensional ───────────────────────────────── */}
            <TabsContent value="dimensional" className="flex flex-col gap-4 mt-4">
              <p className="text-sm text-muted-foreground">
                This view shows the dimensional structure of your screening results.
                Each spectrum represents a broad area of mental health, with specific conditions underneath.
              </p>

              {report.spectrumSummaries.map((spectrum) => (
                <Card key={spectrum.spectrumId}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {spectrum.name}
                      </CardTitle>
                      <MagnitudeBadge
                        magnitude={spectrum.magnitude}
                        wasAssessed={spectrum.wasAssessed}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {spectrum.conditions.map((cond) => (
                        <ConditionChip key={cond.conditionId} condition={cond} />
                      ))}
                      {spectrum.conditions.length === 0 && (
                        <span className="text-xs text-muted-foreground">
                          No conditions assessed under this spectrum
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>

          {/* Uncertainty disclosure */}
          <Card className="border-muted">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                {report.uncertaintyDisclosure}
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              variant="outline"
              className="flex-1 rounded-xl text-base"
              onClick={() => router.push("/patient/screening/followup")}
            >
              Ask a question
            </Button>
            <Button
              size="lg"
              className="flex-1 rounded-xl text-base"
              onClick={() => router.push("/patient")}
            >
              Return to dashboard
            </Button>
          </div>
        </div>
      </main>
    </TooltipProvider>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────

function ClassificationBadge({
  classification,
  probability,
}: {
  classification: ConditionResult["classification"];
  probability: number;
}) {
  const pct = `${(probability * 100).toFixed(0)}%`;

  switch (classification) {
    case "likely":
      return (
        <Badge className="border-red-300 bg-red-100 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          Likely
        </Badge>
      );
    case "flagged":
      return (
        <Badge className="border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Possible ({pct})
        </Badge>
      );
    case "uncertain":
      return (
        <Badge variant="secondary">
          Uncertain
        </Badge>
      );
    case "ruled_out":
      return (
        <Badge variant="outline">
          Unlikely
        </Badge>
      );
  }
}

function MagnitudeBadge({
  magnitude,
  wasAssessed,
}: {
  magnitude: string;
  wasAssessed: boolean;
}) {
  if (!wasAssessed) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Not screened
      </Badge>
    );
  }

  switch (magnitude) {
    case "very_high":
      return (
        <Badge className="border-red-300 bg-red-100 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          Very High
        </Badge>
      );
    case "high":
      return (
        <Badge className="border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          High
        </Badge>
      );
    case "moderate":
      return (
        <Badge variant="secondary">
          Moderate
        </Badge>
      );
    case "low":
      return (
        <Badge variant="outline">
          Low
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {magnitude}
        </Badge>
      );
  }
}

function ConditionChip({
  condition,
}: {
  condition: {
    conditionId: string;
    name: string;
    shortCode: string;
    classification: string;
    probability: number;
    wasAssessed: boolean;
  };
}) {
  const style = conditionChipStyle(condition.classification, condition.wasAssessed);

  return (
    <Tooltip>
      <TooltipTrigger
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium cursor-default ${style}`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${conditionDotColor(condition.classification, condition.wasAssessed)}`}
        />
        {condition.shortCode}
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{condition.name}</p>
        <p className="text-xs text-muted-foreground">
          {condition.wasAssessed
            ? `${classificationLabel(condition.classification)} (${(condition.probability * 100).toFixed(0)}%)`
            : "Not directly assessed"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function conditionChipStyle(classification: string, wasAssessed: boolean): string {
  if (!wasAssessed) {
    return "bg-muted text-muted-foreground";
  }
  switch (classification) {
    case "likely":
      return "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200";
    case "flagged":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
    case "ruled_out":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
    case "uncertain":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function conditionDotColor(classification: string, wasAssessed: boolean): string {
  if (!wasAssessed) return "bg-muted-foreground/40";
  switch (classification) {
    case "likely":
      return "bg-red-500";
    case "flagged":
      return "bg-amber-500";
    case "ruled_out":
      return "bg-emerald-500";
    case "uncertain":
      return "bg-slate-400";
    default:
      return "bg-muted-foreground/40";
  }
}

function classificationLabel(classification: string): string {
  switch (classification) {
    case "likely":
      return "Likely";
    case "flagged":
      return "Possible";
    case "ruled_out":
      return "Unlikely";
    case "uncertain":
      return "Uncertain";
    default:
      return classification;
  }
}
