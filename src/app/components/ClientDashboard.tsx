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

  const createCalendarEvent = async (parsedData: ParsedEvent): Promise<void> => {
    const res = await fetch("/api/calendar/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsedData),
    });

    const result = await res.json();
    if (res.ok) {
      console.log("Event created! Link:", result.eventLink);
      alert(`Event created! View it here: ${result.eventLink}`);
    } else {
      console.error("Error creating event:", result.error);
      alert("Failed to create event.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting event:", textInput);
    console.log("Session data:", session);
    if (!textInput) return;

    const response = await fetch("/api/parseEvent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: textInput }),
    });

    if (!response.ok) {
      console.error("API error:", response.statusText);
      return;
    }

    const parsedData = (await response.json()) as ParsedEvent;

    // Now send to Google Calendar
    await createCalendarEvent(parsedData);

    setTextInput("");
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-8 pt-64 pb-20 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <h1 className="text-4xl font-bold">Welcome, {session.user?.name}!</h1>
      <p>Type something below to create a calendar event:</p>
      <div className="mt-12 w-full max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
          <input
            type="text"
            value={textInput}
            onChange={handleInputChange}
            placeholder="Describe your event"
            className="border rounded px-4 py-2 w-full"
          />
          <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded w-full">
            Create Event
          </button>
        </form>
      </div>
    </div>
  );
}
