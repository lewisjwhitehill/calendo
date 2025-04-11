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
      // Handle the error
      console.error("API error:", response.statusText);
      return;
    }
  
    const parsedData = await response.json();
    console.log("Parsed event:", parsedData); // Check AI response in console
  
    // Later, send this data to Google Calendar API
    setTextInput(""); 
  };

  return (
    <div className="p-4">
      <h1>Welcome, {session.user?.name}!</h1>
      <p>Type something below to create a calendar event:</p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={textInput}
          onChange={handleInputChange}
          placeholder="Describe your event"
          className="border rounded px-2 py-1"
        />
        <button type="submit" className="ml-2 px-4 py-1 bg-blue-500 text-white rounded">
          Create Event
        </button>
      </form>
    </div>
  );
}
