import type {
  ReportLLMOptions,
  ReportResponse,
} from "./types";
import type { ConditionResult } from "../types";

// ─── System Prompt (editable) ───────────────────────────────────────────────

/**
 * Editable system prompt for the report LLM.
 * Change this string to alter report generation behavior without redeployment.
 */
export const REPORT_SYSTEM_PROMPT = `You are generating a screening report for a patient who has just completed an adaptive psychiatric screening. Your report must be empathetic, clear, and non-diagnostic.

## Language rules (STRICT)
- NEVER say "you have X" or "you don't have X"
- ALWAYS use "your responses suggest patterns consistent with..." or "it may be worth discussing..."
- Frame everything as screening results, not diagnoses
- Use accessible language — avoid jargon where possible

## Required sections
1. Disclaimer: This is a screening tool, not a clinical diagnosis.
2. Dimensional profile: Summary of what areas were explored.
3. Flagged conditions: For each flagged condition, include:
   - The condition name and likelihood level
   - 2-3 talking points the patient can bring to their provider
   - These talking points should reference specific things the patient shared
4. Unflagged summary: Brief note on conditions that were screened but not flagged.
5. Not assessed: Which areas were not explored and why.
6. Uncertainty disclosure: What the screening can and cannot tell us.

## Tone
- Compassionate and validating
- Emphasize that seeking screening is a positive step
- Normalize the experience
- Always point toward next steps (talk to a provider)
`;

// ─── Placeholder Implementation ─────────────────────────────────────────────

/**
 * Placeholder report LLM.
 *
 * Generates a template-filled report directly from the structured
 * diagnostic profile data. No LLM call — just string formatting.
 */
export async function placeholderReportLLM(
  options: ReportLLMOptions,
): Promise<ReportResponse> {
  const { diagnosticProfile, referenceData } = options;

  const disclaimer =
    "This is a screening tool, not a clinical diagnosis. These results should be discussed with a qualified mental health provider who can conduct a comprehensive evaluation.";

  const dimensionalProfile = {
    title: "What we explored",
    content: `This screening assessed ${diagnosticProfile.totalItemsAdministered} items across multiple areas of mental health. ${diagnosticProfile.totalAutoScored > 0 ? `${diagnosticProfile.totalAutoScored} additional items were inferred from your responses.` : ""}`,
  };

  const flaggedConditions = diagnosticProfile.flagged.map((condition) => ({
    condition,
    talkingPoints: generatePlaceholderTalkingPoints(condition),
  }));

  const unflaggedNames = diagnosticProfile.unflagged
    .map((c) => c.name)
    .join(", ");

  const unflaggedSummary = {
    title: "Areas not flagged",
    content: diagnosticProfile.unflagged.length > 0
      ? `The following areas were screened and did not reach the threshold for concern: ${unflaggedNames}. This does not rule them out entirely — if you have concerns about any of these areas, please mention them to your provider.`
      : "All screened areas showed some level of concern and are listed above.",
  };

  const notAssessedNames = diagnosticProfile.notAssessed
    .map((s) => {
      const spectrum = referenceData.spectra.find((sp) => sp.id === s.spectrumId);
      return spectrum?.name ?? s.name;
    })
    .join(", ");

  const notAssessed = {
    title: "Areas not explored",
    content: diagnosticProfile.notAssessed.length > 0
      ? `The following areas were not explored in depth because your initial responses did not suggest concern: ${notAssessedNames}. If you have concerns about any of these areas, please mention them to your provider.`
      : "All major areas were explored during this screening.",
  };

  const uncertaintyDisclosure =
    "Screening tools provide a snapshot based on your responses at this moment. They are not definitive. Many factors — including how you're feeling today, your comfort level, and the specific questions asked — can influence results. A provider can help you understand what these results mean in the full context of your life.";

  return {
    disclaimer,
    dimensionalProfile,
    flaggedConditions,
    unflaggedSummary,
    notAssessed,
    uncertaintyDisclosure,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generatePlaceholderTalkingPoints(condition: ConditionResult): string[] {
  const points: string[] = [];
  const label = classificationLabel(condition.classification);

  points.push(
    `Your responses suggest patterns ${label} ${condition.name} (likelihood: ${(condition.probability * 100).toFixed(0)}%).`,
  );

  if (condition.uncertainty > 0.3) {
    points.push(
      "There is meaningful uncertainty in this estimate — additional evaluation would help clarify.",
    );
  }

  points.push(
    "Consider discussing this area with your provider, who can conduct a more thorough assessment.",
  );

  return points;
}

function classificationLabel(classification: ConditionResult["classification"]): string {
  switch (classification) {
    case "likely":
      return "consistent with";
    case "flagged":
      return "that may be associated with";
    case "ruled_out":
      return "not consistent with";
    case "uncertain":
      return "with unclear association to";
  }
}
