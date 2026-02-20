import { Router } from "express";
import { cartController } from "./cart.controller";
import { requireAuth, requireUserRole } from "../../middlewares/role.middleware";

const router = Router();

// Apply user role to all cart routes (requireAuth is applied globally)
router.use(requireUserRole);

/**
 * @swagger
 * /cart/cart/get:
 *   get:
 *     summary: Get user's cart
 *     tags: [Cart]
 *     description: |
 *       Retrieve the complete cart for a user including all items with details
 *       (menu item info, restaurant details, quantity, special notes)
 *       **No request body required.**
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Cart ID
 *                 userId:
 *                   type: string
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       cartId:
 *                         type: string
 *                       restaurantId:
 *                         type: string
 *                       menuItemId:
 *                         type: string
 *                       quantity:
 *                         type: integer
 *                         example: 1
 *                       specialNotes:
 *                         type: string
 *                         nullable: true
 *                         example: "Extra spicy"
 *                       menuItem:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                             example: "Smoky bacon & halloumi flatbread"
 *                           price:
 *                             type: number
 *                             example: 4.40
 *                           image:
 *                             type: string
 *                             nullable: true
 *                       restaurant:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           mainCategory:
 *                             type: string
 *                           user:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: User ID is required
 *       500:
 *         description: Server error
 */
router.get("/cart/get", cartController.getCart);

/**
 * @swagger
 * /cart/item/add:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     description: |
 *       Add a menu item to the user's cart. If the item already exists in the cart
 *       from the same restaurant with the same variations and add-ons, the quantity will be increased.
 *       Otherwise, a new cart item will be created.
 *       **Required fields:** userId, menuItemId, restaurantId
 *       **Optional fields:** quantity (default: 1), specialNotes, selectedVariations, selectedAddOns
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, menuItemId, restaurantId]
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               menuItemId:
 *                 type: string
 *                 format: uuid
 *                 description: Menu item ID to add
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               restaurantId:
 *                 type: string
 *                 format: uuid
 *                 description: Restaurant ID (user ID of restaurant owner)
 *                 example: "660e8400-e29b-41d4-a716-446655440000"
 *               quantity:
 *                 type: integer
 *                 description: "Quantity to add (default: 1)"
 *                 example: 1
 *               specialNotes:
 *                 type: string
 *                 description: Special notes/requests for this item
 *                 example: "Extra spicy, no onions"
 *               selectedVariations:
 *                 type: array
 *                 description: Selected variation options (e.g., size, crust type)
 *                 items:
 *                   type: object
 *                   required: [variationId, selectedOptionId]
 *                   properties:
 *                     variationId:
 *                       type: string
 *                       format: uuid
 *                       description: Variation ID (e.g., Size variation)
 *                       example: "770e8400-e29b-41d4-a716-446655440000"
 *                     selectedOptionId:
 *                       type: string
 *                       format: uuid
 *                       description: Selected variation option ID (e.g., Large option)
 *                       example: "880e8400-e29b-41d4-a716-446655440000"
 *                 example:
 *                   - variationId: "770e8400-e29b-41d4-a716-446655440000"
 *                     selectedOptionId: "880e8400-e29b-41d4-a716-446655440000"
 *               selectedAddOns:
 *                 type: array
 *                 description: Selected add-on options (e.g., extra toppings, sauces)
 *                 items:
 *                   type: object
 *                   required: [addOnId, selectedOptionIds]
 *                   properties:
 *                     addOnId:
 *                       type: string
 *                       format: uuid
 *                       description: Add-on ID (e.g., Extra Toppings add-on)
 *                       example: "990e8400-e29b-41d4-a716-446655440000"
 *                     selectedOptionIds:
 *                       type: array
 *                       description: Array of selected add-on option IDs
 *                       items:
 *                         type: string
 *                         format: uuid
 *                       example: ["aa0e8400-e29b-41d4-a716-446655440000", "bb0e8400-e29b-41d4-a716-446655440000"]
 *                 example:
 *                   - addOnId: "990e8400-e29b-41d4-a716-446655440000"
 *                     selectedOptionIds: ["aa0e8400-e29b-41d4-a716-446655440000"]
 *     responses:
 *       201:
 *         description: Item added to cart successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 cartId:
 *                   type: string
 *                 menuItemId:
 *                   type: string
 *                 restaurantId:
 *                   type: string
 *                 quantity:
 *                   type: integer
 *                   example: 1
 *                 specialNotes:
 *                   type: string
 *                   nullable: true
 *       400:
 *         description: Invalid request body or missing required fields
 *       404:
 *         description: Menu item or restaurant not found
 *       500:
 *         description: Server error
 */
router.post("/item/add", cartController.addToCart);

/**
 * @swagger
 * /cart/item/update/{cartItemId}:
 *   put:
 *     summary: Update cart item
 *     tags: [Cart]
 *     description: |
 *       Update quantity and/or special notes for a cart item.
 *       At least one of quantity or specialNotes must be provided.
 *     parameters:
 *       - in: path
 *         name: cartItemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Cart item ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID (required for verification)
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               quantity:
 *                 type: integer
 *                 description: New quantity
 *                 example: 2
 *               specialNotes:
 *                 type: string
 *                 description: Updated special notes
 *                 example: "Extra spicy"
 *     responses:
 *       200:
 *         description: Cart item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 quantity:
 *                   type: integer
 *                 specialNotes:
 *                   type: string
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Cart item not found
 *       500:
 *         description: Server error
 */
router.put("/item/update/:cartItemId", cartController.updateCartItem);

/**
 * @swagger
 * /cart/item/delete/{cartItemId}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     description: |
 *       Remove a specific item from the user's cart.
 *     parameters:
 *       - in: path
 *         name: cartItemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Cart item ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID (required for verification)
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       204:
 *         description: Item removed successfully
 *       400:
 *         description: User ID is required
 *       404:
 *         description: Cart item not found
 *       500:
 *         description: Server error
 */
router.delete("/item/delete/:cartItemId", cartController.removeFromCart);

/**
 * @swagger
 * /cart/cart/clear:
 *   delete:
 *     summary: Clear entire cart
 *     tags: [Cart]
 *     description: |
 *       Remove all items from the user's cart.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cart cleared successfully"
 *       400:
 *         description: User ID is required
 *       404:
 *         description: Cart not found
 *       500:
 *         description: Server error
 */
router.delete("/cart/clear", cartController.clearCart);

/**
 * @swagger
 * /cart/cart/summary:
 *   get:
 *     summary: Get cart summary
 *     tags: [Cart]
 *     description: |
 *       Get a summary of the cart including:
 *       - Total item count
 *       - Total price
 *       - Items grouped by restaurant with subtotals
 *       **No request body required.**
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Cart summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cartId:
 *                   type: string
 *                 totalItems:
 *                   type: integer
 *                   example: 3
 *                 totalPrice:
 *                   type: number
 *                   example: 13.20
 *                 restaurants:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       restaurantId:
 *                         type: string
 *                       restaurantName:
 *                         type: string
 *                         example: "Rozna restaurant"
 *                       subtotal:
 *                         type: number
 *                         example: 8.80
 *                       items:
 *                         type: array
 *                         items:
 *                           type: object
 *       400:
 *         description: User ID is required
 *       500:
 *         description: Server error
 */
router.get("/cart/summary", cartController.getCartSummary);

export default router;
