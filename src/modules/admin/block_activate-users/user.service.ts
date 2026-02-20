import prisma from "../../../config/prisma";

export const userAdminService = {
  // Set user status (ACTIVE/BLOCKED)
  async setUserStatus(
    userId: string, 
    status: 'ACTIVE' | 'BLOCKED', 
    reason?: string, 
    actionById?: string
  ) {
    // Update user status and create history entry in a transaction
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { Status: status },
      });

      // Create status history entry
      await tx.userStatusHistory.create({
        data: {
          userId: userId,
          status: status as any,
          ...(reason && { reason }),
          ...(actionById && { actionById }),
        },
      });

      return user;
    });
  },

  // Get all active users
  async getActiveUsers() {
    const users = await prisma.user.findMany({
      where: { Status: 'ACTIVE' },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        role: true,
        Status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return users;
  },

  // Get all blocked users
  async getBlockedUsers() {
    const users = await prisma.user.findMany({
      where: { Status: 'BLOCKED' },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        role: true,
        Status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return users;
  },

  // Search users by name, username, or email
  async searchUsers(searchTerm: string) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            name: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            firstName: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        role: true,
        Status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return users;
  },
};
