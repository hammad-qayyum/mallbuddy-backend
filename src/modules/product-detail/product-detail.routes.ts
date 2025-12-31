import { Router } from "express";
import { productDetailController } from "./product-detail.controller";
import { requireAuth, requireRestaurantRole } from "../../middlewares/role.middleware";

const router = Router();

/**
 * ============================================
 * PRODUCT DETAIL - GET FULL PRODUCT INFORMATION
 * ============================================
 */

/**
 * @swagger
 * /product-detail/product/get/{menuItemId}:
 *   get:
 *     summary: Get complete product detail with variations and add-ons
 *     tags: [Product Detail]
 *     description: |
 *       Fetch all product information including:
 *       - Basic product details (name, price, description, image)
 *       - All variations (e.g., Size, Crust Type) with their options
 *       - All add-ons (e.g., Extra Toppings) with their options
 *       
 *       This is the main endpoint that the frontend calls to display the product detail page.
 *     parameters:
 *       - in: path
 *         name: menuItemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique ID of the menu item/product
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Product detail fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Product ID
 *                 name:
 *                   type: string
 *                   description: Product name
 *                 description:
 *                   type: string
 *                   description: Product description
 *                 price:
 *                   type: number
 *                   description: Base price of the product
 *                 image:
 *                   type: string
 *                   description: Product image URL
 *                 preparationTime:
 *                   type: string
 *                   description: Estimated preparation time
 *                 category:
 *                   type: object
 *                   description: Category details including restaurant
 *                 variations:
 *                   type: array
 *                   description: Array of product variations
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [RADIO, CHECKBOX]
 *                       isRequired:
 *                         type: boolean
 *                       options:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             priceModifier:
 *                               type: number
 *                 addOns:
 *                   type: array
 *                   description: Array of add-ons available for this product
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       isRequired:
 *                         type: boolean
 *                       maxSelection:
 *                         type: integer
 *                       options:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             price:
 *                               type: number
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
router.get("/product/get/:menuItemId", productDetailController.getProductDetail);

/**
 * ============================================
 * PRODUCT VARIATIONS
 * ============================================
 */

/**
 * @swagger
 * /product-detail/variation/create:
 *   post:
 *     summary: Create a new product variation
 *     tags: [Product Detail - Variations]
 *     description: |
 *       Create a variation for a product (e.g., Size, Crust Type)
 *       
 *       **Type field:**
 *       - RADIO: User can select only ONE option (e.g., size selection)
 *       - CHECKBOX: User can select MULTIPLE options
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [menuItemId, name, type]
 *             properties:
 *               menuItemId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               name:
 *                 type: string
 *                 example: "Size"
 *                 description: Name of the variation group
 *               type:
 *                 type: string
 *                 enum: [RADIO, CHECKBOX]
 *                 example: "RADIO"
 *                 description: How many options can be selected
 *               isRequired:
 *                 type: boolean
 *                 default: true
 *                 description: Is this variation mandatory for ordering
 *               displayOrder:
 *                 type: integer
 *                 default: 0
 *                 description: Order to display variations
 *     responses:
 *       201:
 *         description: Variation created successfully
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Menu item not found
 *       500:
 *         description: Server error
 */
// Product variation management - restaurant only (GET routes are public)
router.post("/variation/create", requireAuth, requireRestaurantRole, productDetailController.createVariation);

/**
 * @swagger
 * /product-detail/product/{menuItemId}/variations/get-all:
 *   get:
 *     summary: Get all variations for a product
 *     tags: [Product Detail - Variations]
 *     description: |
 *       Retrieve all variations (e.g., Size, Crust Type) for a specific product.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: menuItemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Menu item ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Variations fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                     enum: [RADIO, CHECKBOX]
 *                   isRequired:
 *                     type: boolean
 *                   displayOrder:
 *                     type: integer
 *       500:
 *         description: Server error
 */
router.get("/product/:menuItemId/variations/get-all", productDetailController.getVariationsByProduct);

