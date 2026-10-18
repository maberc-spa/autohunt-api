import { describe, it, expect, vi } from "vitest";
import { validate, idParamSchema } from "../../src/middleware/validate-request";
import { AppError } from "../../src/utils/errors";
import { createMockRequest, createMockResponse } from "../helpers/mock-express";
import { z } from "zod";

describe("validate middleware", () => {
  it("passes parsed body to next", () => {
    const schema = z.object({ name: z.string() });
    const middleware = validate(schema);
    const req = createMockRequest({ body: { name: "Chile" } });
    const next = vi.fn();

    middleware(req, createMockResponse(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: "Chile" });
  });

  it("calls next with AppError on invalid body", () => {
    const schema = z.object({ name: z.string().min(1) });
    const middleware = validate(schema);
    const req = createMockRequest({ body: { name: "" } });
    const next = vi.fn();

    middleware(req, createMockResponse(), next);

    expect(next).toHaveBeenCalledOnce();
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe("Validación fallida");
  });

  it("coerces id param", () => {
    const middleware = validate(idParamSchema, "params");
    const req = createMockRequest({ params: { id: "5" } });
    const next = vi.fn();

    middleware(req, createMockResponse(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.params.id).toBe(5);
  });
});
