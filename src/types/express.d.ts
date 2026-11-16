import { Request } from "express";

export type AuthUser = {
  userId: number;
  email: string;
  /** Read from the database on every request, never trusted from the token. */
  role?: "USER" | "ADMIN";
};

/** What the JWT carries: the user plus the session version it was issued for. */
export type TokenPayload = {
  userId: number;
  email: string;
  sessionVersion: number;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
