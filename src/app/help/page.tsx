export default function HelpPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-4">Help & Guidelines</h1>
      <p className="text-lg text-gray-700 mb-4">
        Calendo is a tool that lets you quickly create calendar events from plain English. Just type something like "Dinner with Sarah next Thursday at 7pm" and Calendo will add it to your Google Calendar.
      </p>
      <p className="text-lg text-gray-700 mb-4">
        <strong>Limitations:</strong> Calendo works best with clear, simple sentences. Ambiguous or overly complex phrases might not be parsed correctly. For now, only Google Calendar is supported. Repeated events are not currently supported.
      </p>
      <p className="text-lg text-gray-700">
        <strong>Tips:</strong> Be specific with times and dates. If something doesn’t look right, feel free to delete or edit the event directly in Google Calendar. Always double-check event details after creation.
      </p>
    </div>
  );
}
