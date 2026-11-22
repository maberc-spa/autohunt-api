import { Prisma } from "@prisma/client";
import { describe, it, expect } from "vitest";
import {
  AppError,
  mapPrismaError,
  INTERNAL_ERROR_MESSAGE,
  parseIdParam,
  sendError,
} from "../../src/utils/errors";
import { createMockResponse } from "../helpers/mock-express";

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("Prisma error", {
    code,
    clientVersion: "5.22.0",
  });

describe("parseIdParam", () => {
  it("parses valid positive integers", () => {
    expect(parseIdParam("42")).toBe(42);
  });

  it("throws AppError 400 for invalid ids", () => {
    expect(() => parseIdParam("abc")).toThrow(AppError);
    expect(() => parseIdParam("0")).toThrow(AppError);
    expect(() => parseIdParam("-1")).toThrow(AppError);

    try {
      parseIdParam("abc", "Usuario");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(400);
      expect((error as AppError).message).toBe("Usuario inválido");
    }
  });
});

describe("mapPrismaError", () => {
  it("returns AppError unchanged", () => {
    const error = new AppError(422, "Custom");
    expect(mapPrismaError(error)).toBe(error);
  });

  it("maps P2002 to 409", () => {
    const mapped = mapPrismaError(prismaError("P2002"));
    expect(mapped.statusCode).toBe(409);
    expect(mapped.message).toBe("Ese registro ya existe");
    expect(mapped.details).toBeUndefined();
  });

  it("maps P2003 to 400", () => {
    const mapped = mapPrismaError(prismaError("P2003"));
    expect(mapped.statusCode).toBe(400);
    expect(mapped.details).toBeUndefined();
  });

  it("maps P2025 to 404", () => {
    const mapped = mapPrismaError(prismaError("P2025"));
    expect(mapped.statusCode).toBe(404);
  });

  it("maps unknown Prisma codes to a generic 500", () => {
    const mapped = mapPrismaError(prismaError("P9999"));
    expect(mapped.statusCode).toBe(500);
    expect(mapped.message).toBe(INTERNAL_ERROR_MESSAGE);
    expect(mapped.details).toBeUndefined();
  });

  it("never leaks the message of an unexpected Error", () => {
    const mapped = mapPrismaError(new Error("connect ECONNREFUSED 10.0.0.3:5432"));
    expect(mapped.statusCode).toBe(500);
    expect(mapped.message).toBe(INTERNAL_ERROR_MESSAGE);
  });
});

describe("sendError", () => {
  it("writes mapped error to response", () => {
    const res = createMockResponse();
    sendError(res, new AppError(404, "No encontrado"));

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "No encontrado",
    });
  });
});
