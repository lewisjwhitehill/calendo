import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock llmParser so we never hit OpenAI in tests
vi.mock("../llmParser", () => ({
  llmParse: vi.fn(),
}));

import { parseEventText } from "../index";
import { llmParse } from "../llmParser";

describe("parseEventText orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns parser: "regex" when regex succeeds', async () => {
    const result = await parseEventText({
      text: "Meeting tomorrow at 3pm",
      timeZone: "America/New_York",
    });
    expect(result.parser).toBe("regex");
    expect(result.event.summary).toBe("Meeting");
    // LLM should NOT be called
    expect(llmParse).not.toHaveBeenCalled();
  });

  it('falls back to LLM and returns parser: "llm" when regex fails', async () => {
    const mockEvent = {
      summary: "Quarterly review",
      start: "2026-04-15T14:00:00-04:00",
      end: "2026-04-15T15:00:00-04:00",
      reminders: [{ method: "popup", minutes: 10 }],
    };

    (llmParse as any).mockResolvedValue(mockEvent);

    const result = await parseEventText({
      text: "Plan the quarterly review in a couple of weeks",
      timeZone: "America/New_York",
    });

    expect(result.parser).toBe("llm");
    expect(result.event).toEqual(mockEvent);
    expect(llmParse).toHaveBeenCalledWith(
      "Plan the quarterly review in a couple of weeks",
      "America/New_York"
    );
  });

  it("propagates LLM errors", async () => {
    (llmParse as any).mockRejectedValue(new Error("OpenAI down"));

    await expect(
      parseEventText({
        text: "Something vague later",
        timeZone: "UTC",
      })
    ).rejects.toThrow("OpenAI down");
  });
});
