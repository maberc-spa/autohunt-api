import { describe, it, expect } from "vitest";
import { notFoundHandler } from "../../src/middleware/not-found";
import { createMockRequest, createMockResponse } from "../helpers/mock-express";

describe("notFoundHandler", () => {
  it("returns 404 json response", () => {
    const res = createMockResponse();

    notFoundHandler(createMockRequest(), res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "Ruta no encontrada",
    });
  });
});
