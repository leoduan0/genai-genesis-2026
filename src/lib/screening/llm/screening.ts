import type {
  ScreeningLLMOptions,
  LLMResponse,
  ToolCall,
  ToolDefinition,
} from "./types";

// ─── System Prompt (editable) ───────────────────────────────────────────────

/**
 * Editable system prompt for the general screening LLM.
 * Change this string to alter LLM behavior without redeployment.
 */
export const SCREENING_SYSTEM_PROMPT = `You are a compassionate mental health screening assistant conducting an adaptive psychiatric screening.

During INTAKE, you analyze the patient's free-text concern and auto-score any clearly implied items using flag_implied_scores.

During BROAD_SCREENING and TARGETED phases, the patient answers on a Likert scale (buttons on screen — no free text). Your ONLY job is to:
1. Pick the next item to ask (select_item)
2. Rephrase it into warm, conversational language (frame_question)

## Your tools
- select_item: Pick which item to ask next. The itemId MUST be from the "Algorithm-ranked items" list. You MUST call this every turn.
- frame_question: Rephrase the selected item conversationally. Always call this after select_item.
- flag_implied_scores: (INTAKE only) Auto-score items implied by the patient's free text.

## Tone for framing
- Warm, empathetic, non-judgmental
- Never clinical or robotic ("Over the past two weeks, how often have you..." → "How has your sleep been lately?")
- Keep it brief — the patient picks from Likert options, they don't type a response
- Smooth transitions — if the previous item was about mood and the next is about sleep, bridge naturally

## Item selection — HOLISTIC JUDGMENT
You are given algorithm-ranked items (sorted by mathematical information gain). Use holistic judgment to pick the BEST item by weighing:
1. **Algorithm ranking** — higher-ranked items reduce uncertainty faster. Prefer top 3 most of the time.
2. **Patient's initial concern** — if they mentioned specific symptoms (e.g., sleep, worry), prioritize related items while topically relevant.
3. **Conversational flow** — pick items that transition naturally from the last question. Avoid jarring topic switches.
4. **Current probabilities** — if a condition is near a decision threshold (40-60%), items that disambiguate it are extra valuable.
5. **Coverage** — in BROAD_SCREENING, explore multiple spectra rather than hammering one area.

You MAY pick a lower-ranked item if it makes more clinical or conversational sense, but you MUST always pick from the provided list.

## Phases
- INTAKE: Analyze free-text for implied scores using flag_implied_scores
- BROAD_SCREENING: Explore broadly across spectra
- TARGETED: Focus on flagged conditions

## Response format (BROAD_SCREENING / TARGETED)
Call select_item and frame_question. Your text response should ONLY be the conversationally framed question — nothing else.
`;

// ─── Tool Definitions ───────────────────────────────────────────────────────

export const SCREENING_TOOLS: ToolDefinition[] = [
  {
    name: "select_item",
    description: "Pick an item from the ranked list to ask next",
    parameters: {
      type: "object",
      properties: {
        itemId: { type: "string", description: "Must be an itemId from the Algorithm-ranked items list" },
        reasoning: { type: "string", description: "Brief explanation of why this item was chosen" },
      },
      required: ["itemId", "reasoning"],
    },
  },
  {
    name: "frame_question",
    description: "Rephrase the selected item into warm, conversational language for the patient",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "The conversationally framed question" },
      },
      required: ["text"],
    },
  },
  {
    name: "flag_implied_scores",
    description: "Auto-score screening items implied by the patient's free text (INTAKE phase only)",
    parameters: {
      type: "object",
      properties: {
        scores: {
          type: "array",
          items: {
            type: "object",
            properties: {
              itemId: { type: "string" },
              score: { type: "number" },
              reasoning: { type: "string" },
            },
            required: ["itemId", "score", "reasoning"],
          },
        },
      },
      required: ["scores"],
    },
  },
];

// ─── Placeholder Implementation ─────────────────────────────────────────────

/**
 * Placeholder screening LLM (fallback).
 *
 * Selects the top-ranked item and returns it verbatim. No conversational framing.
 */
export async function placeholderScreeningLLM(
  options: ScreeningLLMOptions,
): Promise<LLMResponse> {
  const { context } = options;
  const { rankedItems } = context;
  const toolCalls: ToolCall[] = [];

  if (rankedItems && rankedItems.length > 0) {
    const nextItem = rankedItems[0];

    toolCalls.push({
      tool: "select_item",
      itemId: nextItem.itemId,
      reasoning: "Highest expected variance reduction (placeholder)",
    });

    const labels = nextItem.item.responseLabels;
    const labelHint = Object.entries(labels)
      .map(([k, v]) => `${k} = ${v}`)
      .join(", ");
    const framedText = `${nextItem.item.text}\n(${labelHint})`;

    toolCalls.push({
      tool: "frame_question",
      text: framedText,
    });

    return { message: framedText, toolCalls };
  }

  return {
    message: "Thank you for answering all the questions. Let me prepare your results.",
    toolCalls,
  };
}
