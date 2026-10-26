import Anthropic from "@anthropic-ai/sdk";
import { ConfigError } from "./http.ts";

export function claude(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new ConfigError("ANTHROPIC_API_KEY is not set");
  return new Anthropic({ apiKey });
}

export function ask(params: {
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  tools: Anthropic.Beta.BetaTool[];
}, options?: { timeout?: number }): Promise<Anthropic.Beta.BetaMessage> {
  return claude().beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium" },
    tool_choice: { type: "auto" },
    ...params,
  }, options);
}
