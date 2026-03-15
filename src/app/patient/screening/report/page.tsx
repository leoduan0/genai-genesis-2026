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

interface ConditionResult {
  conditionId: string;
  name: string;
  shortCode: string;
  probability: number;
  uncertainty: number;
  classification: "likely" | "flagged" | "ruled_out" | "uncertain";
}

interface ReportSection {
  title: string;
  content: string;
}

interface ReportData {
  diagnosticProfile: {
    flagged: ConditionResult[];
    unflagged: ConditionResult[];
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
    <main className="min-h-screen bg-(image:--page-bg)">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
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

        {/* Dimensional profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {report.dimensionalProfile.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {report.dimensionalProfile.content}
            </p>
          </CardContent>
        </Card>

        {/* Flagged conditions */}
        {report.flaggedConditions.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">Areas to discuss</h2>
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
                        className="text-sm text-muted-foreground"
                      >
                        {point}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
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

        {/* Not assessed */}
        {diagnosticProfile.notAssessed.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {report.notAssessed.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {report.notAssessed.content}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Uncertainty disclosure */}
        <Card className="border-muted">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {report.uncertaintyDisclosure}
            </p>
          </CardContent>
        </Card>

        <Button
          size="lg"
          className="w-full rounded-xl text-base"
          onClick={() => router.push("/patient")}
        >
          Return to dashboard
        </Button>
      </div>
    </main>
  );
}

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
        <Badge variant="destructive">
          {pct} likelihood
        </Badge>
      );
    case "flagged":
      return (
        <Badge className="border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {pct} likelihood
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
