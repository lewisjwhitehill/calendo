"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

type ParsedEvent = {
  summary: string;
  start: string;
  end: string;
  reminders?: { method: string; minutes: number }[];
};

export default function ClientDashboard() {
  const { data: session, status } = useSession({ required: true });
  const [textInput, setTextInput] = useState("");
  // Holds the link to the newly‑created Google Calendar event (if any)
  const [eventLink, setEventLink] = useState<string | null>(null);
  const [parsedEvent, setParsedEvent] = useState<ParsedEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userTimeZone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  });

  // Show a friendly loader while NextAuth fetches the session
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          {/* Tailwind spinner */}
          <svg
            className="h-10 w-10 animate-spin text-orange-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
          <span className="text-lg font-medium">Loading…</span>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextInput(e.target.value);
  };

  const createCalendarEvent = async (
    parsedData: ParsedEvent,
    timeZone: string
  ): Promise<string | null> => {
    const res = await fetch("/api/calendar/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...parsedData, timeZone }),
    });

    const result = await res.json();
    if (res.ok) {
      return result.eventLink ?? null;
    } else {
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput || isSubmitting) return;

    // hide any previous link while we create a new event
    setEventLink(null);
    setParsedEvent(null);
    setErrorMessage(null);
    setIsSubmitting(true);
    const response = await fetch("/api/parseEvent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: textInput, timeZone: userTimeZone }),
    });

    if (!response.ok) {
      setErrorMessage("We couldn't parse that. Try rephrasing the event.");
      setIsSubmitting(false);
      return;
    }

    const parsedData = (await response.json()) as ParsedEvent;
    setParsedEvent(parsedData);

    // Now send to Google Calendar
    const link = await createCalendarEvent(parsedData, userTimeZone);
    if (!link) {
      setErrorMessage("Failed to create the event. Please try again.");
      setIsSubmitting(false);
      return;
    }

    setEventLink(link);
    setTextInput("");
    setIsSubmitting(false);
  };

  const handleReset = () => {
    setParsedEvent(null);
    setEventLink(null);
    setErrorMessage(null);
    setTextInput("");
    setIsSubmitting(false);
  };

  const formatRange = (startIso: string, endIso: string) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: userTimeZone,
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const start = formatter.format(new Date(startIso));
    const end = formatter.format(new Date(endIso));
    return `${start} - ${end}`;
  };

  if (eventLink && parsedEvent) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <div className="w-full max-w-lg rounded-2xl border border-orange-200 bg-white/90 p-8 shadow-lg backdrop-blur">
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Event Ready</h2>
            <p className="text-sm text-gray-600">
              Here is what will be added to your calendar.
            </p>
          </div>
          <div className="mt-6 space-y-4 text-sm text-gray-800">
            <div className="flex items-start justify-between gap-6">
              <span className="font-semibold text-gray-700">Summary</span>
              <span className="text-right">{parsedEvent.summary}</span>
            </div>
            <div className="flex items-start justify-between gap-6">
              <span className="font-semibold text-gray-700">Time</span>
              <span className="text-right">{formatRange(parsedEvent.start, parsedEvent.end)}</span>
            </div>
            <div className="flex items-start justify-between gap-6">
              <span className="font-semibold text-gray-700">Reminders</span>
              <span className="text-right">
                {parsedEvent.reminders && parsedEvent.reminders.length > 0
                  ? parsedEvent.reminders
                      .map((reminder) => `${reminder.minutes} min (${reminder.method})`)
                      .join(", ")
                  : "None"}
              </span>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3">
            <a
              href={eventLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-600 text-white rounded w-full text-center"
            >
              View Event in Google Calendar
            </a>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 bg-orange-500 text-white rounded w-full hover:bg-orange-600 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-8 pt-64 pb-20 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <h1 className="text-4xl font-bold">Welcome, {session.user?.name}!</h1>
      <p>Type something below to create a calendar event:</p>
      <div className="mt-12 w-full max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-3 border rounded px-4 py-2 w-full bg-white">
              <svg
                className="h-5 w-5 animate-spin text-orange-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
              <span className="text-sm font-medium text-gray-700">Generating event</span>
            </div>
          ) : (
            <input
              type="text"
              value={textInput}
              onChange={handleInputChange}
              placeholder="Describe your event"
              className="border rounded px-4 py-2 w-full"
            />
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            aria-pressed={isSubmitting}
            aria-busy={isSubmitting}
            className={[
              "px-4 py-2 bg-orange-500 text-white rounded w-full transition",
              "active:translate-y-[1px] active:scale-[0.99]",
              isSubmitting ? "bg-orange-600 shadow-inner" : "hover:bg-orange-600",
            ].join(" ")}
          >
            {isSubmitting ? "Working..." : "Create Event"}
          </button>
        </form>
        {errorMessage && <p className="mt-3 text-sm text-red-600">{errorMessage}</p>}
      </div>
    </div>
  );
}
