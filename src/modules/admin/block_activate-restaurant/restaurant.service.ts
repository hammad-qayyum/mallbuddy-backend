import prisma from "../../../config/prisma";

export const restaurantAdminService = {
  // Set restaurant block status (ACTIVE/BLOCKED)
  async setRestaurantBlockStatus(
    restaurantId: string, 
    isBlocked: boolean, 
    reason?: string, 
    actionById?: string
  ) {
    const status = isBlocked ? 'BLOCKED' : 'ACTIVE';
    
    // Update restaurant status and create history entry in a transaction
    return prisma.$transaction(async (tx) => {
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
    actionById?: string
  ) {
    // Update approval status and create history entry in a transaction
    return prisma.$transaction(async (tx) => {
      // Get current restaurant status to log in history
      const restaurant = await tx.restaurant.findUnique({
        where: { userId: restaurantId },
        select: { RestaurantStatus: true },
      });

      if (!restaurant) {
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
  async getActiveRestaurants() {
    return prisma.restaurant.findMany({
      where: { RestaurantStatus: 'ACTIVE' },
    });
  },

  // Get all blocked restaurants
  async getBlockedRestaurants() {
    return prisma.restaurant.findMany({
      where: { RestaurantStatus: 'BLOCKED' },
    });
  },

  // Search restaurants by name
  async searchRestaurants(searchTerm: string) {
    return prisma.restaurant.findMany({
      where: {
        name: {
          contains: searchTerm,
          mode: 'insensitive',
        },
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
