import { Router } from "express";
import { registerSchema, loginSchema } from "@g-stock/validation";
import { env } from "../../config/env.js";
import { requireAuth } from "../../middleware/auth-tenant.js";
import { registerUser, loginUser, getCurrentUserContext } from "./auth.service.js";

export const authRouter = Router();

authRouter.post("/auth/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const result = await registerUser(parsed, req.requestId);
    res.cookie("gstock_session", result.token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "lax",
      maxAge: 12 * 3600 * 1000,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post("/auth/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const result = await loginUser(parsed, req.requestId);
    res.cookie("gstock_session", result.token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "lax",
      maxAge: 12 * 3600 * 1000,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post("/auth/logout", (_req, res) => {
  res.clearCookie("gstock_session");
  res.json({ success: true, message: "Session déconnectée avec succès." });
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const requestedOrgId = req.header("X-Organization-Id") || (req.query.organizationId as string | undefined);
    const context = await getCurrentUserContext(req.auth!.userId, requestedOrgId);
    res.json(context);
  } catch (err) {
    next(err);
  }
});
