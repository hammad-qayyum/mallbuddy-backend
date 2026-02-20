import { Router } from "express";
import { favouriteCartController } from "./favourite-cart.controller";
import { requireAuth, requireUserRole } from "../../middlewares/role.middleware";

const router = Router();

// Apply user role to all favourite cart routes (requireAuth is applied globally)
router.use(requireUserRole);

/**
 * @swagger
 * /favourite-carts/favourite-cart/create:
 *   post:
 *     summary: Create a new favourite cart
 *     tags: [Favourite Cart]
 *     description: |
 *       Create a new favourite cart to save favorite orders for quick reordering.
 *       **Required fields:** name
 *       **Optional fields:** description
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               name:
 *                 type: string
 *                 description: Name of the favourite cart
 *                 example: "My Daily Order"
 *               description:
 *                 type: string
 *                 description: Optional description
 *                 example: "My regular breakfast order"
 *     responses:
 *       201:
 *         description: Favourite cart created successfully
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post("/favourite-cart/create", favouriteCartController.createFavouriteCart);

/**
 * @swagger
 * /favourite-carts/favourite-cart/get-all:
 *   get:
 *     summary: Get all favourite carts for user
 *     tags: [Favourite Cart]
 *     description: |
 *       Retrieve all saved favourite carts for a user.
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
 *         description: Favourite carts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   userId:
 *                     type: string
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   items:
 *                     type: array
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       400:
 *         description: User ID is required
 *       500:
 *         description: Server error
 */
router.get("/favourite-cart/get-all", favouriteCartController.getFavouriteCarts);

/**
 * @swagger
 * /favourite-carts/favourite-cart/get/{favouriteCartId}:
 *   get:
 *     summary: Get a single favourite cart
 *     tags: [Favourite Cart]
 *     description: |
 *       Retrieve a specific favourite cart with all items.
 *       **No request body required.**
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: path
 *         name: favouriteCartId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Favourite cart ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Favourite cart retrieved successfully
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: Favourite cart not found
 *       500:
 *         description: Server error
 */
router.get("/favourite-cart/get/:favouriteCartId", favouriteCartController.getFavouriteCart);

/**
 * @swagger
 * /favourite-carts/favourite-cart/update/{favouriteCartId}:
 *   put:
 *     summary: Update favourite cart
 *     tags: [Favourite Cart]
 *     description: |
 *       Update favourite cart name and description. All fields are optional.
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: path
 *         name: favouriteCartId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Favourite cart ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Updated name
 *                 example: "Updated Name"
 *               description:
 *                 type: string
 *                 description: Updated description
 *                 example: "Updated description"
 *     responses:
 *       200:
 *         description: Favourite cart updated successfully
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Favourite cart not found
 *       500:
 *         description: Server error
 */
router.put("/favourite-cart/update/:favouriteCartId", favouriteCartController.updateFavouriteCart);

/**
 * @swagger
 * /favourite-carts/{favouriteCartId}:
 *   delete:
 *     summary: Delete a favourite cart
 *     tags: [Favourite Cart]
 *     description: Delete a favourite cart and all its items
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: path
 *         name: favouriteCartId
 *         required: true
 *         schema:
 *           type: string
 *         description: Favourite cart ID
 *     responses:
 *       200:
 *         description: Favourite cart deleted successfully
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: Favourite cart not found
 *       500:
 *         description: Server error
 */
/**
 * @swagger
 * /favourite-carts/favourite-cart/delete/{favouriteCartId}:
 *   delete:
 *     summary: Delete a favourite cart
 *     tags: [Favourite Cart]
 *     description: |
 *       Delete a favourite cart and all its items.
 *       **No request body required.**
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: path
 *         name: favouriteCartId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Favourite cart ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Favourite cart deleted successfully
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: Favourite cart not found
 *       500:
 *         description: Server error
 */
router.delete("/favourite-cart/delete/:favouriteCartId", favouriteCartController.deleteFavouriteCart);

