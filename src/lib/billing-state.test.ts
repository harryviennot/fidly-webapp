import { describe, expect, it } from "bun:test";
import { deriveTrialSubscriptionFlags } from "./billing-state";

const NOW = Date.parse("2026-07-22T00:00:00Z");
const inDays = (n: number) => new Date(NOW + n * 86_400_000).toISOString();

describe("deriveTrialSubscriptionFlags", () => {
  it("treats a card-upfront trial (status=trial + live subscription) as active-in-trial", () => {
    const out = deriveTrialSubscriptionFlags({
      billingStatus: "trial",
      hasSubscription: true,
      trialEndsAt: inDays(10),
      now: NOW,
    });
    expect(out.isActiveInTrial).toBe(true);
    expect(out.daysUntilFirstCharge).toBe(10);
  });

  it("treats a legacy mid-trial conversion (status=active + trial future) as active-in-trial", () => {
    const out = deriveTrialSubscriptionFlags({
      billingStatus: "active",
      hasSubscription: true,
      trialEndsAt: inDays(3),
      now: NOW,
    });
    expect(out.isActiveInTrial).toBe(true);
    expect(out.daysUntilFirstCharge).toBe(3);
  });

  it("does NOT treat a no-card trial (no subscription) as active-in-trial", () => {
    const out = deriveTrialSubscriptionFlags({
      billingStatus: "trial",
      hasSubscription: false,
      trialEndsAt: inDays(5),
      now: NOW,
    });
    expect(out.isActiveInTrial).toBe(false);
    expect(out.daysUntilFirstCharge).toBeNull();
  });

  it("does NOT treat a cancelled subscription as active-in-trial even with a future trial end", () => {
    const out = deriveTrialSubscriptionFlags({
      billingStatus: "cancelled",
      hasSubscription: true,
      trialEndsAt: inDays(5),
      now: NOW,
    });
    expect(out.isActiveInTrial).toBe(false);
  });

  it("is false once the trial end has passed", () => {
    const out = deriveTrialSubscriptionFlags({
      billingStatus: "trial",
      hasSubscription: true,
      trialEndsAt: inDays(-1),
      now: NOW,
    });
    expect(out.isActiveInTrial).toBe(false);
    expect(out.daysUntilFirstCharge).toBeNull();
  });

  it("rounds partial days up", () => {
    const out = deriveTrialSubscriptionFlags({
      billingStatus: "trial",
      hasSubscription: true,
      trialEndsAt: new Date(NOW + 1.2 * 86_400_000).toISOString(),
      now: NOW,
    });
    expect(out.daysUntilFirstCharge).toBe(2);
  });

  it("is false with no trial_ends_at", () => {
    const out = deriveTrialSubscriptionFlags({
      billingStatus: "trial",
      hasSubscription: true,
      trialEndsAt: null,
      now: NOW,
    });
    expect(out.isActiveInTrial).toBe(false);
  });
});
