import prisma from "../../../config/prisma";

// GAP-018 — mall scoping. `scopeMallId` is null/undefined for the global
// super admin (unscoped) and the managed mall id for MALL_ADMIN. Cross-mall
// object access fails with "Restaurant not found" (404 semantics) so probing
// doesn't disclose existence.
export const restaurantAdminService = {
  // Set restaurant block status (ACTIVE/BLOCKED)
  async setRestaurantBlockStatus(
    restaurantId: string,
    isBlocked: boolean,
    reason?: string,
    actionById?: string,
    scopeMallId?: string | null
  ) {
    const status = isBlocked ? 'BLOCKED' : 'ACTIVE';

    // Update restaurant status and create history entry in a transaction
    return prisma.$transaction(async (tx) => {
      if (scopeMallId) {
        const target = await tx.restaurant.findUnique({
          where: { userId: restaurantId },
          select: { mallId: true },
        });
        if (!target || target.mallId !== scopeMallId) {
          throw new Error('Restaurant not found');
        }
      }

      const restaurant = await tx.restaurant.update({
        where: { userId: restaurantId },
        data: { RestaurantStatus: status },
      });

      // Create status history entry
      await tx.restaurantStatusHistory.create({
        data: {
          restaurantId: restaurantId,
          status: status as any,
          ...(reason && { reason }),
          ...(actionById && { actionById }),
        },
      });

      return restaurant;
    });
  },

  // Set restaurant approval status (PENDING/APPROVED/REJECTED)
  async setRestaurantApprovalStatus(
    restaurantId: string,
    approvalStatus: string,
    reason?: string,
    actionById?: string,
    scopeMallId?: string | null
  ) {
    // Update approval status and create history entry in a transaction
    return prisma.$transaction(async (tx) => {
      // Get current restaurant status to log in history
      const restaurant = await tx.restaurant.findUnique({
        where: { userId: restaurantId },
        select: { RestaurantStatus: true, mallId: true },
      });

      if (!restaurant || (scopeMallId && restaurant.mallId !== scopeMallId)) {
        throw new Error('Restaurant not found');
      }

      const updatedRestaurant = await tx.restaurant.update({
        where: { userId: restaurantId },
        data: { approvalStatus: approvalStatus as any },
      });

      // Create status history entry with current RestaurantStatus
      await tx.restaurantStatusHistory.create({
        data: {
          restaurantId: restaurantId,
          status: restaurant.RestaurantStatus as any,
          ...(reason && { reason: `Approval: ${approvalStatus}${reason ? ' - ' + reason : ''}` }),
          ...(actionById && { actionById }),
        },
      });

      return updatedRestaurant;
    });
  },

  // Get all active restaurants
  async getActiveRestaurants(scopeMallId?: string | null) {
    return prisma.restaurant.findMany({
      where: {
        RestaurantStatus: 'ACTIVE',
        ...(scopeMallId && { mallId: scopeMallId }),
      },
    });
  },

  // Get all blocked restaurants
  async getBlockedRestaurants(scopeMallId?: string | null) {
    return prisma.restaurant.findMany({
      where: {
        RestaurantStatus: 'BLOCKED',
        ...(scopeMallId && { mallId: scopeMallId }),
      },
    });
  },

  // Search restaurants by name
  async searchRestaurants(searchTerm: string, scopeMallId?: string | null) {
    return prisma.restaurant.findMany({
      where: {
        name: {
          contains: searchTerm,
          mode: 'insensitive',
        },
        ...(scopeMallId && { mallId: scopeMallId }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },
};
