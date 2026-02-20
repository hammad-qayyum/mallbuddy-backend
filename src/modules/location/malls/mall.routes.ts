import { Router } from "express";
import { mallController } from "./mall.controller";
import { requireAuth, requireAdminRole } from "../../../middlewares/role.middleware";

const router = Router();

/**
 * @swagger
 * /malls/mall/create:
 *   post:
 *     summary: Create a new mall
 *     tags: [Location]
 *     description: |
 *       Create a new mall in a specific city.
 *       **Required fields:** name, cityId
 *       **Optional fields:** address
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, cityId]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 150
 *                 description: "Mall name (required, 1-150 characters)"
 *                 example: "Mall of America"
 *               address:
 *                 type: string
 *                 maxLength: 255
 *                 description: "Mall address (optional, max 255 characters)"
 *                 example: "60 E Broadway, Bloomington, MN 55425"
 *               cityId:
 *                 type: string
 *                 minLength: 1
 *                 description: "City ID (required)"
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *           example:
 *             name: "Mall of America"
 *             address: "60 E Broadway, Bloomington, MN 55425"
 *             cityId: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       201:
 *         description: Mall created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 address:
 *                   type: string
 *                   nullable: true
 *                 cityId:
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
// Admin-only routes for mall management
router.post("/mall/create", requireAuth, requireAdminRole, mallController.create);

/**
 * @swagger
 * /malls/mall/get-all:
 *   get:
 *     summary: Get all malls
 *     tags: [Location]
 *     description: |
 *       Get all malls, optionally filtered by cityId.
 *       **No request body required.**
 *     parameters:
 *       - in: query
 *         name: cityId
 *         schema:
 *           type: string
 *         description: "Filter malls by city ID (optional)"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: List of malls
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
 *                   address:
 *                     type: string
 *                     nullable: true
 *                   cityId:
 *                     type: string
 *                   restaurantCount:
 *                     type: integer
 *                     description: "Exact number of restaurants in this mall"
 *                     example: 7
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 */
router.get("/mall/get-all", mallController.getAll);

/**
 * @swagger
 * /malls/mall/get/{id}:
 *   get:
 *     summary: Get a mall by ID
 *     tags: [Location]
 *     description: |
 *       Get a single mall by its ID.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Mall ID"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Mall retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 address:
 *                   type: string
 *                   nullable: true
 *                 cityId:
 *                   type: string
 *       400:
 *         description: Invalid mall ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Mall not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/mall/get/:id", mallController.getById);

/**
 * @swagger
 * /malls/mall/get-by-city/{cityId}:
 *   get:
 *     summary: Get malls by city ID
 *     tags: [Location]
 *     description: |
 *       Get all malls for a specific city.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: cityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "City ID (UUID)"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: List of malls for the specified city
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
 *                   address:
 *                     type: string
 *                     nullable: true
 *                   cityId:
 *                     type: string
 *                   restaurantCount:
 *                     type: integer
 *                     description: "Exact number of restaurants in this mall"
 *                     example: 7
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       400:
 *         description: Invalid city ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: City ID is required
 */
router.get("/mall/get-by-city/:cityId", mallController.getByCityId);

/**
 * @swagger
 * /malls/mall/update/{id}:
 *   patch:
 *     summary: Update a mall
 *     tags: [Location]
 *     description: |
 *       Update a mall.
 *       **All fields are optional** - send only the fields you want to update.
 *       **Note:** cityId can be updated, but it should point to a valid city.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Mall ID"
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
 *                 minLength: 1
 *                 maxLength: 150
 *                 description: "Mall name (optional, 1-150 characters if provided)"
 *                 example: "Updated Mall Name"
 *               address:
 *                 type: string
 *                 maxLength: 255
 *                 description: "Mall address (optional, max 255 characters if provided)"
 *                 example: "Updated Address"
 *               cityId:
 *                 type: string
 *                 minLength: 1
 *                 description: "City ID (optional, must be valid if provided)"
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *           example:
 *             name: "Updated Mall of America"
 *             address: "Updated Address"
 *     responses:
 *       200:
 *         description: Mall updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 address:
 *                   type: string
 *                   nullable: true
 *                 cityId:
 *                   type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Mall not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/mall/update/:id", requireAuth, requireAdminRole, mallController.update);

/**
 * @swagger
 * /malls/mall/delete/{id}:
 *   delete:
 *     summary: Delete a mall
 *     tags: [Location]
 *     description: |
 *       Delete a mall. This will cascade delete all associated restaurants and cuisine categories.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Mall ID"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       204:
 *         description: Mall deleted successfully (no content)
 *       400:
 *         description: Invalid mall ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Mall not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/mall/delete/:id", requireAuth, requireAdminRole, mallController.delete);

/**
 * @swagger
 * /malls/analytics:
 *   get:
 *     summary: Get statistics per mall
 *     tags: [Location]
 *     description: |
 *       Get statistics for each mall including total revenue, total orders,
 *       total restaurants, and breakdowns by status with pagination.
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: "Page number for pagination (default: 1)"
 *         example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: "Number of results per page (default: 10, max: 100)"
 *         example: 10
 *     responses:
 *       200:
 *         description: Mall statistics retrieved successfully
 */
// Analytics route - admin only
router.get("/analytics", requireAuth, requireAdminRole, mallController.getMallStatistics);

export default router;
