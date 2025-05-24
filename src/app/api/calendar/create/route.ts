import { google } from "googleapis";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  //Check if the user is logged in
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  // Get the user’s Google access token
  const accessToken = session.accessToken;
  // Make sure the access token is available
  if (!accessToken) {
    return NextResponse.json({ error: "Missing Google access token." }, { status: 401 });
  }
  // Read the event details the user typed
  const parsedData: {
    summary: string;
    start: string;
    end: string;
    reminders?: { method: string; minutes: number }[];
  } = await req.json();

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
        timeZone: "America/Los_Angeles",
      },
      end: {
        dateTime: parsedData.end,
        timeZone: "America/Los_Angeles",
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
  } catch (error) {
    console.error("Error inserting event:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}