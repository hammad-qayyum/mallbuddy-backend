import { Request, Response } from "express";
import { galleryService } from "./gallery.service";
import { getRestaurantGalleryUrl } from "../../config/upload";

export const galleryController = {
  async getGallery(req: Request, res: Response) {
    const { restaurantId } = req.params as { restaurantId?: string };
    if (!restaurantId) return res.status(400).json({ success: false, message: 'Restaurant ID required' });
    try {
      const data = await galleryService.getRestaurantGallery(restaurantId);
      if (!data) return res.status(404).json({ success: false, message: 'Restaurant not found' });
      return res.json({ success: true, data });
    } catch (err: any) {
      console.error('[gallery] getGallery error:', err?.stack || err, { restaurantId });
      return res.status(500).json({ success: false, message: err?.message || 'Internal Error' });
    }
  },

  async addGallery(req: Request, res: Response) {
    const { restaurantId } = req.params as { restaurantId?: string };
    if (!restaurantId) return res.status(400).json({ success: false, message: "Restaurant ID is required" });

    try {
      const files = (req.files as Express.Multer.File[]) || [];
      const imageUrls: string[] = [];

      if (files.length) {
        imageUrls.push(...files.map((f) => getRestaurantGalleryUrl(f.filename)));
      }

      if (req.body?.imageUrls) {
        try {
          const parsed = JSON.parse(req.body.imageUrls);
          if (Array.isArray(parsed)) imageUrls.push(...parsed.map(String));
        } catch (e) {
          imageUrls.push(...String(req.body.imageUrls).split(",").map((s) => s.trim()).filter(Boolean));
        }
      }

      const rows = await galleryService.addGalleryImages(restaurantId, imageUrls);
      if (rows === null) return res.status(404).json({ success: false, message: "Restaurant not found" });

      return res.json({ success: true, data: rows });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to add gallery images", error: error.message });
    }
  },

  async deleteGalleryImage(req: Request, res: Response) {
    const { restaurantId, galleryId } = req.params as { restaurantId?: string; galleryId?: string };
    if (!restaurantId || !galleryId) return res.status(400).json({ success: false, message: "Missing params" });

    try {
      const row = await galleryService.deleteGalleryImage(restaurantId, galleryId);
      if (!row) return res.status(404).json({ success: false, message: "Gallery image not found" });
      return res.json({ success: true, data: row });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to delete gallery image", error: error.message });
    }
  },
};

export default galleryController;
