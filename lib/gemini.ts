import { ApiError, GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import type { Content, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { ConfigError } from "./http.ts";

export const GEMINI_MODEL = "gemini-3.5-flash";

/** Gemini sheds load with 503 (or 429/500) during demand spikes; these are worth a retry. */
export const geminiBusy = (e: unknown) => e instanceof ApiError && [429, 500, 503].includes(e.status);

export async function withRetry<T>(fn: () => Promise<T>, retryable: (e: unknown) => boolean, waits: number[], sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (!retryable(e) || i >= waits.length) throw e;
      await sleep(waits[i]);
    }
  }
}

// Counterpart of `ask` in claude.ts: one turn, the model must answer with one of the tools.
export function askGemini(params: {
  system: string;
  contents: Content[];
  tools: FunctionDeclaration[];
}): Promise<GenerateContentResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ConfigError("GEMINI_API_KEY is not set");
  const ai = new GoogleGenAI({ apiKey });
  return withRetry(() => ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: params.contents,
    config: {
      systemInstruction: params.system,
      tools: [{ functionDeclarations: params.tools }],
      toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY } },
    },
  }), geminiBusy, [1000, 3000]);
}
