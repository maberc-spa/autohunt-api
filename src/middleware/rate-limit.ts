import rateLimit, { Options } from "express-rate-limit";

export const isRateLimitSkipped = (): boolean => process.env.NODE_ENV === "test";

const createLimiter = (message: string, windowMs: number, max: number) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isRateLimitSkipped(),
    handler: (_req, res, _next, options) => {
      res.status(options.statusCode).json({
        success: false,
        message,
      });
    },
  } satisfies Partial<Options>);

/** Catálogos públicos (GET) y health checks */
export const publicReadLimiter = createLimiter(
  "Demasiadas solicitudes. Intenta de nuevo en unos minutos.",
  Number(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS) || 15 * 60 * 1000,
  Number(process.env.RATE_LIMIT_PUBLIC_MAX) || 100
);

/** Login y registro — límite estricto anti brute-force */
export const authLimiter = createLimiter(
  "Demasiados intentos de autenticación. Intenta de nuevo más tarde.",
  Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 15 * 60 * 1000,
  Number(process.env.RATE_LIMIT_AUTH_MAX) || 10
);
