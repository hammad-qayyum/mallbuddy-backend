import prisma from "../../config/prisma";
import { RestaurantInfoInput, CreateBusinessHoursInput, UpdateBusinessHoursInput } from "./restaurant-info.schema";
import { randomUUID } from "crypto";

export const restaurantInfoService = {
  /**
   * Get restaurant information with business hours
   * Public endpoint - anyone can view
   */
  async getRestaurantInfo(restaurantId: string) {
    try {
      const restaurant = (await (prisma as any).$queryRaw`
        SELECT r."userId", r."name", r."address", r."phoneNumber"
        FROM "Restaurant" r
        WHERE r."userId" = ${restaurantId}
      `) as any[];

      if (!restaurant || restaurant.length === 0) return null;

      const r = restaurant[0];

      const businessHours = await (prisma as any).$queryRaw`
        SELECT "dayOfWeek", "openTime", "closeTime", "isClosed"
        FROM "BusinessHours"
        WHERE "restaurantId" = ${restaurantId}
        ORDER BY 
          CASE 
            WHEN "dayOfWeek" = 'MONDAY' THEN 1
            WHEN "dayOfWeek" = 'TUESDAY' THEN 2
            WHEN "dayOfWeek" = 'WEDNESDAY' THEN 3
            WHEN "dayOfWeek" = 'THURSDAY' THEN 4
            WHEN "dayOfWeek" = 'FRIDAY' THEN 5
            WHEN "dayOfWeek" = 'SATURDAY' THEN 6
            WHEN "dayOfWeek" = 'SUNDAY' THEN 7
          END
      ` as any[];

      return {
        name: r.name,
        address: r.address || null,
        phoneNumber: r.phoneNumber || null,
        businessHours: (businessHours || []).map((h: any) => ({
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isClosed: h.isClosed,
        })),
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

      if (data.address !== undefined) {
        setClauses.push(`"address" = $${setClauses.length + 1}`);
        values.push(data.address);
      }
      if (data.phoneNumber !== undefined) {
        setClauses.push(`"phoneNumber" = $${setClauses.length + 1}`);
        values.push(data.phoneNumber);
      }
      if (data.estimatedDeliveryTime !== undefined) {
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
      const businessHours = await (prisma as any).$queryRaw`
        SELECT "dayOfWeek", "openTime", "closeTime", "isClosed"
        FROM "BusinessHours"
        WHERE "restaurantId" = ${restaurantId}
        ORDER BY 
          CASE 
            WHEN "dayOfWeek" = 'MONDAY' THEN 1
            WHEN "dayOfWeek" = 'TUESDAY' THEN 2
            WHEN "dayOfWeek" = 'WEDNESDAY' THEN 3
            WHEN "dayOfWeek" = 'THURSDAY' THEN 4
            WHEN "dayOfWeek" = 'FRIDAY' THEN 5
            WHEN "dayOfWeek" = 'SATURDAY' THEN 6
            WHEN "dayOfWeek" = 'SUNDAY' THEN 7
          END
      ` as any[];

      return (businessHours || []).map((h: any) => ({
        dayOfWeek: h.dayOfWeek,
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: h.isClosed,
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
      // Delete existing hours first
      await (prisma as any).$executeRaw`
        DELETE FROM "BusinessHours" WHERE "restaurantId" = ${restaurantId}
      `;

      // Create new hours
      for (const h of hours) {
        await (prisma as any).$executeRaw`
          INSERT INTO "BusinessHours" (id, "restaurantId", "dayOfWeek", "openTime", "closeTime", "isClosed", "createdAt", "updatedAt")
          VALUES (${randomUUID()}, ${restaurantId}, ${h.dayOfWeek}, ${h.openTime}, ${h.closeTime}, ${h.isClosed}, NOW(), NOW())
        `;
      }

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
      const setClauses: string[] = [];
      const values: any[] = [];

      if (data.openTime !== undefined) {
        setClauses.push(`"openTime" = $${setClauses.length + 1}`);
        values.push(data.openTime);
      }
      if (data.closeTime !== undefined) {
        setClauses.push(`"closeTime" = $${setClauses.length + 1}`);
        values.push(data.closeTime);
      }
      if (data.isClosed !== undefined) {
        setClauses.push(`"isClosed" = $${setClauses.length + 1}`);
        values.push(data.isClosed);
      }

      if (setClauses.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(restaurantId);
      values.push(dayOfWeek);

      const result = await (prisma as any).$executeRawUnsafe(
        `UPDATE "BusinessHours" SET ${setClauses.join(', ')}, "updatedAt" = NOW() WHERE "restaurantId" = $${values.length - 1} AND "dayOfWeek" = $${values.length}`,
        ...values
      );

      if (result === 0) {
        throw new Error('Business hours not found');
      }

      // Fetch updated record
      const updated = await (prisma as any).$queryRaw`
        SELECT "dayOfWeek", "openTime", "closeTime", "isClosed"
        FROM "BusinessHours"
        WHERE "restaurantId" = ${restaurantId} AND "dayOfWeek" = ${dayOfWeek}
        LIMIT 1
      ` as any[];

      if (!updated || updated.length === 0) {
        throw new Error('Business hours not found');
      }

      return {
        dayOfWeek: updated[0].dayOfWeek,
        openTime: updated[0].openTime,
        closeTime: updated[0].closeTime,
        isClosed: updated[0].isClosed,
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
      const result = await (prisma as any).$executeRaw`
        DELETE FROM "BusinessHours"
        WHERE "restaurantId" = ${restaurantId} AND "dayOfWeek" = ${dayOfWeek}
      `;

      if (!result) {
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
      await (prisma as any).$executeRaw`
        DELETE FROM "BusinessHours"
        WHERE "restaurantId" = ${restaurantId}
      `;

      return { success: true, message: `Deleted business hour records` };
    } catch (err) {
      console.error('[restaurantInfoService] deleteAllBusinessHours error:', (err as any)?.stack || err, { restaurantId });
      throw err;
    }
  },
};

export default restaurantInfoService;
