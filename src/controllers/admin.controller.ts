import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { AppError, parseIdParam, sendError } from "../utils/errors";
import { formatUserProfile, userProfileSelect } from "../utils/user-profile";
import { countByDay, windowStart } from "../utils/stats";
import { deleteUserWithData } from "../services/user-deletion.service";

const CHART_DAYS = 14;
const RECENT_DAYS = 30;
const TOP_BRANDS = 5;

const userSummarySelect = {
  id: true,
  username: true,
  email: true,
  name: true,
  role: true,
  plan: true,
  oauthProvider: true,
  createdAt: true,
  _count: { select: { vehicles: true, documents: true } },
} satisfies Prisma.UserSelect;

type UserSummaryRecord = Prisma.UserGetPayload<{
  select: typeof userSummarySelect;
}>;

const formatUserSummary = ({ _count, ...user }: UserSummaryRecord) => ({
  ...user,
  vehicleCount: _count.vehicles,
  documentCount: _count.documents,
});

const decimalToNumber = (value: Prisma.Decimal | null): number =>
  value ? value.toNumber() : 0;

/** Resolves `{ id, count }` group results to `{ name, count }` using a lookup. */
const withNames = async (
  groups: { id: number; count: number }[],
  findNames: (ids: number[]) => Promise<{ id: number; name: string }[]>
) => {
  const names = new Map(
    (await findNames(groups.map((group) => group.id))).map((row) => [
      row.id,
      row.name,
    ])
  );
  return groups.map((group) => ({
    name: names.get(group.id) ?? `#${group.id}`,
    count: group.count,
  }));
};

class AdminController {
  async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const chartStart = windowStart(CHART_DAYS);
      const recentStart = windowStart(RECENT_DAYS);

