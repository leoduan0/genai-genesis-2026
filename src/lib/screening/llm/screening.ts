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
export const SCREENING_SYSTEM_PROMPT = `You are a compassionate mental health screening assistant conducting an adaptive psychiatric screening. Your role is to ask questions conversationally, interpret the patient's natural language responses, and guide the screening process.

## Your tools
- score_item: Score an item based on the patient's response. Use the item's response scale.
- select_item: Pick which item to ask next from the ranked list. Prefer the top 3 most of the time.
- ask_clarification: Ask a follow-up if the response is ambiguous. Use sparingly.
- frame_question: Rephrase a clinical item into warm, conversational language.
- interpret_response: Map the patient's natural language to a numeric score with a confidence level.
- flag_implied_scores: If the patient's response clearly implies scores on other items, flag them.

## Tone
- Warm, empathetic, non-judgmental
- Never clinical or diagnostic ("tell me more about..." not "rate your...")
- Acknowledge what the patient shares before transitioning topics
- Keep transitions natural — don't abruptly jump between unrelated topics

## Item selection
- Usually pick from the top 3 ranked items (highest information gain)
- You may pick a lower-ranked item if it provides a smoother conversational transition
- Never ask an item that's already been administered or auto-scored

## Scoring
- Map natural language to the item's response scale (e.g., 0-3 for PHQ-9 style)
- If uncertain, ask one clarification before scoring
- If the patient's response implies answers to other items, flag them as implied scores

## Phases
- INTAKE: Analyze free-text for implied scores, then transition to questions
- BROAD_SCREENING: Explore broadly across spectra to build the dimensional profile
- TARGETED: Focus on flagged conditions, asking condition-specific items
`;

// ─── Tool Definitions ───────────────────────────────────────────────────────

export const SCREENING_TOOLS: ToolDefinition[] = [
  {
    name: "score_item",
    description: "Score an item from patient speech",
    parameters: {
      type: "object",
      properties: {
        itemId: { type: "string" },
        score: { type: "number" },
        reasoning: { type: "string" },
      },
      required: ["itemId", "score", "reasoning"],
    },
  },
  {
    name: "select_item",
    description: "Pick an item from the ranked list to ask next",
    parameters: {
      type: "object",
      properties: {
        itemId: { type: "string" },
        reasoning: { type: "string" },
      },
      required: ["itemId", "reasoning"],
    },
  },
  {
    name: "ask_clarification",
    description: "Ask a follow-up question for clarification",
    parameters: {
      type: "object",
      properties: {
        question: { type: "string" },
      },
      required: ["question"],
    },
  },
  {
    name: "frame_question",
    description: "Generate a conversational version of the selected item",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string" },
      },
      required: ["text"],
    },
  },
  {
    name: "interpret_response",
    description: "Map patient's natural language to a numeric score",
    parameters: {
      type: "object",
      properties: {
        itemId: { type: "string" },
        score: { type: "number" },
        confidence: { type: "number" },
      },
      required: ["itemId", "score", "confidence"],
    },
  },
  {
    name: "flag_implied_scores",
    description: "Auto-score items implied by the patient's response",
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
 * Placeholder screening LLM.
 *
 * Behavior:
 * - Selects the top-ranked item
 * - Returns the item text verbatim (no conversational framing)
 * - Interprets patient responses as direct numeric scores (parses first number found)
 * - No implied scoring
 * - No clarifications
 */
export async function placeholderScreeningLLM(
  options: ScreeningLLMOptions,
): Promise<LLMResponse> {
  const { context, messages } = options;
  const { rankedItems, screeningState } = context;

  // If there's a patient message, try to interpret it as a score for the most recent item
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const toolCalls: ToolCall[] = [];

  if (lastUserMessage) {
    // Find the last administered item to score
    // (In placeholder mode, we assume the user is responding to whatever was last asked)
    // The route handler tracks which item is pending; we parse the score here.
    const scoreMatch = lastUserMessage.content.match(/\d+/);
    if (scoreMatch) {
      const parsedScore = parseInt(scoreMatch[0], 10);
      // We don't know which item this is for without more context from the route,
      // so we emit an interpret_response for the pending item.
      // The route passes the pending item ID via the last assistant message or state.
      // For placeholder, we'll score whatever the route tells us is pending.
      if (rankedItems && rankedItems.length > 0) {
        // Score will be validated by the route against the item's response range
        toolCalls.push({
          tool: "interpret_response",
          itemId: rankedItems[0].itemId, // placeholder: attribute to top item
          score: parsedScore,
          confidence: 1.0,
        });
      }
    }
  }

  // Select the next item and frame it verbatim
  if (rankedItems && rankedItems.length > 0) {
    const nextItem = rankedItems[0];

    toolCalls.push({
      tool: "select_item",
      itemId: nextItem.itemId,
      reasoning: "Highest expected variance reduction (placeholder)",
    });

    // Build response label hint
    const labels = nextItem.item.responseLabels;
    const labelHint = Object.entries(labels)
      .map(([k, v]) => `${k} = ${v}`)
      .join(", ");

    const framedText = `${nextItem.item.text}\n(${labelHint})`;

    toolCalls.push({
      tool: "frame_question",
      text: framedText,
    });

    return {
      message: framedText,
      toolCalls,
    };
  }

  // No items to ask — screening should terminate
  return {
    message: "Thank you for answering all the questions. Let me prepare your results.",
    toolCalls,
  };
}
