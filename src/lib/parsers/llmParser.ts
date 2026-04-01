import { OpenAI } from "openai";
import type { ParsedEvent } from "./types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Uses OpenAI to parse a natural-language event string into structured data.
 * Same prompt/model behaviour as the original inline implementation.
 */
export async function llmParse(
  text: string,
  timeZone: string
): Promise<ParsedEvent> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone });

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `
You are an AI that extracts structured calendar event data from natural language.
Today's date is ${today}.
If the input says "tomorrow", "next Friday", etc., resolve it into an exact date based on today.

Return ONLY a JSON object with these keys:
- "summary" (string): a short title for the event
- "start" (ISO 8601 string, including date, time, and **timezone offset** for the user's time zone): when the event starts
- "end" (ISO 8601 string, same format as start): when the event ends
- "reminders" (array): list of { "method": "popup", "minutes": number }

If the user doesn't specify an end time, default the event to 1 hour after the start time.

IMPORTANT:
- Use the user's time zone: ${timeZone}
- Include the correct timezone offset for that time zone in the start and end times.
- Only return a JSON object, no explanation or extra text.
- Do not create recurring events, even if the user asks.

Only return valid, parsable JSON.
        `.trim(),
      },
      {
        role: "user",
        content: `Extract details from this event: "${text}"`,
      },
    ],
  });

  const raw = response.choices[0].message.content;
  if (!raw) {
    throw new Error("No content returned from OpenAI");
  }

  return JSON.parse(raw) as ParsedEvent;
}
