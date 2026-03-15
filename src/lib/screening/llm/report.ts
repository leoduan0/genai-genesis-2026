import type {
  ReportLLMOptions,
  ReportResponse,
} from "./types";
import type { ConditionResult, ReferenceData } from "../types";

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
    talkingPoints: generatePlaceholderTalkingPoints(condition, referenceData),
  }));

  // Build spectrum summaries from the diagnostic profile's spectrumResults
  const spectrumSummaries = diagnosticProfile.spectrumResults.map((sr) => ({
    spectrumId: sr.spectrumId,
    name: sr.name,
    shortCode: sr.shortCode,
    magnitude: sr.magnitude,
    posteriorMean: sr.posteriorMean,
    wasAssessed: sr.wasAssessed,
    conditions: sr.conditions.map((c) => ({
      conditionId: c.conditionId,
      name: c.name,
      shortCode: c.shortCode,
      classification: c.classification,
      probability: c.probability,
      wasAssessed: c.wasAssessed,
    })),
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
    spectrumSummaries,
    unflaggedSummary,
    notAssessed,
    uncertaintyDisclosure,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Map condition short codes to specific, actionable talking points. */
const CONDITION_TALKING_POINTS: Record<string, string[]> = {
  MDD: [
    "Mention changes in your mood, energy, or motivation over the past few weeks",
    "Describe any shifts in sleep patterns or appetite you've noticed",
    "Share how these feelings have affected your daily activities or relationships",
  ],
  GAD: [
    "Describe the topics or situations that tend to trigger your worry",
    "Mention if you've noticed physical tension, restlessness, or difficulty relaxing",
    "Share how often worry feels difficult to control or out of proportion",
  ],
  PD: [
    "Describe any sudden episodes of intense fear or physical discomfort",
    "Mention specific physical symptoms like racing heart, shortness of breath, or dizziness",
    "Share whether you've started avoiding certain places or situations",
  ],
  SAD: [
    "Describe situations where you feel most anxious or self-conscious",
    "Mention if fear of judgment or embarrassment affects your daily choices",
    "Share how social anxiety has impacted your work, school, or relationships",
  ],
  PTSD: [
    "You don't need to share details of what happened — just mention that you've experienced something distressing",
    "Describe any intrusive memories, nightmares, or flashbacks you've been having",
    "Mention if you've been avoiding certain reminders, places, or conversations",
  ],
  OCD: [
    "Describe any recurring unwanted thoughts that cause distress",
    "Mention any behaviors or rituals you feel compelled to repeat",
    "Share how much time these thoughts or behaviors take up in your day",
  ],
  BPD: [
    "Describe any patterns of intense or rapidly shifting emotions",
    "Mention how your relationships tend to feel — whether they swing between closeness and conflict",
    "Share if you've noticed impulsive behaviors during emotional distress",
  ],
  ADHD: [
    "Describe situations where focus or organization is most challenging",
    "Mention if restlessness, impulsivity, or procrastination affects your daily life",
    "Share whether these patterns have been present since childhood",
  ],
  BIP: [
    "Describe any periods of unusually elevated energy, reduced need for sleep, or racing thoughts",
    "Mention if you've experienced episodes that felt very different from your usual mood",
    "Share how these shifts have affected your decision-making or relationships",
  ],
  AUD: [
    "Be honest about your typical drinking patterns and any recent changes",
    "Mention if you've noticed needing more to feel the same effect",
    "Share any concerns you have about how alcohol affects your life or health",
  ],
  SUD: [
    "Be honest about substance use patterns without minimizing or exaggerating",
    "Mention any changes in how much you use or how it affects you",
    "Share any concerns about dependency or impact on daily functioning",
  ],
};

function generatePlaceholderTalkingPoints(condition: ConditionResult, referenceData: ReferenceData): string[] {
  // Use condition-specific talking points if available
  const specific = CONDITION_TALKING_POINTS[condition.shortCode];
  if (specific) return specific;

  // Fallback for conditions without specific talking points
  const points: string[] = [];
  const label = classificationLabel(condition.classification);

  points.push(
    `Your responses suggest patterns ${label} ${condition.name} — mention this area to your provider.`,
  );
  points.push(
    "Describe any specific symptoms, behaviors, or changes you've noticed related to this area.",
  );

  if (condition.uncertainty > 0.3) {
    points.push(
      "There is some uncertainty in this estimate — a provider can help clarify with a more thorough assessment.",
    );
  }

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
