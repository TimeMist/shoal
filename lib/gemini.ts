import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import type { Content, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { ConfigError } from "./http.ts";

export const GEMINI_MODEL = "gemini-3.5-flash";

// Counterpart of `ask` in claude.ts: one turn, the model must answer with one of the tools.
export function askGemini(params: {
  system: string;
  contents: Content[];
  tools: FunctionDeclaration[];
}): Promise<GenerateContentResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ConfigError("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey }).models.generateContent({
    model: GEMINI_MODEL,
    contents: params.contents,
    config: {
      systemInstruction: params.system,
      tools: [{ functionDeclarations: params.tools }],
      toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY } },
    },
  });
}
