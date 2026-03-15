import type { ScreeningState, RankedItem, ReferenceData, DiagnosticProfile, ConditionResult, SpectrumResult } from "../types";

// ─── Messages ───────────────────────────────────────────────────────────────

export type MessageRole = "system" | "user" | "assistant";

export interface Message {
  role: MessageRole;
  content: string;
}

// ─── Tool Definitions ───────────────────────────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

// ─── Tool Call Results ──────────────────────────────────────────────────────

export interface ScoreItemCall {
  tool: "score_item";
  itemId: string;
  score: number;
  reasoning: string;
}

export interface SelectItemCall {
  tool: "select_item";
  itemId: string;
  reasoning: string;
}

export interface AskClarificationCall {
  tool: "ask_clarification";
  question: string;
}

export interface FrameQuestionCall {
  tool: "frame_question";
  text: string;
}

export interface InterpretResponseCall {
  tool: "interpret_response";
  itemId: string;
  score: number;
  confidence: number;
}

export interface FlagImpliedScoresCall {
  tool: "flag_implied_scores";
  scores: { itemId: string; score: number; reasoning: string }[];
}

export type ToolCall =
  | ScoreItemCall
  | SelectItemCall
  | AskClarificationCall
  | FrameQuestionCall
  | InterpretResponseCall
  | FlagImpliedScoresCall;

// ─── LLM Response ───────────────────────────────────────────────────────────

export interface LLMResponse {
  /** Natural language message to show the patient (the framed question or acknowledgment). */
  message: string;
  /** All tool calls the LLM made this turn. */
  toolCalls: ToolCall[];
}

// ─── Screening LLM Options ─────────────────────────────────────────────────

export interface ScreeningLLMOptions {
  systemPrompt: string;
  messages: Message[];
  tools: ToolDefinition[];
  maxToolCalls: number;
  context: {
    screeningState: ScreeningState;
    rankedItems?: RankedItem[];
    conversationHistory: Message[];
    referenceData: ReferenceData;
  };
}

// ─── Report LLM ─────────────────────────────────────────────────────────────

export interface ReportSection {
  title: string;
  content: string;
}

export interface SpectrumSummary {
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

export interface ReportResponse {
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
}

export interface ReportLLMOptions {
  systemPrompt: string;
  diagnosticProfile: DiagnosticProfile;
  conversationHistory: Message[];
  referenceData: ReferenceData;
}