      const [
        users,
        admins,
        vehicles,
        maintenances,
        documents,
        storage,
        spend,
        newUsers,
        newVehicles,
        usersWithVehicles,
        planGroups,
        fuelGroups,
        brandGroups,
        recentUserDates,
        recentVehicleDates,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: "ADMIN" } }),
        prisma.vehicle.count(),
        prisma.maintenance.count(),
        prisma.vehicleDocument.count({ where: { status: "READY" } }),
        prisma.vehicleDocument.aggregate({
          where: { status: "READY" },
          _sum: { size: true },
        }),
        prisma.maintenance.aggregate({ _sum: { totalCost: true } }),
        prisma.user.count({ where: { createdAt: { gte: recentStart } } }),
        prisma.vehicle.count({ where: { createdAt: { gte: recentStart } } }),
        prisma.user.count({ where: { vehicles: { some: {} } } }),
        prisma.user.groupBy({ by: ["plan"], _count: { _all: true } }),
        prisma.vehicle.groupBy({ by: ["fuelTypeId"], _count: { _all: true } }),
        prisma.vehicle.groupBy({
          by: ["brandId"],
          _count: { _all: true },
          orderBy: { _count: { brandId: "desc" } },
          take: TOP_BRANDS,
        }),
        prisma.user.findMany({
          where: { createdAt: { gte: chartStart } },
          select: { createdAt: true },
        }),
        prisma.vehicle.findMany({
          where: { createdAt: { gte: chartStart } },
          select: { createdAt: true },
        }),
      ]);

      const [vehiclesByFuelType, topBrands] = await Promise.all([
        withNames(
          fuelGroups.map((g) => ({ id: g.fuelTypeId, count: g._count._all })),
          (ids) =>
            prisma.fuelType.findMany({
              where: { id: { in: ids } },
              select: { id: true, name: true },
            })
        ),
        withNames(
          brandGroups.map((g) => ({ id: g.brandId, count: g._count._all })),
          (ids) =>
            prisma.brand.findMany({
              where: { id: { in: ids } },
              select: { id: true, name: true },
            })
        ),
      ]);

      res.json({
        success: true,
        data: {
          totals: {
            users,
            admins,
            vehicles,
            maintenances,
            documents,
            storageBytes: storage._sum.size ?? 0,
            maintenanceSpend: decimalToNumber(spend._sum.totalCost),
          },
          recent: {
            days: RECENT_DAYS,
            newUsers,
            newVehicles,
          },
          averageVehiclesPerUser: users > 0 ? vehicles / users : 0,
          usersWithVehicles,
          usersByPlan: planGroups
            .map((g) => ({ plan: g.plan, count: g._count._all }))
            .sort((a, b) => b.count - a.count),
          vehiclesByFuelType: vehiclesByFuelType.sort(
            (a, b) => b.count - a.count
          ),
          topBrands,
          signupsByDay: countByDay(
            recentUserDates.map((u) => u.createdAt),
            CHART_DAYS
          ),
          vehiclesByDay: countByDay(
            recentVehicleDates.map((v) => v.createdAt),
            CHART_DAYS
          ),
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const { search, page, pageSize, sort } = req.query as unknown as {
        search?: string;
        page: number;
        pageSize: number;
        sort: "recent" | "vehicles";
      };

      const where: Prisma.UserWhereInput = search
        ? {
            OR: [
              { username: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
            ],
          }
        : {};

      const orderBy: Prisma.UserOrderByWithRelationInput[] =
        sort === "vehicles"
          ? [{ vehicles: { _count: "desc" } }, { createdAt: "desc" }]
          : [{ createdAt: "desc" }];

      const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: userSummarySelect,
        }),
      ]);

      res.json({
        success: true,
        data: {
          items: users.map(formatUserSummary),
          page,
          pageSize,
          total,
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const id = parseIdParam(req.params.id);

      const user = await prisma.user.findUnique({
        where: { id },
        select: userProfileSelect,
      });

      if (!user) {
        throw new AppError(404, "Usuario no encontrado");
      }

      const [vehicles, storage, spend, maintenances, country] =
        await Promise.all([
          prisma.vehicle.findMany({
            where: { userId: id },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              name: true,
              licensePlate: true,
              year: true,
              mileage: true,
              createdAt: true,
              brand: { select: { name: true } },
              model: { select: { name: true } },
              _count: { select: { maintenances: true, documents: true } },
            },
          }),
          prisma.vehicleDocument.aggregate({
            where: { userId: id, status: "READY" },
            _sum: { size: true },
            _count: { _all: true },
          }),
          prisma.maintenance.aggregate({
            where: { vehicle: { userId: id } },
            _sum: { totalCost: true },
          }),
          prisma.maintenance.count({ where: { vehicle: { userId: id } } }),
          user.countryId
            ? prisma.country.findUnique({
                where: { id: user.countryId },
                select: { name: true },
              })
            : null,
        ]);

      res.json({
        success: true,
        data: {
          user: {
            ...formatUserProfile(user),
            countryName: country?.name ?? null,
          },
          stats: {
            vehicles: vehicles.length,
            maintenances,
            documents: storage._count._all,
            storageBytes: storage._sum.size ?? 0,
            maintenanceSpend: decimalToNumber(spend._sum.totalCost),
          },
          vehicles: vehicles.map(({ brand, model, _count, ...vehicle }) => ({
            ...vehicle,
            brandName: brand.name,
            modelName: model.name,
            maintenanceCount: _count.maintenances,
            documentCount: _count.documents,
          })),
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const id = parseIdParam(req.params.id);

      if (id === req.user!.userId) {
        throw new AppError(
          400,
          "No puedes eliminar tu propia cuenta desde el panel"
        );
      }

      const target = await prisma.user.findUnique({
        where: { id },
        select: { role: true },
      });

      if (!target) {
        throw new AppError(404, "Usuario no encontrado");
      }

      if (target.role === "ADMIN") {
        throw new AppError(403, "No se puede eliminar a otro administrador");
      }

      const deleted = await deleteUserWithData(id);

      res.json({
        success: true,
        data: deleted,
        message: "Usuario y sus datos eliminados",
      });
    } catch (error) {
      sendError(res, error);
    }
  }
}

export default new AdminController();
