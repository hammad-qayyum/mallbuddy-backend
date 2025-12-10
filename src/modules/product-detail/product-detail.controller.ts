import { Request, Response } from "express";
import { productDetailService } from "./product-detail.service";
import {
  getProductDetailSchema,
  createProductVariationSchema,
  updateProductVariationSchema,
  createVariationOptionSchema,
  updateVariationOptionSchema,
  createProductAddOnSchema,
  updateProductAddOnSchema,
  createAddOnOptionSchema,
  updateAddOnOptionSchema,
} from "./product-detail.schema";

export const productDetailController = {
  // ============ GET PRODUCT DETAIL ============
  /**
   * GET /product-detail/:menuItemId
   * Fetch complete product detail with variations and add-ons
   */
  async getProductDetail(req: Request, res: Response) {
    try {
      const { menuItemId } = req.params;
      if (!menuItemId) {
        return res.status(400).json({ message: "Menu item ID is required" });
      }

      const product = await productDetailService.getProductDetail(menuItemId);
      return res.json(product);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // ============ PRODUCT VARIATIONS ============
  /**
   * POST /product-detail/variations/create
   * Create a new product variation
   */
  async createVariation(req: Request, res: Response) {
    try {
      const parseResult = createProductVariationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const variation = await productDetailService.createVariation(parseResult.data);
      return res.status(201).json(variation);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /product-detail/:menuItemId/variations
   * Get all variations for a product
   */
  async getVariationsByProduct(req: Request, res: Response) {
    try {
      const { menuItemId } = req.params;
      if (!menuItemId) {
        return res.status(400).json({ message: "Menu item ID is required" });
      }

      const variations = await productDetailService.getVariationsByProduct(menuItemId);
      return res.json(variations);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /product-detail/variations/:variationId
   * Get a specific variation
   */
  async getVariationById(req: Request, res: Response) {
    try {
      const { variationId } = req.params;
      if (!variationId) {
        return res.status(400).json({ message: "Variation ID is required" });
      }

      const variation = await productDetailService.getVariationById(variationId);
      if (!variation) {
        return res.status(404).json({ message: "Variation not found" });
      }

      return res.json(variation);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * PUT /product-detail/variations/:variationId
   * Update a product variation
   */
  async updateVariation(req: Request, res: Response) {
    try {
      const { variationId } = req.params;
      if (!variationId) {
        return res.status(400).json({ message: "Variation ID is required" });
      }

      const parseResult = updateProductVariationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const variation = await productDetailService.updateVariation(variationId, parseResult.data);
      return res.json(variation);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * DELETE /product-detail/variations/:variationId
   * Delete a product variation
   */
  async deleteVariation(req: Request, res: Response) {
    try {
      const { variationId } = req.params;
      if (!variationId) {
        return res.status(400).json({ message: "Variation ID is required" });
      }

      await productDetailService.deleteVariation(variationId);
      return res.json({ message: "Variation deleted successfully" });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // ============ VARIATION OPTIONS ============
  /**
   * POST /product-detail/variation-options/create
   * Create a variation option
   */
  async createVariationOption(req: Request, res: Response) {
    try {
      const parseResult = createVariationOptionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const option = await productDetailService.createVariationOption(parseResult.data);
      return res.status(201).json(option);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /product-detail/variations/:variationId/options
   * Get all options for a variation
   */
  async getVariationOptions(req: Request, res: Response) {
    try {
      const { variationId } = req.params;
      if (!variationId) {
        return res.status(400).json({ message: "Variation ID is required" });
      }

      const options = await productDetailService.getVariationOptions(variationId);
      return res.json(options);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /product-detail/variation-options/:optionId
   * Get a specific variation option
   */
  async getVariationOptionById(req: Request, res: Response) {
    try {
      const { optionId } = req.params;
      if (!optionId) {
        return res.status(400).json({ message: "Option ID is required" });
      }

      const option = await productDetailService.getVariationOptionById(optionId);
      if (!option) {
        return res.status(404).json({ message: "Variation option not found" });
      }

      return res.json(option);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * PUT /product-detail/variation-options/:optionId
   * Update a variation option
   */
  async updateVariationOption(req: Request, res: Response) {
    try {
      const { optionId } = req.params;
      if (!optionId) {
        return res.status(400).json({ message: "Option ID is required" });
      }

      const parseResult = updateVariationOptionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const option = await productDetailService.updateVariationOption(optionId, parseResult.data);
      return res.json(option);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * DELETE /product-detail/variation-options/:optionId
   * Delete a variation option
   */
  async deleteVariationOption(req: Request, res: Response) {
    try {
      const { optionId } = req.params;
      if (!optionId) {
        return res.status(400).json({ message: "Option ID is required" });
      }

      await productDetailService.deleteVariationOption(optionId);
      return res.json({ message: "Variation option deleted successfully" });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // ============ PRODUCT ADD-ONS ============
  /**
   * POST /product-detail/add-ons/create
   * Create a new product add-on
   */
  async createAddOn(req: Request, res: Response) {
    try {
      const parseResult = createProductAddOnSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const addOn = await productDetailService.createAddOn(parseResult.data);
      return res.status(201).json(addOn);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /product-detail/:menuItemId/add-ons
   * Get all add-ons for a product
   */
  async getAddOnsByProduct(req: Request, res: Response) {
    try {
      const { menuItemId } = req.params;
      if (!menuItemId) {
        return res.status(400).json({ message: "Menu item ID is required" });
      }

      const addOns = await productDetailService.getAddOnsByProduct(menuItemId);
      return res.json(addOns);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /product-detail/add-ons/:addOnId
   * Get a specific add-on
   */
  async getAddOnById(req: Request, res: Response) {
    try {
      const { addOnId } = req.params;
      if (!addOnId) {
        return res.status(400).json({ message: "Add-on ID is required" });
      }

      const addOn = await productDetailService.getAddOnById(addOnId);
      if (!addOn) {
        return res.status(404).json({ message: "Add-on not found" });
      }

      return res.json(addOn);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * PUT /product-detail/add-ons/:addOnId
   * Update a product add-on
   */
  async updateAddOn(req: Request, res: Response) {
    try {
      const { addOnId } = req.params;
      if (!addOnId) {
        return res.status(400).json({ message: "Add-on ID is required" });
      }

      const parseResult = updateProductAddOnSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const addOn = await productDetailService.updateAddOn(addOnId, parseResult.data);
      return res.json(addOn);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * DELETE /product-detail/add-ons/:addOnId
   * Delete a product add-on
   */
  async deleteAddOn(req: Request, res: Response) {
    try {
      const { addOnId } = req.params;
      if (!addOnId) {
        return res.status(400).json({ message: "Add-on ID is required" });
      }

      await productDetailService.deleteAddOn(addOnId);
      return res.json({ message: "Add-on deleted successfully" });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // ============ ADD-ON OPTIONS ============
  /**
   * POST /product-detail/add-on-options/create
   * Create an add-on option
   */
  async createAddOnOption(req: Request, res: Response) {
    try {
      const parseResult = createAddOnOptionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const option = await productDetailService.createAddOnOption(parseResult.data);
      return res.status(201).json(option);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /product-detail/add-ons/:addOnId/options
   * Get all options for an add-on
   */
  async getAddOnOptions(req: Request, res: Response) {
    try {
      const { addOnId } = req.params;
      if (!addOnId) {
        return res.status(400).json({ message: "Add-on ID is required" });
      }

      const options = await productDetailService.getAddOnOptions(addOnId);
      return res.json(options);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /product-detail/add-on-options/:optionId
   * Get a specific add-on option
   */
  async getAddOnOptionById(req: Request, res: Response) {
    try {
      const { optionId } = req.params;
      if (!optionId) {
        return res.status(400).json({ message: "Option ID is required" });
      }

      const option = await productDetailService.getAddOnOptionById(optionId);
      if (!option) {
        return res.status(404).json({ message: "Add-on option not found" });
      }

      return res.json(option);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * PUT /product-detail/add-on-options/:optionId
   * Update an add-on option
   */
  async updateAddOnOption(req: Request, res: Response) {
    try {
      const { optionId } = req.params;
      if (!optionId) {
        return res.status(400).json({ message: "Option ID is required" });
      }

      const parseResult = updateAddOnOptionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const option = await productDetailService.updateAddOnOption(optionId, parseResult.data);
      return res.json(option);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * DELETE /product-detail/add-on-options/:optionId
   * Delete an add-on option
   */
  async deleteAddOnOption(req: Request, res: Response) {
    try {
      const { optionId } = req.params;
      if (!optionId) {
        return res.status(400).json({ message: "Option ID is required" });
      }

      await productDetailService.deleteAddOnOption(optionId);
      return res.json({ message: "Add-on option deleted successfully" });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },
};
