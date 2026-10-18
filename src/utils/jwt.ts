import jwt, { SignOptions } from "jsonwebtoken";
import { AuthUser } from "../types/express";

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET no está configurado");
  }
  return secret;
};

const signOptions: SignOptions = {
  expiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"],
};

export const signToken = (payload: AuthUser): string =>
  jwt.sign(payload, getSecret(), signOptions);

export const verifyToken = (token: string): AuthUser => {
  const decoded = jwt.verify(token, getSecret());

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.userId !== "number" ||
    typeof decoded.email !== "string"
  ) {
    throw new Error("Token inválido");
  }

  return { userId: decoded.userId, email: decoded.email };
};
