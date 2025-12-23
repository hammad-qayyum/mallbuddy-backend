import { Router } from "express";
import { exploreController } from "./explore.controller";
import { galleryController } from "../gallery/gallery.controller";

const router = Router();

// GET /explore/restaurants
router.get("/restaurants", (req, res, next) => exploreController.getExplore(req, res).catch(next));

// GET /explore/restaurants/:restaurantId
router.get("/restaurants/:restaurantId", (req, res, next) => exploreController.getExploreDetail(req, res).catch(next));

// GET gallery (delegated to gallery controller)
router.get("/restaurants/:restaurantId/gallery", (req, res, next) => galleryController.getGallery(req, res).catch(next));

// GET story
router.get("/restaurants/:restaurantId/story", (req, res, next) => exploreController.getStory(req, res).catch(next));

export default router;
