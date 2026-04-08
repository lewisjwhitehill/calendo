import { describe, expect, it } from "vitest";
import { getEffectivePlan } from "../limits";

describe("getEffectivePlan", () => {
  it("returns pro for active pro subscriptions", () => {
    const plan = getEffectivePlan({
      plan: "pro",
      status: "active",
      currentPeriodEnd: new Date("2030-01-01T00:00:00.000Z"),
    });
    expect(plan).toBe("pro");
  });

  it("returns pro for canceling subscriptions until currentPeriodEnd", () => {
    const plan = getEffectivePlan(
      {
        plan: "pro",
        status: "canceling",
        currentPeriodEnd: new Date("2030-01-01T00:00:00.000Z"),
      },
      { now: new Date("2029-12-01T00:00:00.000Z") }
    );
    expect(plan).toBe("pro");
  });

  it("returns free for canceling subscriptions after currentPeriodEnd", () => {
    const plan = getEffectivePlan(
      {
        plan: "pro",
        status: "canceling",
        currentPeriodEnd: new Date("2029-01-01T00:00:00.000Z"),
      },
      { now: new Date("2030-01-01T00:00:00.000Z") }
    );
    expect(plan).toBe("free");
  });

  it("returns free when canceled", () => {
    const plan = getEffectivePlan({
      plan: "pro",
      status: "canceled",
      currentPeriodEnd: new Date("2030-01-01T00:00:00.000Z"),
    });
    expect(plan).toBe("free");
  });
});

