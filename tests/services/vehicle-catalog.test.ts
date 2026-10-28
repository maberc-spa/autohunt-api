import { describe, it, expect, vi } from "vitest";
import {
  VehicleCatalogService,
  buildQueryString,
  parseMaxAge,
} from "../../src/services/vehicle-catalog.service";

const config = {
  baseUrl: "https://auto-db-api.maberc.com",
  apiKey: "client-key",
  adminApiKey: "admin-key",
  timeoutMs: 1000,
};

const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

const brands = { data: [{ id: 1, name: "Toyota" }], nextCursor: null };

describe("VehicleCatalogService", () => {
  it("calls /v1 with the client key and forwards the query", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(brands));
    const service = new VehicleCatalogService(fetchFn, () => config);

    const result = await service.get("/brands", { limit: "50", cursor: undefined });

    expect(result.body).toEqual(brands);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://auto-db-api.maberc.com/v1/brands?limit=50");
    expect(init.headers["x-api-key"]).toBe("client-key");
  });

  it("caches GETs according to the upstream max-age", async () => {
    const fetchFn = vi
      .fn()
      .mockImplementation(async () =>
        jsonResponse(brands, 200, { "cache-control": "public, max-age=300" })
      );
    const service = new VehicleCatalogService(fetchFn, () => config);

    await service.get("/brands");
    await service.get("/brands");
    await service.get("/brands", { limit: 10 });

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("does not cache responses without max-age", async () => {
    const fetchFn = vi.fn().mockImplementation(async () => jsonResponse(brands));
    const service = new VehicleCatalogService(fetchFn, () => config);

    await service.get("/brands");
    await service.get("/brands");

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("maps catalog client errors to AppError with their message", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse(
        { error: { code: "not_found", message: "Variante no encontrada" } },
        404
      )
    );
    const service = new VehicleCatalogService(fetchFn, () => config);

    await expect(service.get("/variants/9")).rejects.toMatchObject({
      statusCode: 404,
      message: "Variante no encontrada",
    });
  });

  it("returns 502 when the catalog fails or rejects our key", async () => {
    const service = (status: number) =>
      new VehicleCatalogService(
        vi.fn().mockResolvedValue(jsonResponse({ error: { message: "x" } }, status)),
        () => config
      );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(service(500).get("/brands")).rejects.toMatchObject({ statusCode: 502 });
    await expect(service(401).get("/brands")).rejects.toMatchObject({ statusCode: 502 });
    errorSpy.mockRestore();
  });

  it("returns 503 when the catalog is unreachable", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const service = new VehicleCatalogService(fetchFn, () => config);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(service.get("/brands")).rejects.toMatchObject({ statusCode: 503 });
    warnSpy.mockRestore();
  });

  it("posts JSON bodies to /v1", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 1 } }, 201));
    const service = new VehicleCatalogService(fetchFn, () => config);

    const result = await service.post("/submissions", { brand: "MG" });

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://auto-db-api.maberc.com/v1/submissions");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ brand: "MG" });
    expect(result.status).toBe(201);
  });

  it("calls /admin with the admin key and actor", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    const service = new VehicleCatalogService(fetchFn, () => config);

    await service.admin("POST", "/review-items/42/approve", "ana@autohunt.cl", {
      body: { name: "CX-5" },
    });

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://auto-db-api.maberc.com/admin/review-items/42/approve");
    expect(init.headers["x-api-key"]).toBe("admin-key");
    expect(init.headers["x-admin-user"]).toBe("ana@autohunt.cl");
  });

  it("rejects admin paths that could escape /admin", async () => {
    const fetchFn = vi.fn();
    const service = new VehicleCatalogService(fetchFn, () => config);

    for (const path of ["/../v1/brands", "/a/%2e%2e/b", "/..", "/a\\b"]) {
      await expect(service.admin("GET", path, "a")).rejects.toMatchObject({ statusCode: 400 });
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("fails with 503 when admin is not configured", async () => {
    const service = new VehicleCatalogService(vi.fn(), () => ({
      ...config,
      adminApiKey: undefined,
    }));

    await expect(service.admin("GET", "/jobs", "a")).rejects.toMatchObject({ statusCode: 503 });
  });
});

describe("buildQueryString", () => {
  it("keeps scalars and drops objects and undefined", () => {
    expect(buildQueryString({ q: "corolla", limit: 5, x: ["a"], y: undefined })).toBe(
      "?q=corolla&limit=5"
    );
    expect(buildQueryString({})).toBe("");
  });
});

describe("parseMaxAge", () => {
  it("reads max-age and caps it at one hour", () => {
    expect(parseMaxAge("public, max-age=300")).toBe(300_000);
    expect(parseMaxAge("public, max-age=86400")).toBe(3_600_000);
    expect(parseMaxAge("no-store")).toBe(0);
    expect(parseMaxAge(null)).toBe(0);
  });
});
