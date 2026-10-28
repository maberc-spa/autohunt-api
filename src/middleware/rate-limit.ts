import rateLimit, { Options } from "express-rate-limit";

export const isRateLimitSkipped = (): boolean => process.env.NODE_ENV === "test";

const createLimiter = (
  message: string,
  windowMs: number,
  max: number,
  keyGenerator?: Options["keyGenerator"]
) =>
  rateLimit({
    windowMs,
    max,
    ...(keyGenerator ? { keyGenerator } : {}),
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

/** Decodificación de VIN — protege la cuota del servicio externo (NHTSA) */
export const vinDecodeLimiter = createLimiter(
  "Demasiadas consultas de VIN. Intenta de nuevo en unos minutos.",
  Number(process.env.RATE_LIMIT_VIN_WINDOW_MS) || 15 * 60 * 1000,
  Number(process.env.RATE_LIMIT_VIN_MAX) || 30
);

/** Catálogo de vehículos (listas encadenadas + typeahead: muchas requests por pantalla) */
export const catalogReadLimiter = createLimiter(
  "Demasiadas consultas al catálogo. Intenta de nuevo en unos minutos.",
  Number(process.env.RATE_LIMIT_CATALOG_WINDOW_MS) || 15 * 60 * 1000,
  Number(process.env.RATE_LIMIT_CATALOG_MAX) || 300
);

/**
 * "No encuentro mi auto" — por usuario (va después de `authenticate`). El catálogo
 * no puede limitar por IP porque todas las requests le llegan desde esta API.
 */
export const catalogSubmissionLimiter = createLimiter(
  "Demasiados reportes de vehículos. Intenta de nuevo más tarde.",
  Number(process.env.RATE_LIMIT_CATALOG_SUBMISSION_WINDOW_MS) || 60 * 60 * 1000,
  Number(process.env.RATE_LIMIT_CATALOG_SUBMISSION_MAX) || 10,
  (req) => `user:${req.user?.userId}`
);
