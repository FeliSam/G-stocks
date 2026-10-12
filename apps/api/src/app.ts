import path from "node:path";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { prisma } from "@g-stock/database";
import { env } from "./config/env.js";
import {
  requestContextMiddleware,
  rateLimitMiddleware,
  errorHandlerMiddleware,
} from "./middleware/request-context.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { organizationsRouter } from "./modules/organizations/organizations.routes.js";
import { productsRouter } from "./modules/products/products.routes.js";
import { warehousesRouter } from "./modules/warehouses/warehouses.routes.js";
import { stockRouter } from "./modules/stock/stock.routes.js";
import { inventoriesRouter } from "./modules/inventories/inventories.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { appearanceRouter } from "./modules/appearance/appearance.routes.js";
import { billingRouter } from "./modules/billing/billing.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { openapiRouter } from "./modules/openapi/openapi.routes.js";
import { AppError } from "./shared/errors.js";

export function createApp() {
  const app = express();

  app.use(requestContextMiddleware);
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
      credentials: true,
      exposedHeaders: ["X-Request-Id"],
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "4mb" }));

  // Servir les logos uploadés avec en-têtes sûrs
  const uploadsDir = path.resolve(env.LOCAL_STORAGE_PATH);
  app.use("/uploads", express.static(uploadsDir));

  // Healthcheck API & Base de données PostgreSQL
  app.get("/api/v1/health", async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: "healthy",
        service: "g-stock-api",
        database: "connected",
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    } catch {
      res.status(503).json({
        status: "degraded",
        service: "g-stock-api",
        database: "unreachable",
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    }
  });

  app.use("/api/v1", rateLimitMiddleware(300, 60_000));
  app.use("/api/v1", openapiRouter);
  app.use("/api/v1", authRouter);
  app.use("/api/v1", organizationsRouter);
  app.use("/api/v1", productsRouter);
  app.use("/api/v1", warehousesRouter);
  app.use("/api/v1", stockRouter);
  app.use("/api/v1", inventoriesRouter);
  app.use("/api/v1", reportsRouter);
  app.use("/api/v1", appearanceRouter);
  app.use("/api/v1", billingRouter);
  app.use("/api/v1", adminRouter);

  app.use((_req, _res, next) => {
    next(new AppError(404, "ROUTE_NOT_FOUND", "La route demandée n'existe pas."));
  });

  app.use(errorHandlerMiddleware);

  return app;
}
