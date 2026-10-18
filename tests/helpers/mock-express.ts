import type { Response } from "express";

export const createMockResponse = () => {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.body = data;
      return this;
    },
  };

  return res as Response & { statusCode: number; body: unknown };
};

export const createMockRequest = (overrides: Record<string, unknown> = {}) =>
  ({
    params: {},
    body: {},
    headers: {},
    ...overrides,
  }) as import("express").Request;
