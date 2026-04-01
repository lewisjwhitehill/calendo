import { regexParse } from "./regexParser";
import { llmParse } from "./llmParser";
import type { ParserResult } from "./types";

export type { ParserResult, ParsedEvent } from "./types";

/**
 * Tries to parse `text` with regex first.
 * Falls back to the OpenAI LLM parser when regex cannot extract a result.
 */
export async function parseEventText(opts: {
  text: string;
  timeZone: string;
}): Promise<ParserResult> {
  const { text, timeZone } = opts;

  const regexResult = regexParse(text, timeZone);
  if (regexResult.success) {
    return { event: regexResult.event, parser: "regex" };
  }

  const event = await llmParse(text, timeZone);
  return { event, parser: "llm" };
}
