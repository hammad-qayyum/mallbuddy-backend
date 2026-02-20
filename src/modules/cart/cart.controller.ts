import { Request, Response } from "express";
import { cartService } from "./cart.service";
import {
  addToCartSchema,
  updateCartItemSchema,
  removeFromCartSchema,
} from "./cart.schema";

export const cartController = {
  // GET /cart - Get user's cart
  async getCart(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const cart = await cartService.getCart(userId);
      return res.json(cart);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  // POST /cart/add - Add item to cart
  async addToCart(req: Request, res: Response) {
    try {
      // Merge userId from query into body if not present in body
      const requestBody = {
        ...req.body,
        userId: req.body.userId || req.query.userId,
      };

      const parseResult = addToCartSchema.safeParse(requestBody);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const { userId, ...cartData } = parseResult.data;
      const cartItem = await cartService.addToCart(userId, cartData);
      return res.status(201).json(cartItem);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // PUT /cart/items/:cartItemId - Update cart item
  async updateCartItem(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;
      const { cartItemId } = req.params;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      if (!cartItemId) {
        return res.status(400).json({ message: "Cart item ID is required" });
      }

      const parseResult = updateCartItemSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const updatedItem = await cartService.updateCartItem(
        userId,
        cartItemId,
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

  // DELETE /cart/items/:cartItemId - Remove item from cart
  async removeFromCart(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;
      const { cartItemId } = req.params;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      if (!cartItemId) {
        return res.status(400).json({ message: "Cart item ID is required" });
      }

      await cartService.removeFromCart(userId, cartItemId);
      return res.status(204).send();
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // DELETE /cart - Clear entire cart
  async clearCart(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const result = await cartService.clearCart(userId);
      return res.json(result);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // GET /cart/summary - Get cart summary (total price, items by restaurant)
  async getCartSummary(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const summary = await cartService.getCartSummary(userId);
      return res.json(summary);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },
};
