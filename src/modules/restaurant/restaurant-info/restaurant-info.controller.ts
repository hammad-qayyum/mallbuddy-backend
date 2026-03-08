import { Request, Response } from "express";
import restaurantInfoService from "./restaurant-info.service";

import {
  restaurantInfoSchema,
  createBusinessHoursSchema,
  updateBusinessHoursSchema,
} from "./restaurant-info.schema";

// Helper: Parse HH:mm to minutes
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  if (typeof h !== "number" || isNaN(h) || typeof m !== "number" || isNaN(m)) {
    throw new Error(`Invalid time format: ${time}`);
  }
  return h * 60 + m;
}

// Business hours validation
import { BusinessDayInput } from "./restaurant-info.schema";
function validateBusinessHours(days: BusinessDayInput[]): string[] {
  const errors = [];
  for (const day of days) {
    if (day.isClosed && day.timeSlots && day.timeSlots.length > 0) {
      errors.push(`${day.dayOfWeek}: Closed day cannot have timeSlots.`);
      continue;
    }
    if (!day.isClosed && day.timeSlots && day.timeSlots.length > 0) {
      // Sort slots by openTime
      const slots = [...day.timeSlots].sort((a, b) => parseTimeToMinutes(a.openTime) - parseTimeToMinutes(b.openTime));
      let lastClose = null;
      let lastType = null;
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (!slot) continue;
        const open = slot.openTime ? parseTimeToMinutes(slot.openTime) : 0;
        const close = slot.closeTime ? parseTimeToMinutes(slot.closeTime) : 0;
        // Time ordering
        if (open >= close) {
          errors.push(`${day.dayOfWeek}: Slot ${i + 1} openTime must be before closeTime.`);
        }
        // No overlaps (within the same day)
        if (lastClose !== null && open < lastClose) {
          errors.push(`${day.dayOfWeek}: Slot ${i + 1} overlaps with previous slot (same day).`);
        }
        // Sequential logic: No consecutive OPENs (within the same day)
        if (lastType === "OPEN" && slot.slotType === "OPEN") {
          errors.push(`${day.dayOfWeek}: Consecutive OPEN slots without BREAK (same day).`);
        }
        lastClose = close;
        lastType = slot.slotType ?? null;
      }
    }
  }
  return errors;
}

