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

  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    throw new Error("JWT_SECRET es requerida");
  }

  if (process.env.NODE_ENV === "production") {
    if (jwtSecret.length < 32) {
      throw new Error("JWT_SECRET debe tener al menos 32 caracteres (openssl rand -base64 32)");
    }
    // Not fatal, but these features are off until configured.
    if (!process.env.MAILER_BASE_URL?.trim() || !process.env.MAILER_API_KEY?.trim()) {
      console.warn("⚠️  MAILER_* no configurado: no se pueden enviar códigos de 2FA ni de recuperación");
    }
    if (!process.env.S3_BUCKET?.trim()) {
      console.warn("⚠️  S3_* no configurado: los documentos están desactivados");
    }
  }
};
