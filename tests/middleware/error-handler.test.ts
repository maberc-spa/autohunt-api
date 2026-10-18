import { describe, it, expect } from "vitest";
import { errorHandler } from "../../src/middleware/error-handler";
import { AppError } from "../../src/utils/errors";
import { createMockRequest, createMockResponse } from "../helpers/mock-express";

describe("errorHandler", () => {
  it("responds with AppError status and message", () => {
    const res = createMockResponse();
    const next = () => undefined;

    errorHandler(new AppError(400, "Bad request"), createMockRequest(), res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: "Bad request",
    });
  });

  it("includes validation details when present", () => {
    const res = createMockResponse();
    const details = { email: ["Invalid email"] };

    errorHandler(
      new AppError(400, "Validación fallida", details),
      createMockRequest(),
      res,
      () => undefined
    );

    expect(res.body).toEqual({
      success: false,
      message: "Validación fallida",
      details,
    });
  });
});
