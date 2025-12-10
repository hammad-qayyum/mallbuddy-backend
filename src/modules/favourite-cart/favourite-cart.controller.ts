import { Request, Response } from "express";
import { favouriteCartService } from "./favourite-cart.service";
import {
  createFavouriteCartSchema,
  addToFavouriteCartSchema,
  updateFavouriteCartItemSchema,
  updateFavouriteCartSchema,
  restoreFavouriteCartSchema,
} from "./favourite-cart.schema";

export const favouriteCartController = {
  // POST /favourite-carts - Create a new favourite cart
  async createFavouriteCart(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const parseResult = createFavouriteCartSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const favouriteCart = await favouriteCartService.createFavouriteCart(
        userId,
        parseResult.data
      );
      return res.status(201).json(favouriteCart);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // GET /favourite-carts - Get all favourite carts for user
  async getFavouriteCarts(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const favouriteCarts = await favouriteCartService.getFavouriteCarts(userId);
      return res.json(favouriteCarts);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  // GET /favourite-carts/:favouriteCartId - Get a single favourite cart
  async getFavouriteCart(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;
      const { favouriteCartId } = req.params;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      if (!favouriteCartId) {
        return res.status(400).json({ message: "Favourite cart ID is required" });
      }

      const favouriteCart = await favouriteCartService.getFavouriteCart(
        userId,
        favouriteCartId
      );
      return res.json(favouriteCart);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // POST /favourite-carts/:favouriteCartId/items - Add item to favourite cart
  async addToFavouriteCart(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;
      const { favouriteCartId } = req.params;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      if (!favouriteCartId) {
        return res.status(400).json({ message: "Favourite cart ID is required" });
      }

      const parseResult = addToFavouriteCartSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const cartItem = await favouriteCartService.addToFavouriteCart(
        userId,
        favouriteCartId,
        parseResult.data
      );
      return res.status(201).json(cartItem);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // PUT /favourite-carts/:favouriteCartId/items/:itemId - Update favourite cart item
  async updateFavouriteCartItem(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;
      const { favouriteCartId, itemId } = req.params;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      if (!favouriteCartId) {
        return res.status(400).json({ message: "Favourite cart ID is required" });
      }

      if (!itemId) {
        return res.status(400).json({ message: "Item ID is required" });
      }

      const parseResult = updateFavouriteCartItemSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const updatedItem = await favouriteCartService.updateFavouriteCartItem(
        userId,
        favouriteCartId,
        itemId,
        parseResult.data
      );
      return res.json(updatedItem);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // DELETE /favourite-carts/:favouriteCartId/items/:itemId - Remove item from favourite cart
  async removeFromFavouriteCart(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;
      const { favouriteCartId, itemId } = req.params;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      if (!favouriteCartId) {
        return res.status(400).json({ message: "Favourite cart ID is required" });
      }

      if (!itemId) {
        return res.status(400).json({ message: "Item ID is required" });
      }

      const result = await favouriteCartService.removeFromFavouriteCart(
        userId,
        favouriteCartId,
        itemId
      );
      return res.json(result);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // PUT /favourite-carts/:favouriteCartId - Update favourite cart (name and description)
  async updateFavouriteCart(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;
      const { favouriteCartId } = req.params;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      if (!favouriteCartId) {
        return res.status(400).json({ message: "Favourite cart ID is required" });
      }

      const parseResult = updateFavouriteCartSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const updated = await favouriteCartService.updateFavouriteCart(
        userId,
        favouriteCartId,
        parseResult.data
      );
      return res.json(updated);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // DELETE /favourite-carts/:favouriteCartId - Delete a favourite cart
  async deleteFavouriteCart(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;
      const { favouriteCartId } = req.params;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      if (!favouriteCartId) {
        return res.status(400).json({ message: "Favourite cart ID is required" });
      }

      const result = await favouriteCartService.deleteFavouriteCart(userId, favouriteCartId);
      return res.json(result);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // POST /favourite-carts/:favouriteCartId/restore - Restore favourite cart to current cart
  async restoreFavouriteCart(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;
      const { favouriteCartId } = req.params;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      if (!favouriteCartId) {
        return res.status(400).json({ message: "Favourite cart ID is required" });
      }

      const parseResult = restoreFavouriteCartSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const result = await favouriteCartService.restoreFavouriteCartToCart(
        userId,
        favouriteCartId,
        parseResult.data
      );
      return res.json(result);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // GET /favourite-carts/:favouriteCartId/summary - Get favourite cart summary
  async getFavouriteCartSummary(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;
      const { favouriteCartId } = req.params;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      if (!favouriteCartId) {
        return res.status(400).json({ message: "Favourite cart ID is required" });
      }

      const summary = await favouriteCartService.getFavouriteCartSummary(
        userId,
        favouriteCartId
      );
      return res.json(summary);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },
};
