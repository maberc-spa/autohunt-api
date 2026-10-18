import { Request } from "express";

export type AuthUser = {
  userId: number;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
