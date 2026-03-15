import type {
  ScreeningLLMOptions,
  ReportLLMOptions,
  LLMResponse,
  ReportResponse,
} from "./types";
import { placeholderScreeningLLM } from "./screening";
import { placeholderReportLLM } from "./report";

// ─── Screening LLM ─────────────────────────────────────────────────────────

/**
 * General screening LLM — handles intake analysis, item selection,
 * response interpretation, implied scoring, follow-up questions.
 *
 * Currently uses placeholder logic. To swap in a real LLM:
 * replace the body of this function with the real API call.
 * The interface stays identical.
 */
export async function callScreeningLLM(
  options: ScreeningLLMOptions,
): Promise<LLMResponse> {
  // ── PLACEHOLDER: swap this one line for a real LLM call ──
  return placeholderScreeningLLM(options);
}

// ─── Report LLM ─────────────────────────────────────────────────────────────

/**
 * Report LLM — generates natural language report from diagnostic profile.
 *
 * Currently uses placeholder logic. To swap in a real LLM:
 * replace the body of this function with the real API call.
 * The interface stays identical.
 */
export async function callReportLLM(
  options: ReportLLMOptions,
): Promise<ReportResponse> {
  // ── PLACEHOLDER: swap this one line for a real LLM call ──
  return placeholderReportLLM(options);
}
