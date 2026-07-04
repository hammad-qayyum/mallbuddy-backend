import prisma from "../../../config/prisma";

// GAP-018 — mall scoping. `scopeMallId` is null/undefined for the global
// super admin (unscoped) and the managed mall id for MALL_ADMIN. Customers
// are linked to a mall only via `selectedMallId`, so that is the scoping
// key; scoped views also pin `role: 'USER'` so a mall admin can never see
// or act on admins, mall admins, or restaurant accounts.
const scopedUserWhere = (scopeMallId?: string | null) =>
  scopeMallId ? { role: "USER" as const, selectedMallId: scopeMallId } : {};

const USER_LIST_SELECT = {
  id: true,
  email: true,
  phoneNumber: true,
  name: true,
  firstName: true,
  lastName: true,
  role: true,
  Status: true,
  createdAt: true,
  // The customer's currently selected mall (shown as a column in the admin
  // User Management screen; also what mall-scoping keys off).
  mall: { select: { id: true, name: true } },
} as const;

export const userAdminService = {
  // Set user status (ACTIVE/BLOCKED)
  async setUserStatus(
    userId: string,
    status: 'ACTIVE' | 'BLOCKED',
    reason?: string,
    actionById?: string,
    scopeMallId?: string | null
  ) {
    // Update user status and create history entry in a transaction
    return prisma.$transaction(async (tx) => {
      if (scopeMallId) {
        // A mall admin may only act on USER accounts of their own mall.
        // 404 (not 403) so cross-mall probing doesn't disclose existence.
        const target = await tx.user.findUnique({
          where: { id: userId },
          select: { role: true, selectedMallId: true },
        });
        if (!target || target.role !== "USER" || target.selectedMallId !== scopeMallId) {
          throw new Error("User not found");
        }
      }

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
  async getActiveUsers(scopeMallId?: string | null) {
    const users = await prisma.user.findMany({
      where: { Status: 'ACTIVE', ...scopedUserWhere(scopeMallId) },
      select: USER_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return users;
  },

  // Get all blocked users
  async getBlockedUsers(scopeMallId?: string | null) {
    const users = await prisma.user.findMany({
      where: { Status: 'BLOCKED', ...scopedUserWhere(scopeMallId) },
      select: USER_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return users;
  },

  // Search users by name, username, or email
  async searchUsers(searchTerm: string, scopeMallId?: string | null) {
    const users = await prisma.user.findMany({
      where: {
        ...scopedUserWhere(scopeMallId),
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
      select: USER_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return users;
  },
};
