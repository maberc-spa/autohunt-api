import { AppError } from "../utils/errors";

/**
 * Client for the vehicle catalog service (auto-db-api). autohunt-api is the
 * only entry point: the app never calls the catalog directly. Public reads go
 * to /v1 with CATALOG_API_KEY; admin calls go to /admin with CATALOG_ADMIN_API_KEY.
 */

export type CatalogQuery = Record<string, unknown>;

/** Upstream body is passed through as-is ({ data, nextCursor? }). */
export type CatalogResponse = {
  body: Record<string, unknown>;
  status: number;
  cacheControl: string | null;
};

type CatalogConfig = {
  baseUrl: string;
  apiKey: string | undefined;
  adminApiKey: string | undefined;
  timeoutMs: number;
};

type RequestOptions = {
  method?: string;
  query?: CatalogQuery;
  body?: unknown;
  headers?: Record<string, string>;
};

type CacheEntry = { value: CatalogResponse; expiresAt: number };

const DEFAULT_BASE_URL = "https://auto-db-api.maberc.com";
const DEFAULT_TIMEOUT_MS = 8000;
const CACHE_MAX_ENTRIES = 1000;
/** Upper bound for the upstream max-age, so catalog fixes show up reasonably fast. */
const CACHE_MAX_TTL_MS = 60 * 60 * 1000;

const readConfig = (): CatalogConfig => ({
  baseUrl: (process.env.CATALOG_API_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ""),
  apiKey: process.env.CATALOG_API_KEY?.trim() || undefined,
  adminApiKey: process.env.CATALOG_ADMIN_API_KEY?.trim() || undefined,
  timeoutMs: Number(process.env.CATALOG_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
});

/** Only scalar query values are forwarded; the catalog validates them. */
export const buildQueryString = (query: CatalogQuery = {}): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

export const parseMaxAge = (cacheControl: string | null): number => {
  if (!cacheControl || /no-store|no-cache|private/.test(cacheControl)) return 0;
  const match = /max-age=(\d+)/.exec(cacheControl);
  return match ? Math.min(Number(match[1]) * 1000, CACHE_MAX_TTL_MS) : 0;
};

/** Maps the catalog's `{ error: { code, message, details } }` to an AppError. */
const toAppError = (status: number, payload: unknown): AppError => {
  const error = (payload as { error?: { code?: string; message?: string; details?: unknown } })
    ?.error;

  if (status >= 500) {
    return new AppError(502, "El catálogo de vehículos respondió con un error");
  }
  if (status === 401 || status === 403) {
    // Our own key was rejected: a server misconfiguration, not the client's fault.
    console.error(`Catálogo de vehículos rechazó la API key (${status})`);
    return new AppError(502, "El catálogo de vehículos no está disponible");
  }
  return new AppError(
    status,
    error?.message ?? "Error en el catálogo de vehículos",
    error?.details ?? (error?.code ? { code: error.code } : undefined)
  );
};

export class VehicleCatalogService {
  constructor(
    private readonly fetchFn: typeof fetch = fetch,
    private readonly config: () => CatalogConfig = readConfig
  ) {}

  private readonly cache = new Map<string, CacheEntry>();

  /** Public catalog read (GET /v1/...), cached according to the upstream Cache-Control. */
  async get(path: string, query?: CatalogQuery): Promise<CatalogResponse> {
    const key = `${path}${buildQueryString(query)}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const config = this.config();
    const response = await this.request(config, `/v1${path}`, config.apiKey, { query });
    const ttl = parseMaxAge(response.cacheControl);
    if (ttl > 0) this.remember(key, response, ttl);
    return response;
  }

  /** Public catalog write (POST /v1/...), never cached. */
  async post(path: string, body: unknown): Promise<CatalogResponse> {
    const config = this.config();
    return this.request(config, `/v1${path}`, config.apiKey, { method: "POST", body });
  }

  /** Admin call (/admin/...). [actor] is recorded by the catalog as who resolved review items. */
  async admin(
    method: string,
    path: string,
    actor: string,
    options: { query?: CatalogQuery; body?: unknown } = {}
  ): Promise<CatalogResponse> {
    // fetch() resolves dot segments: never let a path escape /admin.
    if (/(^|\/)\.{1,2}(\/|$)|%2e|%2f|\\/i.test(path)) {
      throw new AppError(400, "Ruta inválida");
    }
    const config = this.config();
    if (!config.adminApiKey) {
      throw new AppError(503, "Administración del catálogo no configurada");
    }
    return this.request(config, `/admin${path}`, config.adminApiKey, {
      method,
      ...options,
      headers: { "x-admin-user": actor },
    });
  }

  clearCache(): void {
    this.cache.clear();
  }

  private async request(
    config: CatalogConfig,
    path: string,
    apiKey: string | undefined,
    options: RequestOptions
  ): Promise<CatalogResponse> {
    const method = options.method ?? "GET";
    const hasBody = options.body !== undefined && method !== "GET" && method !== "HEAD";

    let response: Response;
    try {
      response = await this.fetchFn(`${config.baseUrl}${path}${buildQueryString(options.query)}`, {
        method,
        headers: {
          accept: "application/json",
          ...(hasBody ? { "content-type": "application/json" } : {}),
          ...(apiKey ? { "x-api-key": apiKey } : {}),
          ...options.headers,
        },
        ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
        signal: AbortSignal.timeout(config.timeoutMs),
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Catálogo de vehículos no disponible:", error);
      }
      throw new AppError(503, "El catálogo de vehículos no está disponible");
    }

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw toAppError(response.status, payload);

    return {
      body: payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {},
      status: response.status,
      cacheControl: response.headers.get("cache-control"),
    };
  }

  private remember(key: string, value: CatalogResponse, ttlMs: number): void {
    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      // Maps iterate in insertion order: drop the oldest entry.
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

export const vehicleCatalogService = new VehicleCatalogService();
