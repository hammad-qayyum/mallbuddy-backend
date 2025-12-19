import { Router } from "express";
import { searchController } from "./search.controller";

const router = Router();

// GET /search?q=...&type=all|restaurants|foods
router.get("/search", (req, res, next) => {
  try {
    return searchController.search(req, res);
  } catch (err) {
    return next(err);
  }
});

export default router;
