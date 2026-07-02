import { Router } from "express";
import { favouriteMenuItemController } from "./favourite-menu-item.controller";
import { requireUserRole } from "../../middlewares/role.middleware";

const router = Router();

// requireAuth is applied globally; scope these routes to USER role.
router.use(requireUserRole);

/**
 * @swagger
 * /favourite-menu-items:
 *   get:
 *     summary: List the user's favourite menu items (full detail)
 *     tags: [Favourite Menu Items]
 *     responses:
 *       200:
 *         description: Array of favourited menu items
 */
router.get("/", favouriteMenuItemController.getFavourites);

/**
 * @swagger
 * /favourite-menu-items/ids:
 *   get:
 *     summary: List the user's favourited menu-item IDs (lightweight, for heart states)
 *     tags: [Favourite Menu Items]
 *     responses:
 *       200:
 *         description: { menuItemIds: string[] }
 */
router.get("/ids", favouriteMenuItemController.getFavouriteIds);

/**
 * @swagger
 * /favourite-menu-items/toggle:
 *   post:
 *     summary: Toggle a menu item as favourite
 *     tags: [Favourite Menu Items]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [menuItemId]
 *             properties:
 *               menuItemId:
 *                 type: string
 *     responses:
 *       200:
 *         description: { menuItemId, favourited }
 */
router.post("/toggle", favouriteMenuItemController.toggleFavourite);

/**
 * @swagger
 * /favourite-menu-items:
 *   post:
 *     summary: Add a menu item to favourites
 *     tags: [Favourite Menu Items]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [menuItemId]
 *             properties:
 *               menuItemId:
 *                 type: string
 *     responses:
 *       201:
 *         description: { menuItemId, favourited: true }
 */
router.post("/", favouriteMenuItemController.addFavourite);

/**
 * @swagger
 * /favourite-menu-items/{menuItemId}:
 *   delete:
 *     summary: Remove a menu item from favourites
 *     tags: [Favourite Menu Items]
 *     parameters:
 *       - in: path
 *         name: menuItemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: { menuItemId, favourited: false }
 */
router.delete("/:menuItemId", favouriteMenuItemController.removeFavourite);

export default router;
