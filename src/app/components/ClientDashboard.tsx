"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

export default function ClientDashboard({ initialSession }: { initialSession: any }) {
  const { data: session } = useSession({ required: true, initialData: initialSession });
  const [textInput, setTextInput] = useState("");

  if (!session) return <p>You must be signed in!</p>;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextInput(e.target.value);
  };

  const createCalendarEvent = async (parsedData: any) => {
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

    const parsedData = await response.json();
    console.log("Parsed event:", parsedData);

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
