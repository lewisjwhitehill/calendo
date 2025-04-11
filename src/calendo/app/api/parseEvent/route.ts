import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

// Set up OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Use an environment variable
});

// Define the handler function for POST request
export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();  // Extract text from request body
    
    // Log to ensure the function is being triggered
    console.log("HELLO HELLO HELLO");

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",  // 
      messages: [
        { role: "system", content: "You are an AI that extracts structured event details from natural language. Return only a JSON object with the keys \"summary\", \"start\", \"end\", and \"reminders\". Do not include any extra text." },
        { role: "user", content: `Extract details from this event: "${text}"` },
      ]

    });
    const rawOutput = response.choices[0].message.content;
    console.log("Raw output:", rawOutput);

    const eventData = JSON.parse(response.choices[0].message.content); // Parsed event details
    return NextResponse.json(eventData);  // Send the parsed event data as JSON

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to parse event" }, { status: 500 });
  }
}
