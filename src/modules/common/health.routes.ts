import { Router, Request, Response } from "express";
import prisma from "../../config/prisma";

/**
 * N15 — Operations endpoints. Both unauthenticated by design (load balancers
 * and uptime checks shouldn't have to carry a session cookie).
 *
 *   GET /health  → fast liveness check (process up, no DB hit)
 *   GET /ready   → readiness check (DB reachable)
 *
 * `/health` should never fail unless the Node process is dead.
 * `/ready` returns 503 when the DB is unreachable so the load balancer can
 * pull this instance out of rotation without taking traffic to a broken pod.
 */
const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

router.get("/ready", async (_req: Request, res: Response) => {
  try {
    // Cheap query that exercises the connection without touching real tables.
    await prisma.$queryRawUnsafe("SELECT 1");
    res.status(200).json({ status: "ready" });
  } catch (err: any) {
    console.error("[health] DB ping failed", err?.message ?? err);
    res.status(503).json({ status: "not-ready", reason: "db" });
  }
});

export default router;
