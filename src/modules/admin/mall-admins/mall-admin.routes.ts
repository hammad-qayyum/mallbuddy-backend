import { Router } from "express";
import { mallAdminController } from "./mall-admin.controller";
import { requireAdminRole } from "../../../middlewares/role.middleware";

const router = Router();

// GAP-018 — provisioning mall admins is strictly Super Admin (global ADMIN)
// territory. MALL_ADMIN must never reach these routes.
router.use(requireAdminRole);

/**
 * @swagger
 * /admin/mall-admins:
 *   post:
 *     summary: Create a mall admin account (Super Admin only)
 *     tags: [Admin - Mall Admins]
 *     description: |
 *       Creates a MALL_ADMIN user bound to a single mall (managedMallId).
 *       Mall admins access the admin panel with all data scoped to their mall.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password, mallId]
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               mallId: { type: string }
 *               phoneNumber: { type: string }
 *     responses:
 *       201:
 *         description: Mall admin created successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Mall not found
 *       409:
 *         description: Email or phone already registered
 */
router.post("/", (req, res, next) => mallAdminController.createMallAdmin(req, res).catch(next));

/**
 * @swagger
 * /admin/mall-admins:
 *   get:
 *     summary: List all mall admin accounts (Super Admin only)
 *     tags: [Admin - Mall Admins]
 *     responses:
 *       200:
 *         description: Mall admins retrieved successfully
 */
router.get("/", (req, res, next) => mallAdminController.getMallAdmins(req, res).catch(next));

export default router;