/**
 * @swagger
 * /product-detail/variation/get/{variationId}:
 *   get:
 *     summary: Get a specific variation
 *     tags: [Product Detail - Variations]
 *     description: |
 *       Retrieve a single variation by its ID.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: variationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Variation ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Variation fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 type:
 *                   type: string
 *                   enum: [RADIO, CHECKBOX]
 *                 isRequired:
 *                   type: boolean
 *                 displayOrder:
 *                   type: integer
 *       404:
 *         description: Variation not found
 *       500:
 *         description: Server error
 */
router.get("/variation/get/:variationId", productDetailController.getVariationById);

/**
 * @swagger
 * /product-detail/variation/update/{variationId}:
 *   put:
 *     summary: Update a product variation
 *     tags: [Product Detail - Variations]
 *     description: |
 *       Update a variation's properties. All fields are optional.
 *     parameters:
 *       - in: path
 *         name: variationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Variation ID
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
 *                 description: Variation name
 *                 example: "Size"
 *               type:
 *                 type: string
 *                 enum: [RADIO, CHECKBOX]
 *                 description: Selection type
 *                 example: "RADIO"
 *               isRequired:
 *                 type: boolean
 *                 description: Is this variation required
 *                 example: true
 *               displayOrder:
 *                 type: integer
 *                 description: Display order
 *                 example: 0
 *     responses:
 *       200:
 *         description: Variation updated successfully
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Variation not found
 *       500:
 *         description: Server error
 */
router.put("/variation/update/:variationId", requireAuth, requireRestaurantRole, productDetailController.updateVariation);

/**
 * @swagger
 * /product-detail/variation/delete/{variationId}:
 *   delete:
 *     summary: Delete a product variation (cascades to all options)
 *     tags: [Product Detail - Variations]
 *     description: |
 *       Delete a variation. This will also delete all associated variation options.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: variationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Variation ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Variation deleted successfully
 *       404:
 *         description: Variation not found
 *       500:
 *         description: Server error
 */
router.delete("/variation/delete/:variationId", requireAuth, requireRestaurantRole, productDetailController.deleteVariation);

/**
 * ============================================
 * VARIATION OPTIONS (Options within a variation)
 * ============================================
 */

/**
 * @swagger
 * /product-detail/variation-option/create:
 *   post:
 *     summary: Create a variation option
 *     tags: [Product Detail - Variation Options]
 *     description: |
 *       Add an option to a variation.
 *       Example: For "Size" variation, add "Small", "Medium", "Large" options
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [variationId, name, priceModifier]
 *             properties:
 *               variationId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               name:
 *                 type: string
 *                 example: "Large"
 *                 description: Option name
 *               priceModifier:
 *                 type: number
 *                 example: 2.50
 *                 description: Additional price for this option
 *               displayOrder:
 *                 type: integer
 *                 default: 0
 *                 description: Display order
 *     responses:
 *       201:
 *         description: Option created successfully
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Variation not found
 *       500:
 *         description: Server error
 */
router.post("/variation-option/create", requireAuth, requireRestaurantRole, productDetailController.createVariationOption);

/**
 * @swagger
 * /product-detail/variation/{variationId}/options/get-all:
 *   get:
 *     summary: Get all options for a variation
 *     tags: [Product Detail - Variation Options]
 *     description: |
 *       Retrieve all options for a specific variation.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: variationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Variation ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Options fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   priceModifier:
 *                     type: number
 *                   displayOrder:
 *                     type: integer
 *       500:
 *         description: Server error
 */
router.get("/variation/:variationId/options/get-all", productDetailController.getVariationOptions);

/**
 * @swagger
 * /product-detail/variation-option/get/{optionId}:
 *   get:
 *     summary: Get a specific variation option
 *     tags: [Product Detail - Variation Options]
 *     description: |
 *       Retrieve a single variation option by its ID.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: optionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Variation option ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Option fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 priceModifier:
 *                   type: number
 *                 displayOrder:
 *                   type: integer
 *       404:
 *         description: Option not found
 *       500:
 *         description: Server error
 */
router.get("/variation-option/get/:optionId", productDetailController.getVariationOptionById);

