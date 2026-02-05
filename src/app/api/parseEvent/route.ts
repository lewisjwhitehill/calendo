import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

// Set up OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Use an environment variable
});

export async function POST(req: NextRequest) {
  try {
    const { text, timeZone } = await req.json();  // Extract text from request body

    const resolvedTimeZone =
      typeof timeZone === "string" && timeZone.length > 0 ? timeZone : "UTC";

    // Get YYYY-MM-DD in the user's time zone
    const today = new Date().toLocaleDateString("en-CA", { timeZone: resolvedTimeZone });

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
- Use the user's time zone: ${resolvedTimeZone}
- Include the correct timezone offset for that time zone in the start and end times.
- Only return a JSON object, no explanation or extra text.
- Do not create recurring events, even if the user asks.

Only return valid, parsable JSON.
          `.trim()
        },
        {
          role: "user",
          content: `Extract details from this event: "${text}"`
        }
      ]
    });

    const rawOutput = response.choices[0].message.content;

    if (rawOutput) {
      const eventData = JSON.parse(rawOutput);
      return NextResponse.json(eventData);
    } else {
      return NextResponse.json(
        { error: "No content returned from OpenAI" },
        { status: 500 }
      );
    }
  } catch {
    console.error("Failed to parse event");
    return NextResponse.json({ error: "Failed to parse event" }, { status: 500 });
  }
}
