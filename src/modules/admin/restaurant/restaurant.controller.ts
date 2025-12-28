import { Request, Response } from "express";
import { restaurantAdminService } from "./restaurant.service";

export const restaurantAdminController = {
  // Admin: Block/unblock restaurant
  async setRestaurantBlockStatus(req: Request, res: Response) {
    const { restaurantId } = req.params as { restaurantId: string };
    const { isBlocked, reason, actionById } = req.body;
    
    if (typeof isBlocked !== 'boolean') {
      return res.status(400).json({ message: 'isBlocked must be boolean' });
    }
    
    try {
      const restaurant = await restaurantAdminService.setRestaurantBlockStatus(
        restaurantId, 
        isBlocked, 
        reason, 
        actionById
      );
      return res.json({ 
        message: isBlocked ? 'Restaurant blocked' : 'Restaurant unblocked', 
        restaurant 
      });
    } catch (err: any) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
  },

  // Admin: Set restaurant approval status
  async setRestaurantApprovalStatus(req: Request, res: Response) {
    const { restaurantId } = req.params as { restaurantId: string };
    const { approvalStatus, reason, actionById } = req.body;
    
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(approvalStatus)) {
      return res.status(400).json({ message: 'Invalid approvalStatus' });
    }
    
    try {
      const restaurant = await restaurantAdminService.setRestaurantApprovalStatus(
        restaurantId, 
        approvalStatus, 
        reason, 
        actionById
      );
      return res.json({ 
        message: `Restaurant status set to ${approvalStatus}`, 
        restaurant 
      });
    } catch (err: any) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
  },

  // Get all active restaurants
  async getActiveRestaurants(req: Request, res: Response) {
    try {
      const restaurants = await restaurantAdminService.getActiveRestaurants();
      return res.json(restaurants);
    } catch (err: any) {
      return res.status(500).json({ message: 'Failed to fetch active restaurants' });
    }
  },

  // Get all blocked restaurants
  async getBlockedRestaurants(req: Request, res: Response) {
    try {
      const restaurants = await restaurantAdminService.getBlockedRestaurants();
      return res.json(restaurants);
    } catch (err: any) {
      return res.status(500).json({ message: 'Failed to fetch blocked restaurants' });
    }
  },
};
