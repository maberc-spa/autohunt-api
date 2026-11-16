import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRequest, createMockResponse } from "../helpers/mock-express";

const vehicleDocument = { findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() };
const statStoredObject = vi.fn();
const deleteStoredObject = vi.fn();

vi.mock("../../src/config/database", () => ({ prisma: { vehicleDocument } }));
vi.mock("../../src/services/s3.service", () => ({
  createDownloadUrl: vi.fn().mockResolvedValue({ url: "https://s3/x?sig", expiresAt: "t" }),
  createUploadUrl: vi.fn(),
  deleteStoredObject: (...a: unknown[]) => deleteStoredObject(...a),
  generateFileKey: vi.fn(),
  statStoredObject: (...a: unknown[]) => statStoredObject(...a),
  validateDocumentFile: vi.fn(),
}));

const { default: documents } = await import("../../src/controllers/document.controller");

const pending = {
  id: 9,
  vehicleId: 2,
  userId: 1,
  fileKey: "users/1/vehicles/2/k",
  mimeType: "application/pdf",
  size: 1000,
  status: "PENDING",
};

const confirm = () =>
  createMockRequest({ params: { vehicleId: "2" }, body: { documentId: 9 }, user: { userId: 1 } });

describe("DocumentController.confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vehicleDocument.findFirst.mockResolvedValue(pending);
    vehicleDocument.update.mockResolvedValue({ ...pending, status: "READY" });
  });

  it("refuses when nothing was uploaded", async () => {
    statStoredObject.mockResolvedValue(null);
    const res = createMockResponse();
    await documents.confirm(confirm(), res);

    expect(res.statusCode).toBe(400);
    expect(vehicleDocument.update).not.toHaveBeenCalled();
  });

  it("discards a file that doesn't match what was declared", async () => {
    statStoredObject.mockResolvedValue({ size: 5_000_000, contentType: "text/html" });
    const res = createMockResponse();
    await documents.confirm(confirm(), res);

    expect(res.statusCode).toBe(400);
    expect(deleteStoredObject).toHaveBeenCalledWith(pending.fileKey);
    expect(vehicleDocument.delete).toHaveBeenCalled();
  });

  it("marks a matching upload ready", async () => {
    statStoredObject.mockResolvedValue({ size: 1000, contentType: "application/pdf" });
    const res = createMockResponse();
    await documents.confirm(confirm(), res);

    expect(res.statusCode).toBe(200);
    expect(vehicleDocument.update.mock.calls[0][0].data.status).toBe("READY");
  });

  it("never exposes the storage key", async () => {
    statStoredObject.mockResolvedValue({ size: 1000, contentType: "application/pdf" });
    await documents.confirm(confirm(), createMockResponse());
    expect(vehicleDocument.update.mock.calls[0][0].select.fileKey).toBeUndefined();
  });
});
