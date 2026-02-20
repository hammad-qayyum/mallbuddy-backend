import { Router } from "express";
import { cuisineController } from "./cuisine.controller";
import { uploadCuisineCategoryImage } from "../../config/upload";
import { requireAuth, requireAdminRole } from "../../middlewares/role.middleware";

const router = Router();

/**
 * @swagger
 * /cuisine/create-category/{mallId}:
 *   post:
 *     summary: Create a new cuisine category for a mall
 *     tags: [Cuisine]
 *     description: |
 *       Create a new cuisine category for a specific mall. You can either upload an image file or provide an image URL.
 *       **Required fields:** name
 *       **Optional fields:** image (URL or file upload)
 *       **Image upload:** Use multipart/form-data with field name "image" to upload a file.
 *       If both file and URL are provided, the uploaded file takes priority.
 *       **Accepted image formats:** JPEG, PNG, GIF, WebP
 *       **Maximum file size:** 5MB
 *       **Note:** If updating image, old local images are automatically deleted.
 *     parameters:
 *       - in: path
 *         name: mallId
 *         required: true
 *         schema:
 *           type: string
 *         description: "Mall ID"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: "Cuisine category name (required, 2-50 characters)"
 *                 example: "Chinese"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: "Cuisine category image file (optional, JPEG, PNG, GIF, or WebP, max 5MB)"
 *           examples:
 *             withFileUpload:
 *               summary: Create with image file upload
 *               value:
 *                 name: "Chinese"
 *                 image: "<file>"
 *             withImageUrl:
 *               summary: Create with image URL
 *               value:
 *                 name: "Chinese"
 *                 image: "https://example.com/chinese-cuisine.jpg"
 *             withoutImage:
 *               summary: Create without image
 *               value:
 *                 name: "Chinese"
 *     responses:
 *       201:
 *         description: Cuisine category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Unique cuisine category identifier
 *                 name:
 *                   type: string
 *                   description: Cuisine category name
 *                 image:
 *                   type: string
 *                   nullable: true
 *                   description: "URL to the cuisine category image (if provided)"
 *                 mallId:
 *                   type: string
 *                   description: Mall ID where this category belongs
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: Creation timestamp
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   description: Last update timestamp
 *       400:
 *         description: Validation error or invalid mall ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             examples:
 *               validationError:
 *                 value:
 *                   fieldErrors:
 *                     name: ["String must contain at least 2 character(s)"]
 *               invalidMallId:
 *                 value:
 *                   message: "Mall not found"
 */
// Admin-only routes for cuisine category management
router.post("/cuisine/create-category/:mallId", requireAuth, requireAdminRole, uploadCuisineCategoryImage.single("image"), cuisineController.create);

/**
 * @swagger
 * /cuisine/get-all/{mallId}:
 *   get:
 *     summary: Get all cuisine categories for a mall
 *     tags: [Cuisine]
 *     description: |
 *       Get all cuisine categories for a specific mall, sorted alphabetically by name.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: mallId
 *         required: true
 *         schema:
 *           type: string
 *         description: "Mall ID"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: List of cuisine categories
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
 *                   image:
 *                     type: string
 *                     nullable: true
 *                   mallId:
 *                     type: string
 *       400:
 *         description: Invalid mall ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/cuisine/get-all/:mallId", cuisineController.getAll);

/**
 * @swagger
 * /cuisine/get-category/{id}:
 *   get:
 *     summary: Get a cuisine category by ID
 *     tags: [Cuisine]
 *     description: |
 *       Get a single cuisine category by its ID.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Cuisine category ID"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Cuisine category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 image:
 *                   type: string
 *                   nullable: true
 *                 mallId:
 *                   type: string
 *       400:
 *         description: Invalid category ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Cuisine category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/cuisine/get-category/:id", cuisineController.getById);

/**
 * @swagger
 * /cuisine/update-category/{id}:
 *   patch:
 *     summary: Update a cuisine category
 *     tags: [Cuisine]
 *     description: |
 *       Update a cuisine category. You can either upload an image file or provide an image URL.
 *       **All fields are optional** - send only the fields you want to update.
 *       **Image upload:** Use multipart/form-data with field name "image" to upload a file.
 *       If both file and URL are provided, the uploaded file takes priority.
 *       **Accepted image formats:** JPEG, PNG, GIF, WebP
 *       **Maximum file size:** 5MB
 *       **Note:** If updating image, old local images are automatically deleted.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Cuisine category ID"
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
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: "Cuisine category name (optional, 2-50 characters if provided)"
 *                 example: "Updated Chinese"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: "Cuisine category image file (optional, JPEG, PNG, GIF, or WebP, max 5MB)"
 *           examples:
 *             updateName:
 *               summary: Update only name
 *               value:
 *                 name: "Updated Chinese"
 *             updateWithImage:
 *               summary: Update with image file
 *               value:
 *                 name: "Updated Chinese"
 *                 image: "<file>"
 *             updateWithImageUrl:
 *               summary: Update with image URL
 *               value:
 *                 image: "https://example.com/new-chinese-cuisine.jpg"
 *     responses:
 *       200:
 *         description: Cuisine category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 image:
 *                   type: string
 *                   nullable: true
 *                 mallId:
 *                   type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Cuisine category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/cuisine/update-category/:id", requireAuth, requireAdminRole, uploadCuisineCategoryImage.single("image"), cuisineController.update);

/**
 * @swagger
 * /cuisine/delete-category/{id}:
 *   delete:
 *     summary: Delete a cuisine category
 *     tags: [Cuisine]
 *     description: |
 *       Delete a cuisine category. If the category has an image, it will be automatically deleted from storage.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Cuisine category ID"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       204:
 *         description: Cuisine category deleted successfully (no content)
 *       400:
 *         description: Invalid category ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Cuisine category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/cuisine/delete-category/:id", requireAuth, requireAdminRole, cuisineController.delete);

export default router;
