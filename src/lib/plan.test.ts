import { describe, it, expect } from "vitest";
import { isPro, planLabel } from "./plan";
import type { SubStatus } from "./types";

describe("isPro", () => {
  it("active and trialing grant Pro", () => {
    expect(isPro("active")).toBe(true);
    expect(isPro("trialing")).toBe(true);
  });

  it("every other status is not Pro", () => {
    const notPro: SubStatus[] = ["past_due", "canceled", "incomplete", "none"];
    for (const status of notPro) expect(isPro(status)).toBe(false);
  });

  it("missing subscription is not Pro", () => {
    expect(isPro(null)).toBe(false);
    expect(isPro(undefined)).toBe(false);
  });
});

describe("planLabel", () => {
  it("maps to Pro / Free", () => {
    expect(planLabel("active")).toBe("Pro");
    expect(planLabel("none")).toBe("Free");
    expect(planLabel(null)).toBe("Free");
  });
});
