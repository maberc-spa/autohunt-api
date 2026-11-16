import jwt, { SignOptions } from "jsonwebtoken";
import { TokenPayload } from "../types/express";

const ALGORITHM = "HS256";

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET no está configurado");
  }
  return secret;
};

const signOptions = (): SignOptions => ({
  algorithm: ALGORITHM,
  expiresIn: (process.env.JWT_EXPIRES_IN?.trim() || "30d") as SignOptions["expiresIn"],
});

export const signToken = (payload: TokenPayload): string =>
  jwt.sign(
    { userId: payload.userId, email: payload.email, sv: payload.sessionVersion },
    getSecret(),
    signOptions()
  );

/** Tokens issued before session versions existed carry none: they count as version 0. */
export const verifyToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, getSecret(), { algorithms: [ALGORITHM] });

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.userId !== "number" ||
    typeof decoded.email !== "string"
  ) {
    throw new Error("Token inválido");
  }

  return {
    userId: decoded.userId,
    email: decoded.email,
    sessionVersion: typeof decoded.sv === "number" ? decoded.sv : 0,
  };
};