/**
 * @swagger
 * /favourite-carts/favourite-cart/{favouriteCartId}/item/add:
 *   post:
 *     summary: Add item to favourite cart
 *     tags: [Favourite Cart]
 *     description: |
 *       Add a menu item to a favourite cart. If the item already exists with the same variations and add-ons,
 *       the quantity will be increased. Otherwise, a new item will be created.
 *       **Required fields:** menuItemId, restaurantId
 *       **Optional fields:** quantity (default: 1), specialNotes, selectedVariations, selectedAddOns
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: path
 *         name: favouriteCartId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Favourite cart ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - menuItemId
 *               - restaurantId
 *             properties:
 *               menuItemId:
 *                 type: string
 *                 format: uuid
 *                 description: Menu item ID
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               restaurantId:
 *                 type: string
 *                 format: uuid
 *                 description: Restaurant ID (User ID of restaurant)
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               quantity:
 *                 type: integer
 *                 description: Quantity of items
 *                 default: 1
 *                 example: 1
 *               specialNotes:
 *                 type: string
 *                 description: Special requests or notes
 *                 example: "Extra spicy"
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
 *         description: Item added to favourite cart successfully
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Favourite cart, menu item, or restaurant not found
 *       500:
 *         description: Server error
 */
router.post("/favourite-cart/:favouriteCartId/item/add", favouriteCartController.addToFavouriteCart);

/**
 * @swagger
 * /favourite-carts/favourite-cart/{favouriteCartId}/item/update/{itemId}:
 *   put:
 *     summary: Update favourite cart item
 *     tags: [Favourite Cart]
 *     description: |
 *       Update quantity and special notes of an item in favourite cart.
 *       All fields are optional.
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: path
 *         name: favouriteCartId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Favourite cart ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Item ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
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
 *         description: Item updated successfully
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Favourite cart or item not found
 *       500:
 *         description: Server error
 */
router.put("/favourite-cart/:favouriteCartId/item/update/:itemId", favouriteCartController.updateFavouriteCartItem);

/**
 * @swagger
 * /favourite-carts/favourite-cart/{favouriteCartId}/item/delete/{itemId}:
 *   delete:
 *     summary: Remove item from favourite cart
 *     tags: [Favourite Cart]
 *     description: |
 *       Remove a specific item from favourite cart.
 *       **No request body required.**
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: path
 *         name: favouriteCartId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Favourite cart ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Item ID to remove
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Item removed successfully
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: Favourite cart or item not found
 *       500:
 *         description: Server error
 */
router.delete("/favourite-cart/:favouriteCartId/item/delete/:itemId", favouriteCartController.removeFromFavouriteCart);

/**
 * @swagger
 * /favourite-carts/favourite-cart/{favouriteCartId}/restore:
 *   post:
 *     summary: Restore favourite cart to current cart
 *     tags: [Favourite Cart]
 *     description: |
 *       Add all items from favourite cart to user's current shopping cart.
 *       **Optional field:** replaceCurrent (default: false)
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: path
 *         name: favouriteCartId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Favourite cart ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               replaceCurrent:
 *                 type: boolean
 *                 description: If true, clear current cart before adding. If false, add to current cart
 *                 default: false
 *                 example: false
 *     responses:
 *       200:
 *         description: Favourite cart restored successfully
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Favourite cart not found
 *       500:
 *         description: Server error
 */
router.post("/favourite-cart/:favouriteCartId/restore", favouriteCartController.restoreFavouriteCart);

/**
 * @swagger
 * /favourite-carts/favourite-cart/{favouriteCartId}/summary:
 *   get:
 *     summary: Get favourite cart summary
 *     tags: [Favourite Cart]
 *     description: |
 *       Get summary of favourite cart with total price grouped by restaurant.
 *       **No request body required.**
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: path
 *         name: favouriteCartId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Favourite cart ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Cart summary retrieved successfully
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: Favourite cart not found
 *       500:
 *         description: Server error
 */
router.get("/favourite-cart/:favouriteCartId/summary", favouriteCartController.getFavouriteCartSummary);

export default router;
