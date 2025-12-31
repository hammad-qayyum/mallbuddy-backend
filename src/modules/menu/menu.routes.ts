import { Router } from "express";
import { menuCategoryController } from "./menu.controller";
import { uploadMenuItemImage } from "../../config/upload";
import { requireAuth, requireRestaurantRole } from "../../middlewares/role.middleware";

const router = Router();

/**
 * @swagger
 * /menu/create-category:
 *   post:
 *     summary: Create a new menu category
 *     tags: [Menu]
 *     description: |
 *       Create a new menu category for a restaurant.
 *       **Required fields:** restaurantId, name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [restaurantId, name]
 *             properties:
 *               restaurantId:
 *                 type: string
 *                 description: ID of the restaurant that owns this category
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: "Category name (2-50 characters)"
 *                 example: "Appetizers"
 *           example:
 *             restaurantId: "123e4567-e89b-12d3-a456-426614174000"
 *             name: "Appetizers"
 *     responses:
 *       201:
 *         description: Menu category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 restaurantId:
 *                   type: string
 *                 name:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
// Menu management routes - require restaurant role (GET routes are public)
router.post("/menu/create-category", requireAuth, requireRestaurantRole, menuCategoryController.createCategory);

/**
 * @swagger
 * /menu/get-all/{restaurantId}:
 *   get:
 *     summary: Get all menu categories for a restaurant
 *     tags: [Menu]
 *     description: |
 *       Get all menu categories for a specific restaurant, including all menu items in each category.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: "Restaurant ID"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: List of menu categories with items
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
 *                   restaurantId:
 *                     type: string
 *                   items:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         description:
 *                           type: string
 *                           nullable: true
 *                         price:
 *                           type: number
 *                         preparationTime:
 *                           type: string
 *                           nullable: true
 *                         image:
 *                           type: string
 *                           nullable: true
 *       400:
 *         description: Invalid restaurant ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/menu/get-all/:restaurantId", menuCategoryController.getCategoriesByRestaurant);

/**
 * @swagger
 * /menu/update-category/{id}:
 *   patch:
 *     summary: Update a menu category
 *     tags: [Menu]
 *     description: |
 *       Update a menu category. Only the name can be updated.
 *       **All fields are optional** - send only the fields you want to update.
 *       **Note:** restaurantId cannot be updated (it's a foreign key).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Menu category ID"
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
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: "Category name (optional, 2-50 characters if provided)"
 *                 example: "Updated Category Name"
 *           example:
 *             name: "Updated Appetizers"
 *     responses:
 *       200:
 *         description: Menu category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 restaurantId:
 *                   type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Menu category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/menu/update-category/:id", requireAuth, requireRestaurantRole, menuCategoryController.updateCategory);

/**
 * @swagger
 * /menu/delete-category/{id}:
 *   delete:
 *     summary: Delete a menu category
 *     tags: [Menu]
 *     description: |
 *       Delete a menu category. This will also delete all menu items in this category.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Menu category ID"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       204:
 *         description: Menu category deleted successfully (no content)
 *       400:
 *         description: Invalid category ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Menu category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/menu/delete-category/:id", requireAuth, requireRestaurantRole, menuCategoryController.deleteCategory);

/**
 * @swagger
 * /menu/create-item:
 *   post:
 *     summary: Create a new menu item
 *     tags: [Menu]
 *     description: |
 *       Create a new menu item. You can either upload an image file or provide an image URL.
 *       **Required fields:** menuCategoryId, name, price
 *       **Optional fields:** description, preparationTime, image (URL or file upload)
 *       **Image upload:** Use multipart/form-data with field name "image" to upload a file.
 *       If both file and URL are provided, the uploaded file takes priority.
 *       **Accepted image formats:** JPEG, PNG, GIF, WebP
 *       **Maximum file size:** 5MB
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [menuCategoryId, name, price]
 *             properties:
 *               menuCategoryId:
 *                 type: string
 *                 description: ID of the menu category this item belongs to
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 description: "Item name (required)"
 *                 example: "Margherita Pizza"
 *               description:
 *                 type: string
 *                 description: "Item description (optional)"
 *                 example: "Classic pizza with tomato, mozzarella, and basil"
 *               price:
 *                 type: number
 *                 description: "Item price (required)"
 *                 example: 15.99
 *               preparationTime:
 *                 type: string
 *                 description: "Estimated preparation time (optional)"
 *                 example: "20-30 minutes"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: "Item image file (optional, JPEG, PNG, GIF, or WebP, max 5MB)"
 *           examples:
 *             withFileUpload:
 *               summary: Create with image file upload
 *               value:
 *                 menuCategoryId: "123e4567-e89b-12d3-a456-426614174000"
 *                 name: "Margherita Pizza"
 *                 description: "Classic pizza with tomato, mozzarella, and basil"
 *                 price: 15.99
 *                 preparationTime: "20-30 minutes"
 *                 image: "<file>"
 *             withImageUrl:
 *               summary: Create with image URL
 *               value:
 *                 menuCategoryId: "123e4567-e89b-12d3-a456-426614174000"
 *                 name: "Margherita Pizza"
 *                 description: "Classic pizza with tomato, mozzarella, and basil"
 *                 price: 15.99
 *                 preparationTime: "20-30 minutes"
 *                 image: "https://example.com/pizza.jpg"
 *             withoutImage:
 *               summary: Create without image
 *               value:
 *                 menuCategoryId: "123e4567-e89b-12d3-a456-426614174000"
 *                 name: "Margherita Pizza"
 *                 description: "Classic pizza with tomato, mozzarella, and basil"
 *                 price: 15.99
 *                 preparationTime: "20-30 minutes"
 *     responses:
 *       201:
 *         description: Menu item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 categoryId:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                   nullable: true
 *                 price:
 *                   type: number
 *                 preparationTime:
 *                   type: string
 *                   nullable: true
 *                 image:
 *                   type: string
 *                   nullable: true
 *                   description: URL to the item image (if provided)
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.post("/menu/create-item", requireAuth, requireRestaurantRole, uploadMenuItemImage.single("image"), menuCategoryController.createItem);

/**
 * @swagger
 * /menu/get-item/{id}:
 *   get:
 *     summary: Get a menu item by ID
 *     tags: [Menu]
 *     description: |
 *       Get a single menu item by its ID.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Menu item ID"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Menu item retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 categoryId:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                   nullable: true
 *                 price:
 *                   type: number
 *                 preparationTime:
 *                   type: string
 *                   nullable: true
 *                 image:
 *                   type: string
 *                   nullable: true
 *       400:
 *         description: Invalid item ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Menu item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/menu/get-item/:id", menuCategoryController.getItemById);

/**
 * @swagger
 * /menu/update-item/{id}:
 *   patch:
 *     summary: Update a menu item
 *     tags: [Menu]
 *     description: |
 *       Update a menu item. You can either upload an image file or provide an image URL.
 *       **All fields are optional** - send only the fields you want to update.
 *       **Image upload:** Use multipart/form-data with field name "image" to upload a file.
 *       If both file and URL are provided, the uploaded file takes priority.
 *       **Accepted image formats:** JPEG, PNG, GIF, WebP
 *       **Maximum file size:** 5MB
 *       **Note:** menuCategoryId cannot be updated (it's a foreign key).
 *       If updating image, old local images are automatically deleted.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Menu item ID"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 description: "Item name (optional)"
 *                 example: "Updated Pizza Name"
 *               description:
 *                 type: string
 *                 description: "Item description (optional)"
 *                 example: "Updated description"
 *               price:
 *                 type: number
 *                 description: "Item price (optional)"
 *                 example: 18.99
 *               preparationTime:
 *                 type: string
 *                 description: "Estimated preparation time (optional)"
 *                 example: "25-35 minutes"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: "Item image file (optional, JPEG, PNG, GIF, or WebP, max 5MB)"
 *           examples:
 *             updateName:
 *               summary: Update only name
 *               value:
 *                 name: "Updated Pizza Name"
 *             updatePrice:
 *               summary: Update only price
 *               value:
 *                 price: 18.99
 *             updateWithImage:
 *               summary: Update with image file
 *               value:
 *                 name: "Updated Pizza Name"
 *                 price: 18.99
 *                 image: "<file>"
 *             updateWithImageUrl:
 *               summary: Update with image URL
 *               value:
 *                 name: "Updated Pizza Name"
 *                 image: "https://example.com/new-pizza.jpg"
 *     responses:
 *       200:
 *         description: Menu item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 categoryId:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                   nullable: true
 *                 price:
 *                   type: number
 *                 preparationTime:
 *                   type: string
 *                   nullable: true
 *                 image:
 *                   type: string
 *                   nullable: true
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Menu item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/menu/update-item/:id", requireAuth, requireRestaurantRole, uploadMenuItemImage.single("image"), menuCategoryController.updateItem);

/**
 * @swagger
 * /menu/delete-item/{id}:
 *   delete:
 *     summary: Delete a menu item
 *     tags: [Menu]
 *     description: |
 *       Delete a menu item. If the item has an image, it will be automatically deleted from storage.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Menu item ID"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       204:
 *         description: Menu item deleted successfully (no content)
 *       400:
 *         description: Invalid item ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Menu item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/menu/delete-item/:id", requireAuth, requireRestaurantRole, menuCategoryController.deleteItem);

export default router;
