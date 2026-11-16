import { describe, it, expect, vi, afterEach } from "vitest";
import { createMockRequest, createMockResponse } from "../helpers/mock-express";

const user = { update: vi.fn() };
vi.mock("../../src/config/database", () => ({ prisma: { user } }));

const { default: plans } = await import("../../src/controllers/plan.controller");

describe("PlanController", () => {
  afterEach(() => {
    delete process.env.BILLING_STUB_ENABLED;
    vi.clearAllMocks();
  });

  it("refuses upgrades while there is no payment provider", async () => {
    const res = createMockResponse();
    await plans.upgrade(
      createMockRequest({ body: { plan: "PREMIUM_TIER_2" }, user: { userId: 1 } }),
      res
    );

    expect(res.statusCode).toBe(403);
    expect(user.update).not.toHaveBeenCalled();
  });

  it("never enables the free stub in production", async () => {
    process.env.BILLING_STUB_ENABLED = "true";
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const res = createMockResponse();
    await plans.upgrade(
      createMockRequest({ body: { plan: "PREMIUM_TIER_2" }, user: { userId: 1 } }),
      res
    );
    process.env.NODE_ENV = previous;

    expect(res.statusCode).toBe(403);
  });

  it("lists plans as not purchasable", async () => {
    const res = createMockResponse();
    await plans.list(createMockRequest(), res);
    const data = (res.body as { data: { purchasable: boolean }[] }).data;
    expect(data.every((plan) => plan.purchasable === false)).toBe(true);
  });
});
