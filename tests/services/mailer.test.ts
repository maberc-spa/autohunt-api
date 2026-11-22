import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { codeEmail, sendEmail } from "../../src/services/mailer.service";

const env = { ...process.env };

describe("mailer", () => {
  beforeEach(() => vi.spyOn(console, "info").mockImplementation(() => {}));
  afterEach(() => {
    process.env = { ...env };
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sends the maberc mailer payload (text + html)", async () => {
    process.env.MAILER_BASE_URL = "https://mailer.test/";
    process.env.MAILER_API_KEY = "key";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail({ to: "a@x.cl", subject: "S", text: "T", html: "<p>H</p>" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://mailer.test/email/send");
    expect(init.headers["X-Api-Key"]).toBe("key");
    expect(init.headers.Authorization).toBeUndefined();
    expect(JSON.parse(init.body)).toEqual({ to: "a@x.cl", subject: "S", text: "T", html: "<p>H</p>" });
  });

  it("defaults to the deployed maberc mailer when only the key is set", async () => {
    delete process.env.MAILER_BASE_URL;
    process.env.MAILER_API_KEY = "key";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail({ to: "a@x.cl", subject: "S", text: "T", html: "H" });

    expect(fetchMock.mock.calls[0][0]).toBe("https://mailer.maberc.com/email/send");
  });

  it("fails with 503 when the mailer rejects the request", async () => {
    process.env.MAILER_BASE_URL = "https://mailer.test";
    process.env.MAILER_API_KEY = "key";
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400 }));

    await expect(
      sendEmail({ to: "a@x.cl", subject: "S", text: "T", html: "H" })
    ).rejects.toMatchObject({ statusCode: 503 });
  });

  it("refuses to silently drop emails in production when unconfigured", async () => {
    delete process.env.MAILER_BASE_URL;
    delete process.env.MAILER_API_KEY;
    process.env.NODE_ENV = "production";
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      sendEmail({ to: "a@x.cl", subject: "S", text: "T", html: "H" })
    ).rejects.toMatchObject({ statusCode: 503 });
  });

  it("escapes the code email's html", () => {
    const { html, text } = codeEmail({
      heading: "<b>x</b>",
      intro: "i",
      code: "123456",
      expiryMinutes: 10,
    });
    expect(html).not.toContain("<b>x</b>");
    expect(text).toContain("123456");
  });
});
