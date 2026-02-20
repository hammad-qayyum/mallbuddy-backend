import { z } from "zod";

// ============ GET PRODUCT DETAIL SCHEMA ============
/**
 * Schema for fetching product detail information
 * This returns all product information including variations and add-ons
 */
export const getProductDetailSchema = z.object({
  menuItemId: z.string().uuid("Invalid menu item ID"),
});

// ============ VARIATION SCHEMAS ============
/**
 * Schema for creating a product variation (e.g., Size, Crust Type)
 */
export const createProductVariationSchema = z.object({
  menuItemId: z.string().uuid("Invalid menu item ID"),
  name: z.string().min(1, "Variation name is required").max(100),
  type: z.enum(["RADIO", "CHECKBOX"]), // RADIO = select one, CHECKBOX = select multiple
  isRequired: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

/**
 * Schema for updating a product variation
 */
export const updateProductVariationSchema = createProductVariationSchema.omit({ menuItemId: true }).partial();

// ============ VARIATION OPTION SCHEMAS ============
/**
 * Schema for creating a variation option (e.g., Small - 0.00, Large - 2.50)
 */
export const createVariationOptionSchema = z.object({
  variationId: z.string().uuid("Invalid variation ID"),
  name: z.string().min(1, "Option name is required").max(100),
  priceModifier: z.preprocess(
    (value) => (typeof value === "string" ? Number(value) : value),
    z.number().nonnegative("Price modifier cannot be negative")
  ),
  displayOrder: z.number().int().default(0),
});

/**
 * Schema for updating a variation option
 */
export const updateVariationOptionSchema = createVariationOptionSchema
  .omit({ variationId: true })
  .partial();

// ============ ADD-ON SCHEMAS ============
/**
 * Schema for creating a product add-on (e.g., Extra Toppings, Additional Sauce)
 */
export const createProductAddOnSchema = z.object({
  menuItemId: z.string().uuid("Invalid menu item ID"),
  name: z.string().min(1, "Add-on name is required").max(100),
  isRequired: z.boolean().default(false),
  maxSelection: z.number().int().positive("Max selection must be at least 1").default(1),
  displayOrder: z.number().int().default(0),
});

/**
 * Schema for updating a product add-on
 */
export const updateProductAddOnSchema = createProductAddOnSchema.omit({ menuItemId: true }).partial();

// ============ ADD-ON OPTION SCHEMAS ============
/**
 * Schema for creating an add-on option (e.g., Pickled red cabbage - 0.50)
 */
export const createAddOnOptionSchema = z.object({
  addOnId: z.string().uuid("Invalid add-on ID"),
  name: z.string().min(1, "Option name is required").max(100),
  price: z.preprocess(
    (value) => (typeof value === "string" ? Number(value) : value),
    z.number().nonnegative("Price cannot be negative")
  ),
  displayOrder: z.number().int().default(0),
});

/**
 * Schema for updating an add-on option
 */
export const updateAddOnOptionSchema = createAddOnOptionSchema.omit({ addOnId: true }).partial();

// ============ COMPLETE PRODUCT DETAIL SCHEMA ============
/**
 * Schema for adding product to cart with selected variations and add-ons
 * This is used when the user clicks "Add to Cart" on the product detail page
 */
export const addProductToCartSchema = z.object({
  menuItemId: z.string().uuid("Invalid menu item ID"),
  restaurantId: z.string().uuid("Invalid restaurant ID"),
  quantity: z.number().int().positive("Quantity must be at least 1").default(1),
  selectedVariations: z
    .array(
      z.object({
        variationId: z.string().uuid("Invalid variation ID"),
        selectedOptionId: z.string().uuid("Invalid variation option ID"),
      })
    )
    .optional(),
  selectedAddOns: z
    .array(
      z.object({
        addOnId: z.string().uuid("Invalid add-on ID"),
        selectedOptionIds: z.array(z.string().uuid("Invalid add-on option ID")),
      })
    )
    .optional(),
  specialNotes: z.string().optional(),
});

// ============ TYPESCRIPT TYPES ============
export type GetProductDetailInput = z.infer<typeof getProductDetailSchema>;
export type CreateProductVariationInput = z.infer<typeof createProductVariationSchema>;
export type UpdateProductVariationInput = z.infer<typeof updateProductVariationSchema>;
export type CreateVariationOptionInput = z.infer<typeof createVariationOptionSchema>;
export type UpdateVariationOptionInput = z.infer<typeof updateVariationOptionSchema>;
export type CreateProductAddOnInput = z.infer<typeof createProductAddOnSchema>;
export type UpdateProductAddOnInput = z.infer<typeof updateProductAddOnSchema>;
export type CreateAddOnOptionInput = z.infer<typeof createAddOnOptionSchema>;
export type UpdateAddOnOptionInput = z.infer<typeof updateAddOnOptionSchema>;
export type AddProductToCartInput = z.infer<typeof addProductToCartSchema>;
