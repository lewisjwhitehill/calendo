import { google } from "googleapis";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { consumeUsageIfAvailable } from "@/lib/usage/consumeUsageIfAvailable";
import { rollbackConsumedUsage } from "@/lib/usage/rollbackConsumedUsage";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  //Check if the user is logged in
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!session.userId) {
    return NextResponse.json(
      { error: "Session is missing user id. Please sign out and sign in again." },
      { status: 401 }
    );
  }
  // Get the user’s Google access token
  const accessToken = session.accessToken;
  // Make sure the access token is available
  if (!accessToken) {
    return NextResponse.json({ error: "Missing Google access token." }, { status: 401 });
  }

  // Parse body before reserving usage so invalid JSON does not consume a slot.
  let parsedData: {
    summary: string;
    start: string;
    end: string;
    reminders?: { method: string; minutes: number }[];
    timeZone?: string;
  };
  try {
    parsedData = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const usage = await consumeUsageIfAvailable(session.userId);
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: "Daily event limit reached.",
        used: usage.used,
        limit: usage.limit,
        remaining: usage.remaining,
        plan: usage.plan,
      },
      { status: 429 }
    );
  }

  // Create the google API client and give the user's access token
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  // Create the calendar API client
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  try {
    // Create the event object that we'll send to Google Calendar
    const event = {
      summary: parsedData.summary,
      start: {
        dateTime: parsedData.start,
        timeZone: parsedData.timeZone ?? "UTC",
      },
      end: {
        dateTime: parsedData.end,
        timeZone: parsedData.timeZone ?? "UTC",
      },
      reminders: {
        useDefault: false,
        overrides: parsedData.reminders?.map((reminder) => ({
          method: reminder.method,
          minutes: reminder.minutes,
        })),
      },
    };

    const result = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    return NextResponse.json({ success: true, eventLink: result.data.htmlLink });
  } catch (err) {
    console.error("Error inserting event", err);
    try {
      await rollbackConsumedUsage(session.userId);
    } catch (rollbackErr) {
      console.error(
        "Failed to rollback usage after calendar error — user may need manual adjustment",
        rollbackErr
      );
    }

    const googleStatus = (err as { code?: number })?.code;

    if (googleStatus === 401) {
      return NextResponse.json(
        { error: "Google Calendar access has expired or been revoked. Please sign out and sign back in to reconnect your account." },
        { status: 401 }
      );
    }

    if (googleStatus === 403) {
      return NextResponse.json(
        { error: "Calendo doesn't have permission to access your Google Calendar. Please sign out, sign back in, and make sure you grant calendar access." },
        { status: 403 }
      );
    }

    if (googleStatus === 404) {
      return NextResponse.json(
        { error: "Google Calendar could not be found for your account. Make sure Google Calendar is enabled on your Google account." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Something went wrong creating your event. Please try again." },
      { status: 500 }
    );
  }
}
