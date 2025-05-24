import type { ReactElement } from "react";

export default function AboutPage(): ReactElement {

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-4">About Calendo</h1>
      <p className="text-lg text-gray-700">
        Calendo is a smart scheduling tool that turns natural language into calendar events using AI.
      </p>
      <br />
      <p className="text-lg text-gray-700">
        Whether you&apos;re planning a meeting or a dinner, just type it out &mdash; Calendo takes care of the rest.
      </p>
    </div>
  );
}