/**
 * @swagger
 * /product-detail/variation-option/update/{optionId}:
 *   put:
 *     summary: Update a variation option
 *     tags: [Product Detail - Variation Options]
 *     description: |
 *       Update a variation option's properties. All fields are optional.
 *     parameters:
 *       - in: path
 *         name: optionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Variation option ID
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
 *                 description: Option name
 *                 example: "Large"
 *               priceModifier:
 *                 type: number
 *                 description: Price modifier
 *                 example: 2.50
 *               displayOrder:
 *                 type: integer
 *                 description: Display order
 *                 example: 0
 *     responses:
 *       200:
 *         description: Option updated successfully
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Option not found
 *       500:
 *         description: Server error
 */
router.put("/variation-option/update/:optionId", requireAuth, requireRestaurantRole, productDetailController.updateVariationOption);

/**
 * @swagger
 * /product-detail/variation-option/delete/{optionId}:
 *   delete:
 *     summary: Delete a variation option
 *     tags: [Product Detail - Variation Options]
 *     description: |
 *       Delete a variation option.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: optionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Variation option ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Option deleted successfully
 *       404:
 *         description: Option not found
 *       500:
 *         description: Server error
 */
router.delete("/variation-option/delete/:optionId", requireAuth, requireRestaurantRole, productDetailController.deleteVariationOption);

/**
 * ============================================
 * PRODUCT ADD-ONS
 * ============================================
 */

/**
 * @swagger
 * /product-detail/add-on/create:
 *   post:
 *     summary: Create a new product add-on
 *     tags: [Product Detail - Add-Ons]
 *     description: |
 *       Create an add-on for a product (e.g., Extra Toppings, Additional Sauce)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [menuItemId, name]
 *             properties:
 *               menuItemId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               name:
 *                 type: string
 *                 example: "Choose your extra topping for scope"
 *                 description: Add-on name
 *               isRequired:
 *                 type: boolean
 *                 default: false
 *                 description: Is this add-on required
 *               maxSelection:
 *                 type: integer
 *                 default: 1
 *                 description: Maximum number of options to select
 *               displayOrder:
 *                 type: integer
 *                 default: 0
 *                 description: Display order
 *     responses:
 *       201:
 *         description: Add-on created successfully
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Menu item not found
 *       500:
 *         description: Server error
 */
router.post("/add-on/create", requireAuth, requireRestaurantRole, productDetailController.createAddOn);

/**
 * @swagger
 * /product-detail/product/{menuItemId}/add-ons/get-all:
 *   get:
 *     summary: Get all add-ons for a product
 *     tags: [Product Detail - Add-Ons]
 *     description: |
 *       Retrieve all add-ons for a specific product.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: menuItemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Menu item ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Add-ons fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   isRequired:
 *                     type: boolean
 *                   maxSelection:
 *                     type: integer
 *                   displayOrder:
 *                     type: integer
 *       500:
 *         description: Server error
 */
router.get("/product/:menuItemId/add-ons/get-all", productDetailController.getAddOnsByProduct);

/**
 * @swagger
 * /product-detail/add-on/get/{addOnId}:
 *   get:
 *     summary: Get a specific add-on
 *     tags: [Product Detail - Add-Ons]
 *     description: |
 *       Retrieve a single add-on by its ID.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: addOnId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Add-on ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Add-on fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 isRequired:
 *                   type: boolean
 *                 maxSelection:
 *                   type: integer
 *                 displayOrder:
 *                   type: integer
 *       404:
 *         description: Add-on not found
 *       500:
 *         description: Server error
 */
router.get("/add-on/get/:addOnId", productDetailController.getAddOnById);

/**
 * @swagger
 * /product-detail/add-on/update/{addOnId}:
 *   put:
 *     summary: Update a product add-on
 *     tags: [Product Detail - Add-Ons]
 *     description: |
 *       Update an add-on's properties. All fields are optional.
 *     parameters:
 *       - in: path
 *         name: addOnId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Add-on ID
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
 *                 description: Add-on name
 *                 example: "Extra Toppings"
 *               isRequired:
 *                 type: boolean
 *                 description: Is this add-on required
 *                 example: false
 *               maxSelection:
 *                 type: integer
 *                 description: Maximum number of options to select
 *                 example: 1
 *               displayOrder:
 *                 type: integer
 *                 description: Display order
 *                 example: 0
 *     responses:
 *       200:
 *         description: Add-on updated successfully
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Add-on not found
 *       500:
 *         description: Server error
 */
