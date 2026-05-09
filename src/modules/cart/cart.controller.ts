import { Request, Response } from "express";
import { cartService } from "./cart.service";
import {
  addToCartSchema,
  updateCartItemSchema,
} from "./cart.schema";
import { getAuthUserId } from "../common/utils";

function requireAuthUserId(req: Request, res: Response): string | null {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  return userId;
}

export const cartController = {
  // GET /cart - Get the authenticated user's cart
  async getCart(req: Request, res: Response) {
    try {
      const userId = requireAuthUserId(req, res);
      if (!userId) return;

      const cart = await cartService.getCart(userId);
      return res.json(cart);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  // POST /cart/add - Add item to cart (always to the authenticated user's cart)
  async addToCart(req: Request, res: Response) {
    try {
      const userId = requireAuthUserId(req, res);
      if (!userId) return;

      const parseResult = addToCartSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const cartItem = await cartService.addToCart(userId, parseResult.data);
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
      const userId = requireAuthUserId(req, res);
      if (!userId) return;

      const { cartItemId } = req.params;
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
      const userId = requireAuthUserId(req, res);
      if (!userId) return;

      const { cartItemId } = req.params;
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
      const userId = requireAuthUserId(req, res);
      if (!userId) return;

      const result = await cartService.clearCart(userId);
      return res.json(result);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // GET /cart/summary - Get cart summary
  async getCartSummary(req: Request, res: Response) {
    try {
      const userId = requireAuthUserId(req, res);
      if (!userId) return;

      const summary = await cartService.getCartSummary(userId);
      return res.json(summary);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },
};
