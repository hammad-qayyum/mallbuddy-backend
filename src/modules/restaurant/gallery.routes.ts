import { Router } from "express";
import { restaurantController } from "./restaurant.controller";
import { uploadRestaurantGallery } from "../../config/upload";

const router = Router();

// Simple ping to verify route is reachable
router.get("/restaurant/:restaurantId/gallery/ping", (req, res) => {
  const { restaurantId } = req.params;
  return res.json({ success: true, message: "gallery ping", restaurantId });
});

// POST /restaurant/:restaurantId/gallery
router.post(
  "/restaurant/:restaurantId/gallery",
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
      const fn = restaurantController?.addGallery;
      if (typeof fn === "function") return fn(req, res);
      throw new Error('addGallery handler not available');
    } catch (err) {
      return next(err);
    }
  }
);

// DELETE /restaurant/:restaurantId/gallery/:galleryId
router.delete(
  "/restaurant/:restaurantId/gallery/:galleryId",
  (req, res, next) => {
    try {
      console.log('[gallery.routes] gallery DELETE matched for', req.params.galleryId, 'restaurant:', req.params.restaurantId);
    } catch (e) {}
    next();
  },
  (req, res, next) => {
    try {
      const fn = restaurantController?.deleteGalleryImage;
      if (typeof fn === "function") return fn(req, res);
      throw new Error('deleteGalleryImage handler not available');
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
