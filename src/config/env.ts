const URL_ENV_KEYS = ["DATABASE_URL", "DIRECT_URL"] as const;

const stripQuotes = (value: string): string =>
  value.trim().replace(/^["']|["']$/g, "");

const isValidPostgresUrl = (value: string): boolean =>
  /^postgres(ql)?:\/\/.+/i.test(value);

/** Neon pooled URL → direct URL (remove `-pooler` from host) */
export const deriveDirectUrl = (databaseUrl: string): string =>
  databaseUrl.replace(/-pooler(\.[^/]+)/, "$1");

export const validateEnv = (): void => {
  const missing: string[] = [];

  for (const key of URL_ENV_KEYS) {
    const raw = process.env[key];
    if (!raw?.trim()) {
      missing.push(key);
      continue;
    }

    const value = stripQuotes(raw);
    process.env[key] = value;

    if (!isValidPostgresUrl(value)) {
      throw new Error(
        `${key} inválida: debe empezar con postgresql:// o postgres:// (sin comillas).`
      );
    }
  }

  if (missing.includes("DIRECT_URL") && process.env.DATABASE_URL) {
    process.env.DIRECT_URL = deriveDirectUrl(process.env.DATABASE_URL);
    console.log("DIRECT_URL derivada automáticamente desde DATABASE_URL");
  } else if (missing.length > 0) {
    throw new Error(
      `Variables de entorno requeridas faltantes en Render: ${missing.join(", ")}`
    );
  }

  if (!process.env.JWT_SECRET?.trim()) {
    throw new Error("JWT_SECRET es requerida en producción");
  }
};
