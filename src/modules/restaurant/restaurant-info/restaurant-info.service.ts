import prisma from "../../../config/prisma";
import { RestaurantInfoInput, CreateBusinessHoursInput, UpdateBusinessHoursInput, BusinessDayInput, TimeSlotInput } from "./restaurant-info.schema";

export const restaurantInfoService = {
  /**
   * Get restaurant information with business hours
   * Public endpoint - anyone can view
   */
  async getRestaurantInfo(restaurantId: string) {
    try {
      const restaurant = await prisma.restaurant.findUnique({
        where: { userId: restaurantId },
        select: {
          userId: true,
          name: true,
          address: true,
          phoneNumber: true,
          businessDays: {
            include: { timeSlots: true },
          },
        },
      });

      if (!restaurant) return null;

      // Map businessDays to response shape
      const businessHours = (restaurant.businessDays || []).map((d: any) => ({
        dayOfWeek: d.day,
        isClosed: d.isClosed,
        timeSlots: (d.timeSlots || []).map((s: any) => ({
          slotType: s.slotType,
          openTime: s.openTime,
          closeTime: s.closeTime,
        })),
      }));

      return {
        name: restaurant.name,
        address: restaurant.address || null,
        phoneNumber: restaurant.phoneNumber || null,
        businessHours,
      };
    } catch (err) {
      console.error('[restaurantInfoService] getRestaurantInfo error:', (err as any)?.stack || err, { restaurantId });
      throw err;
    }
  },

  /**
   * Update restaurant personal information
   * Only restaurant owner can update
   */
  async updateRestaurantInfo(restaurantId: string, data: RestaurantInfoInput) {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];

      // Only update fields that are provided and not empty
      if (data.address !== undefined && data.address !== null && data.address.trim() !== "") {
        setClauses.push(`"address" = $${setClauses.length + 1}`);
        values.push(data.address);
      }
      if (data.phoneNumber !== undefined && data.phoneNumber !== null && data.phoneNumber.trim() !== "") {
        setClauses.push(`"phoneNumber" = $${setClauses.length + 1}`);
        values.push(data.phoneNumber);
      }
      if (data.estimatedDeliveryTime !== undefined && data.estimatedDeliveryTime !== null && data.estimatedDeliveryTime.trim() !== "") {
        setClauses.push(`"estimatedDeliveryTime" = $${setClauses.length + 1}`);
        values.push(data.estimatedDeliveryTime);
      }

      if (setClauses.length === 0) {
        return this.getRestaurantInfo(restaurantId);
      }

      // Add updatedAt to the SET clause
      setClauses.push(`"updatedAt" = NOW()`);
      values.push(restaurantId);

      const query = `UPDATE "Restaurant" SET ${setClauses.join(', ')} WHERE "userId" = $${values.length}`;
      
      await (prisma as any).$executeRawUnsafe(query, ...values);

      return this.getRestaurantInfo(restaurantId);
    } catch (err) {
      console.error('[restaurantInfoService] updateRestaurantInfo error:', (err as any)?.stack || err, { restaurantId });
      throw err;
    }
  },

  /**
   * Get all business hours for a restaurant
   */
  async getBusinessHours(restaurantId: string) {
    try {
      const days = await prisma.businessDay.findMany({
        where: { restaurantId },
        include: { timeSlots: true },
      });

      // Sort by conventional order MONDAY..SUNDAY
      const order = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];
      days.sort((a: any,b: any) => order.indexOf(a.day) - order.indexOf(b.day));

      return (days || []).map((d: any) => ({
        dayOfWeek: d.day,
        isClosed: d.isClosed,
        timeSlots: (d.timeSlots || []).map((s: any) => ({
          slotType: s.slotType,
          openTime: s.openTime,
          closeTime: s.closeTime,
        })),
      }));
    } catch (err) {
      console.error('[restaurantInfoService] getBusinessHours error:', (err as any)?.stack || err, { restaurantId });
      throw err;
    }
  },

  /**
   * Create business hours for multiple days
   */
  async createBusinessHours(restaurantId: string, hours: CreateBusinessHoursInput) {
    try {
      // Replace all business days/slots atomically
      await prisma.$transaction(async (tx) => {
        await tx.businessDay.deleteMany({ where: { restaurantId } });

        for (const d of hours) {
          const created = await tx.businessDay.create({
            data: {
              restaurantId,
              day: d.dayOfWeek,
              isClosed: d.isClosed ?? false,
              timeSlots: {
                create: (d.timeSlots || []).map((s: any) => ({
                  slotType: s.slotType,
                  openTime: s.openTime,
                  closeTime: s.closeTime,
                })),
              },
            },
          });
        }
      });

      return this.getBusinessHours(restaurantId);
    } catch (err) {
      console.error('[restaurantInfoService] createBusinessHours error:', (err as any)?.stack || err, { restaurantId });
      throw err;
    }
  },

  /**
   * Update business hours for a specific day
   */
  async updateBusinessHoursForDay(
    restaurantId: string,
    dayOfWeek: string,
    data: UpdateBusinessHoursInput
  ) {
    try {
      // Upsert business day and manage its time slots
      const day = dayOfWeek.toUpperCase() as any;

      // Find existing day
      const existing = await prisma.businessDay.findFirst({ where: { restaurantId, day } });

      if (!existing) {
        // Create new business day
        const created = await prisma.businessDay.create({
          data: {
            restaurantId,
            day,
            isClosed: data.isClosed ?? false,
            timeSlots: {
              create: (data.timeSlots || []).map((s: any) => ({
                slotType: s.slotType,
                openTime: s.openTime,
                closeTime: s.closeTime,
              })),
            },
          },
          include: { timeSlots: true },
        });

        return {
          dayOfWeek: created.day,
          isClosed: created.isClosed,
          timeSlots: (created.timeSlots || []).map((s: any) => ({ slotType: s.slotType, openTime: s.openTime, closeTime: s.closeTime })),
        };
      }

      // Update fields
      const updated = await prisma.$transaction(async (tx) => {
        if (data.isClosed !== undefined) {
          await tx.businessDay.update({ where: { id: existing.id }, data: { isClosed: data.isClosed } });
        }

        if (data.timeSlots) {
          // Replace time slots
          await tx.businessTimeSlot.deleteMany({ where: { businessDayId: existing.id } });
          if (data.timeSlots.length > 0) {
            await tx.businessTimeSlot.createMany({
              data: data.timeSlots.map((s: any) => ({ businessDayId: existing.id, slotType: s.slotType, openTime: s.openTime, closeTime: s.closeTime })),
            });
          }
        }

        const refreshed = await tx.businessDay.findUnique({ where: { id: existing.id }, include: { timeSlots: true } });
        return refreshed;
      });

      return {
        dayOfWeek: updated?.day,
        isClosed: updated?.isClosed,
        timeSlots: (updated?.timeSlots || []).map((s: any) => ({ slotType: s.slotType, openTime: s.openTime, closeTime: s.closeTime })),
      };
    } catch (err) {
      console.error('[restaurantInfoService] updateBusinessHoursForDay error:', (err as any)?.stack || err, {
        restaurantId,
        dayOfWeek,
      });
      throw err;
    }
  },

  /**
   * Delete business hours for a specific day
   */
  async deleteBusinessHoursForDay(restaurantId: string, dayOfWeek: string) {
    try {
      const result = await prisma.businessDay.deleteMany({ where: { restaurantId, day: dayOfWeek.toUpperCase() as any } });

      if (!result || result.count === 0) {
        throw new Error('Business hours not found');
      }

      return { success: true, message: `Business hours for ${dayOfWeek} deleted` };
    } catch (err) {
      console.error('[restaurantInfoService] deleteBusinessHoursForDay error:', (err as any)?.stack || err, {
        restaurantId,
        dayOfWeek,
      });
      throw err;
    }
  },

  /**
   * Delete all business hours for a restaurant
   */
  async deleteAllBusinessHours(restaurantId: string) {
    try {
      await prisma.businessDay.deleteMany({ where: { restaurantId } });

      return { success: true, message: `Deleted business hour records` };
    } catch (err) {
      console.error('[restaurantInfoService] deleteAllBusinessHours error:', (err as any)?.stack || err, { restaurantId });
      throw err;
    }
  },
};

export default restaurantInfoService;
