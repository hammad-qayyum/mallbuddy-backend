import { Request, Response } from "express";
import { userAdminService } from "./user.service";

export const userAdminController = {
  // Admin: Activate user
  async activateUser(req: Request, res: Response) {
    const { userId } = req.params as { userId: string };
    const { reason, actionById } = req.body || {};
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    try {
      const user = await userAdminService.setUserStatus(userId, 'ACTIVE', reason, actionById);
      return res.json({ message: 'User activated', user });
    } catch (err: any) {
      return res.status(404).json({ message: 'User not found' });
    }
  },

  // Admin: Block user
  async blockUser(req: Request, res: Response) {
    const { userId } = req.params as { userId: string };
    const { reason, actionById } = req.body || {};
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    try {
      const user = await userAdminService.setUserStatus(userId, 'BLOCKED', reason, actionById);
      return res.json({ message: 'User blocked', user });
    } catch (err: any) {
      return res.status(404).json({ message: 'User not found' });
    }
  },

  // Admin: Get all active users
  async getActiveUsers(req: Request, res: Response) {
    try {
      const users = await userAdminService.getActiveUsers();
      return res.json({ users, total: users.length });
    } catch (err: any) {
      return res.status(500).json({ message: 'Failed to fetch active users', error: err.message });
    }
  },

  // Admin: Get all blocked users
  async getBlockedUsers(req: Request, res: Response) {
    try {
      const users = await userAdminService.getBlockedUsers();
      return res.json({ users, total: users.length });
    } catch (err: any) {
      return res.status(500).json({ message: 'Failed to fetch blocked users', error: err.message });
    }
  },
};
