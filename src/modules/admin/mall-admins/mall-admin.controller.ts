import { Request, Response } from "express";
import { mallAdminService } from "./mall-admin.service";
import { createMallAdminSchema } from "./mall-admin.schema";

export const mallAdminController = {
  // Super Admin: create a mall admin account bound to one mall (GAP-018)
  async createMallAdmin(req: Request, res: Response) {
    const parseResult = createMallAdminSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parseResult.error.flatten(),
      });
    }

    try {
      const result = await mallAdminService.createMallAdmin(parseResult.data, req);
      return res.status(201).json({
        message: "Mall admin created successfully",
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            role: result.user.role,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            managedMallId: result.user.managedMallId,
          },
          mall: result.mall,
        },
      });
    } catch (error: any) {
      if (
        error.message?.includes("already exists") ||
        error.message?.includes("unique") ||
        error.message?.includes("duplicate")
      ) {
        return res.status(409).json({ message: "Email already registered" });
      }
      if (error.message?.includes("does not exist")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message?.includes("already registered")) {
        return res.status(409).json({ message: error.message });
      }
      return res.status(500).json({
        message: error.message || "Failed to create mall admin account",
      });
    }
  },

  // Super Admin: list all mall admin accounts
  async getMallAdmins(req: Request, res: Response) {
    try {
      const mallAdmins = await mallAdminService.getMallAdmins();
      return res.json({ data: mallAdmins, total: mallAdmins.length });
    } catch (error: any) {
      return res.status(500).json({
        message: "Failed to fetch mall admins",
        error: error.message,
      });
    }
  },
};