export const restaurantInfoController = {
  /**
   * GET /restaurant/:restaurantId/info
   * Get restaurant personal information and business hours
   * Public endpoint - anyone can view
   */
  async getInfo(req: Request, res: Response) {
    const { restaurantId } = req.params;

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "Restaurant ID is required" });
    }

    try {
      const info = await restaurantInfoService.getRestaurantInfo(restaurantId);

      if (!info) {
        return res.status(404).json({ success: false, message: "Restaurant not found" });
      }

      return res.json({ success: true, data: info });
    } catch (error: any) {
      console.error('[restaurantInfoController] getInfo error:', error?.stack || error);
      return res.status(500).json({ success: false, message: "Failed to fetch restaurant info" });
    }
  },

  /**
   * PATCH /restaurant/:restaurantId/info
   * Update restaurant personal information
   * Only restaurant owner can update
   */
  async updateInfo(req: Request, res: Response) {
    const { restaurantId } = req.params;
    const userId = (req as any).userId; // From auth middleware

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "Restaurant ID is required" });
    }

    // // Check ownership
    // if (userId !== restaurantId) {
    //   return res.status(403).json({ success: false, message: "You can only update your own restaurant" });
    // }

    const parseResult = restaurantInfoSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({ success: false, message: "Invalid request body", errors: parseResult.error.flatten() });
    }

    try {
      const updatedInfo = await restaurantInfoService.updateRestaurantInfo(restaurantId, parseResult.data);
      return res.json({ success: true, data: updatedInfo });
    } catch (error: any) {
      console.error('[restaurantInfoController] updateInfo error:', error?.stack || error);
      return res.status(500).json({ success: false, message: "Failed to update restaurant info" });
    }
  },

  /**
   * GET /restaurant/:restaurantId/business-hours
   * Get business hours for a restaurant
   * Public endpoint
   */
  async getBusinessHours(req: Request, res: Response) {
    const { restaurantId } = req.params;

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "Restaurant ID is required" });
    }

    try {
      const hours = await restaurantInfoService.getBusinessHours(restaurantId);
      return res.json({ success: true, data: hours });
    } catch (error: any) {
      console.error('[restaurantInfoController] getBusinessHours error:', error?.stack || error);
      return res.status(500).json({ success: false, message: "Failed to fetch business hours" });
    }
  },

  /**
   * POST /restaurant/:restaurantId/business-hours
   * Create/Update business hours for all days
   * Only restaurant owner can update
   */
  async createBusinessHours(req: Request, res: Response) {
    const { restaurantId } = req.params;
    const userId = (req as any).userId; // From auth middleware

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "Restaurant ID is required" });
    }

    // // Check ownership
    // if (userId !== restaurantId) {
    //   return res.status(403).json({ success: false, message: "You can only update your own restaurant" });
    // }

    const parseResult = createBusinessHoursSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, message: "Invalid request body", errors: parseResult.error.flatten() });
    }
    // Custom business hours validation
    const validationErrors = validateBusinessHours(parseResult.data);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: "Business hours validation failed", errors: validationErrors });
    }
    try {
      const hours = await restaurantInfoService.createBusinessHours(restaurantId, parseResult.data);
      return res.status(201).json({ success: true, data: hours });
    } catch (error: any) {
      console.error('[restaurantInfoController] createBusinessHours error:', error?.stack || error);
      return res.status(500).json({ success: false, message: "Failed to create business hours" });
    }
  },

  /**
   * PATCH /restaurant/:restaurantId/business-hours/:dayOfWeek
   * Update business hours for a specific day
   * Only restaurant owner can update
   */
  async updateBusinessHoursForDay(req: Request, res: Response) {
    const { restaurantId, dayOfWeek } = req.params;
    const userId = (req as any).userId; // From auth middleware

    if (!restaurantId || !dayOfWeek) {
      return res.status(400).json({ success: false, message: "Restaurant ID and day of week are required" });
    }

    // // Check ownership
    // if (userId !== restaurantId) {
    //   return res.status(403).json({ success: false, message: "You can only update your own restaurant" });
    // }

    const parseResult = updateBusinessHoursSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({ success: false, message: "Invalid request body", errors: parseResult.error.flatten() });
    }

    try {
      const hour = await restaurantInfoService.updateBusinessHoursForDay(restaurantId, dayOfWeek.toUpperCase(), parseResult.data);
      return res.json({ success: true, data: hour });
    } catch (error: any) {
      console.error('[restaurantInfoController] updateBusinessHoursForDay error:', error?.stack || error);
      if (error.code === "P2025") {
        return res.status(404).json({ success: false, message: "Business hours for this day not found" });
      }
      return res.status(500).json({ success: false, message: "Failed to update business hours" });
    }
  },

  /**
   * DELETE /restaurant/:restaurantId/business-hours/:dayOfWeek
   * Delete business hours for a specific day
   * Only restaurant owner can delete
   */
  async deleteBusinessHoursForDay(req: Request, res: Response) {
    const { restaurantId, dayOfWeek } = req.params;
    const userId = (req as any).userId; // From auth middleware

    if (!restaurantId || !dayOfWeek) {
      return res.status(400).json({ success: false, message: "Restaurant ID and day of week are required" });
    }

    // // Check ownership
    // if (userId !== restaurantId) {
    //   return res.status(403).json({ success: false, message: "You can only delete your own restaurant data" });
    // }

    try {
      const result = await restaurantInfoService.deleteBusinessHoursForDay(restaurantId, dayOfWeek.toUpperCase());
      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[restaurantInfoController] deleteBusinessHoursForDay error:', error?.stack || error);
      if (error.code === "P2025") {
        return res.status(404).json({ success: false, message: "Business hours for this day not found" });
      }
      return res.status(500).json({ success: false, message: "Failed to delete business hours" });
    }
  },

  /**
   * DELETE /restaurant/:restaurantId/business-hours
   * Delete all business hours for a restaurant
   * Only restaurant owner can delete
   */
  async deleteAllBusinessHours(req: Request, res: Response) {
    const { restaurantId } = req.params;
    const userId = (req as any).userId; // From auth middleware

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "Restaurant ID is required" });
    }

    // // Check ownership
    // if (userId !== restaurantId) {
    //   return res.status(403).json({ success: false, message: "You can only delete your own restaurant data" });
    // }

    try {
      const result = await restaurantInfoService.deleteAllBusinessHours(restaurantId);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[restaurantInfoController] deleteAllBusinessHours error:', error?.stack || error);
      return res.status(500).json({ success: false, message: "Failed to delete business hours" });
    }
  },
};

export default restaurantInfoController;
