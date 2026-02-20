import { Router } from "express";
import { restaurantService } from "./restaurant.service";

const router = Router();

// GET /explore/restaurants
router.get("/restaurants", async (req, res) => {
	try {
		const data = await restaurantService.getExploreRestaurants();
		return res.json({ success: true, data });
	} catch (err: any) {
		console.error('[explore.routes] get /restaurants error', err?.stack || err);
		return res.status(500).json({ success: false, message: err?.message || 'Internal Error' });
	}
});

// GET /explore/restaurants/:restaurantId
router.get("/restaurants/:restaurantId", async (req, res) => {
	const { restaurantId } = req.params;
	if (!restaurantId) return res.status(400).json({ success: false, message: 'Restaurant ID required' });
	try {
		const data = await restaurantService.getExploreRestaurantDetail(restaurantId);
		if (!data) return res.status(404).json({ success: false, message: 'Restaurant not found' });
		return res.json({ success: true, data });
	} catch (err: any) {
		console.error('[explore.routes] get /restaurants/:id error', err?.stack || err, { restaurantId });
		return res.status(500).json({ success: false, message: err?.message || 'Internal Error' });
	}
});

// GET gallery
router.get("/restaurants/:restaurantId/gallery", async (req, res) => {
	const { restaurantId } = req.params;
	if (!restaurantId) return res.status(400).json({ success: false, message: 'Restaurant ID required' });
	try {
		const data = await restaurantService.getRestaurantGallery(restaurantId);
		if (!data) return res.status(404).json({ success: false, message: 'Restaurant not found' });
		return res.json({ success: true, data });
	} catch (err: any) {
		console.error('[explore.routes] get /restaurants/:id/gallery error', err?.stack || err, { restaurantId });
		return res.status(500).json({ success: false, message: err?.message || 'Internal Error' });
	}
});

// GET story
router.get("/restaurants/:restaurantId/story", async (req, res) => {
	const { restaurantId } = req.params;
	if (!restaurantId) return res.status(400).json({ success: false, message: 'Restaurant ID required' });
	try {
		const data = await restaurantService.getRestaurantStory(restaurantId);
		if (!data) return res.status(404).json({ success: false, message: 'Restaurant not found' });
		return res.json({ success: true, data });
	} catch (err: any) {
		console.error('[explore.routes] get /restaurants/:id/story error', err?.stack || err, { restaurantId });
		return res.status(500).json({ success: false, message: err?.message || 'Internal Error' });
	}
});

export default router;
