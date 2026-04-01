import { NextRequest, NextResponse } from "next/server";
import { parseEventText } from "@/lib/parsers";

export async function POST(req: NextRequest) {
  try {
    const { text, timeZone } = await req.json();

    if (typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing or empty event text." },
        { status: 400 }
      );
    }

    const resolvedTimeZone =
      typeof timeZone === "string" && timeZone.length > 0 ? timeZone : "UTC";

    const { event, parser } = await parseEventText({
      text: text.trim(),
      timeZone: resolvedTimeZone,
    });

    return NextResponse.json({ ...event, parser });
  } catch {
    console.error("Failed to parse event");
    return NextResponse.json(
      { error: "Failed to parse event" },
      { status: 500 }
    );
  }
}
