import { Router } from "express";
import { galleryController } from "./gallery.controller";
import { uploadRestaurantGallery } from "../../config/upload";
import { requireAuth, requireRestaurantRole, requireRestaurantOwnership } from "../../middlewares/role.middleware";

const router = Router();

/**
 * @swagger
 * /restaurant/{restaurantId}/gallery/ping:
 *   get:
 *     summary: Ping gallery endpoint
 *     tags: [Gallery]
 *     description: Simple endpoint to verify gallery route is reachable
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant user ID
 *     responses:
 *       200:
 *         description: Gallery endpoint is reachable
 */
router.get("/restaurant/:restaurantId/gallery/ping", (req, res) => {
  const { restaurantId } = req.params;
  return res.json({ success: true, message: "gallery ping", restaurantId });
});

/**
 * @swagger
 * /restaurant/{restaurantId}/gallery:
 *   post:
 *     summary: Add images to restaurant gallery
 *     tags: [Gallery]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Upload multiple images to a restaurant's gallery.
 *       Maximum 12 images per request.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant user ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - images
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Gallery images (max 12 images, PNG/JPEG, max 5MB each)
 *     responses:
 *       201:
 *         description: Images added successfully
 *       400:
 *         description: Invalid request or too many images
 *       500:
 *         description: Internal server error
 */
// POST /restaurant/:restaurantId/gallery
router.post(
  "/restaurant/:restaurantId/gallery",
  requireAuth,
  requireRestaurantRole,
  requireRestaurantOwnership,
  (req, res, next) => {
    try {
      console.log('[gallery.routes] gallery POST matched for', req.params.restaurantId, 'originalUrl:', req.originalUrl);
    } catch (e) {}
    next();
  },
  (req, res, next) => {
    // delegate to multer middleware
    try {
      const mw = uploadRestaurantGallery?.array?.("images", 12);
      if (typeof mw === "function") return mw(req, res, next);
      throw new Error('upload middleware not available');
    } catch (err) {
      return next(err);
    }
  },
  (req, res, next) => {
    // delegate to controller method
    try {
      const fn = galleryController?.addGallery;
      if (typeof fn === "function") return Promise.resolve(fn(req, res)).catch(next);
      throw new Error('addGallery handler not available');
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * @swagger
 * /restaurant/{restaurantId}/gallery/{galleryId}:
 *   delete:
 *     summary: Delete a gallery image
 *     tags: [Gallery]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Delete a specific image from a restaurant's gallery.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant user ID
 *       - in: path
 *         name: galleryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Gallery image ID
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       404:
 *         description: Image not found
 *       500:
 *         description: Internal server error
 */
// DELETE /restaurant/:restaurantId/gallery/:galleryId
router.delete(
  "/restaurant/:restaurantId/gallery/:galleryId",
  requireAuth,
  requireRestaurantRole,
  requireRestaurantOwnership,
  (req, res, next) => {
    try {
      console.log('[gallery.routes] gallery DELETE matched for', req.params.galleryId, 'restaurant:', req.params.restaurantId);
    } catch (e) {}
    next();
  },
  (req, res, next) => {
    try {
      const fn = galleryController?.deleteGalleryImage;
      if (typeof fn === "function") return Promise.resolve(fn(req, res)).catch(next);
      throw new Error('deleteGalleryImage handler not available');
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
