import { describe, it, expect, vi } from "vitest";
import { createCrudController } from "../../src/utils/crudFactory";
import { createMockRequest, createMockResponse } from "../helpers/mock-express";
import { Prisma } from "@prisma/client";

const options = { singular: "País", plural: "países" };

describe("createCrudController", () => {
  it("getAll returns data on success", async () => {
    const delegate = {
      findMany: vi.fn().mockResolvedValue([{ id: 1, name: "Chile" }]),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const controller = createCrudController(delegate, options);
    const res = createMockResponse();

    await controller.getAll(createMockRequest(), res);

    expect(res.body).toEqual({
      success: true,
      data: [{ id: 1, name: "Chile" }],
    });
  });

  it("getById returns 404 when not found", async () => {
    const delegate = {
      findMany: vi.fn(),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const controller = createCrudController(delegate, options);
    const res = createMockResponse();

    await controller.getById(createMockRequest({ params: { id: "99" } }), res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "País no encontrado",
    });
  });

  it("create returns 201 with message", async () => {
    const created = { id: 1, name: "Chile", code: "CHL" };
    const delegate = {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn().mockResolvedValue(created),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const controller = createCrudController(delegate, options);
    const res = createMockResponse();
    const req = createMockRequest({ body: { name: "Chile", code: "CHL" } });

    await controller.create(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      success: true,
      data: created,
      message: "País creado exitosamente",
    });
  });

  it("maps prisma duplicate errors on create", async () => {
    const delegate = {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn().mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("duplicate", {
          code: "P2002",
          clientVersion: "5.22.0",
        })
      ),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const controller = createCrudController(delegate, options);
    const res = createMockResponse();

    await controller.create(createMockRequest({ body: { name: "Chile", code: "CHL" } }), res);

    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({
      success: false,
      message: "Registro duplicado",
    });
  });

  it("remove returns success message", async () => {
    const delegate = {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue({ id: 1 }),
    };

    const controller = createCrudController(delegate, options);
    const res = createMockResponse();

    await controller.remove(createMockRequest({ params: { id: "1" } }), res);

    expect(res.body).toEqual({
      success: true,
      message: "País eliminado exitosamente",
    });
    expect(delegate.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