router.put("/add-on/update/:addOnId", requireAuth, requireRestaurantRole, productDetailController.updateAddOn);

/**
 * @swagger
 * /product-detail/add-on/delete/{addOnId}:
 *   delete:
 *     summary: Delete a product add-on (cascades to all options)
 *     tags: [Product Detail - Add-Ons]
 *     description: |
 *       Delete an add-on. This will also delete all associated add-on options.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: addOnId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Add-on ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Add-on deleted successfully
 *       404:
 *         description: Add-on not found
 *       500:
 *         description: Server error
 */
router.delete("/add-on/delete/:addOnId", requireAuth, requireRestaurantRole, productDetailController.deleteAddOn);

/**
 * ============================================
 * ADD-ON OPTIONS (Options within an add-on)
 * ============================================
 */

/**
 * @swagger
 * /product-detail/add-on-option/create:
 *   post:
 *     summary: Create an add-on option
 *     tags: [Product Detail - Add-On Options]
 *     description: |
 *       Add an option to an add-on.
 *       Example: For "Extra Toppings" add-on, add "Pickled red cabbage", "Hummus", etc.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [addOnId, name, price]
 *             properties:
 *               addOnId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *                 description: Add-on ID
 *               name:
 *                 type: string
 *                 example: "Pickled red cabbage"
 *                 description: Option name
 *               price:
 *                 type: number
 *                 example: 0.40
 *                 description: Price for this option
 *               displayOrder:
 *                 type: integer
 *                 default: 0
 *                 description: Display order
 *     responses:
 *       201:
 *         description: Option created successfully
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Add-on not found
 *       500:
 *         description: Server error
 */
router.post("/add-on-option/create", requireAuth, requireRestaurantRole, productDetailController.createAddOnOption);

/**
 * @swagger
 * /product-detail/add-on/{addOnId}/options/get-all:
 *   get:
 *     summary: Get all options for an add-on
 *     tags: [Product Detail - Add-On Options]
 *     description: |
 *       Retrieve all options for a specific add-on.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: addOnId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Add-on ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Options fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   price:
 *                     type: number
 *                   displayOrder:
 *                     type: integer
 *       500:
 *         description: Server error
 */
router.get("/add-on/:addOnId/options/get-all", productDetailController.getAddOnOptions);

/**
 * @swagger
 * /product-detail/add-on-option/get/{optionId}:
 *   get:
 *     summary: Get a specific add-on option
 *     tags: [Product Detail - Add-On Options]
 *     description: |
 *       Retrieve a single add-on option by its ID.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: optionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Add-on option ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Option fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 price:
 *                   type: number
 *                 displayOrder:
 *                   type: integer
 *       404:
 *         description: Option not found
 *       500:
 *         description: Server error
 */
router.get("/add-on-option/get/:optionId", productDetailController.getAddOnOptionById);

/**
 * @swagger
 * /product-detail/add-on-option/update/{optionId}:
 *   put:
 *     summary: Update an add-on option
 *     tags: [Product Detail - Add-On Options]
 *     description: |
 *       Update an add-on option's properties. All fields are optional.
 *     parameters:
 *       - in: path
 *         name: optionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Add-on option ID
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
 *                 description: Option name
 *                 example: "Pickled red cabbage"
 *               price:
 *                 type: number
 *                 description: Price for this option
 *                 example: 0.40
 *               displayOrder:
 *                 type: integer
 *                 description: Display order
 *                 example: 0
 *     responses:
 *       200:
 *         description: Option updated successfully
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Option not found
 *       500:
 *         description: Server error
 */
router.put("/add-on-option/update/:optionId", requireAuth, requireRestaurantRole, productDetailController.updateAddOnOption);

/**
 * @swagger
 * /product-detail/add-on-option/delete/{optionId}:
 *   delete:
 *     summary: Delete an add-on option
 *     tags: [Product Detail - Add-On Options]
 *     description: |
 *       Delete an add-on option.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: optionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Add-on option ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Option deleted successfully
 *       404:
 *         description: Option not found
 *       500:
 *         description: Server error
 */
router.delete("/add-on-option/delete/:optionId", requireAuth, requireRestaurantRole, productDetailController.deleteAddOnOption);

export default router;
