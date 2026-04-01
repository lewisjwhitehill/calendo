export type ParsedEvent = {
  summary: string;
  start: string; // ISO 8601 with TZ offset
  end: string; // ISO 8601 with TZ offset
  reminders: { method: string; minutes: number }[];
};

export type ParserResult = {
  event: ParsedEvent;
  parser: "regex" | "llm";
};
