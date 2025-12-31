import { Router } from "express";
import { cityController } from "./city.controller";
import { requireAuth, requireAdminRole } from "../../../middlewares/role.middleware";

const router = Router();

/**
 * @swagger
 * /cities/city/create:
 *   post:
 *     summary: Create a new city
 *     tags: [Location]
 *     description: |
 *       Create a new city in a specific country.
 *       **Required fields:** name, countryId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, countryId]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: "City name (required, 1-100 characters)"
 *                 example: "New York"
 *               countryId:
 *                 type: string
 *                 format: uuid
 *                 description: "Country ID (required, must be a valid UUID)"
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *           example:
 *             name: "New York"
 *             countryId: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       201:
 *         description: City created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 countryId:
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
// Admin-only routes for city management
router.post("/city/create", requireAuth, requireAdminRole, cityController.create);

/**
 * @swagger
 * /cities/city/get-all:
 *   get:
 *     summary: Get all cities
 *     tags: [Location]
 *     description: |
 *       Get all cities, optionally filtered by countryId.
 *       **No request body required.**
 *     parameters:
 *       - in: query
 *         name: countryId
 *         schema:
 *           type: string
 *         description: "Filter cities by country ID (optional)"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: List of cities
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
 *                   countryId:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 */
router.get("/city/get-all", cityController.getAll);

/**
 * @swagger
 * /cities/city/get/{id}:
 *   get:
 *     summary: Get a city by ID
 *     tags: [Location]
 *     description: |
 *       Get a single city by its ID.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "City ID"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: City retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 countryId:
 *                   type: string
 *       400:
 *         description: Invalid city ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: City not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/city/get/:id", cityController.getById);

/**
 * @swagger
 * /cities/city/get-by-country/{countryId}:
 *   get:
 *     summary: Get cities by country ID
 *     tags: [Location]
 *     description: |
 *       Get all cities for a specific country.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: countryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Country ID (UUID)"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: List of cities for the specified country
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
 *                   countryId:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       400:
 *         description: Invalid country ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Country ID is required
 */
router.get("/city/get-by-country/:countryId", cityController.getByCountryId);

/**
 * @swagger
 * /cities/city/update/{id}:
 *   patch:
 *     summary: Update a city
 *     tags: [Location]
 *     description: |
 *       Update a city.
 *       **All fields are optional** - send only the fields you want to update.
 *       **Note:** countryId can be updated, but it should point to a valid country.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "City ID"
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
 *                 maxLength: 100
 *                 description: "City name (optional, 1-100 characters if provided)"
 *                 example: "Updated City Name"
 *               countryId:
 *                 type: string
 *                 format: uuid
 *                 description: "Country ID (optional, must be a valid UUID if provided)"
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *           example:
 *             name: "New York City"
 *     responses:
 *       200:
 *         description: City updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 countryId:
 *                   type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: City not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/city/update/:id", requireAuth, requireAdminRole, cityController.update);

/**
 * @swagger
 * /cities/city/delete/{id}:
 *   delete:
 *     summary: Delete a city
 *     tags: [Location]
 *     description: |
 *       Delete a city. This will cascade delete all associated malls.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "City ID"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       204:
 *         description: City deleted successfully (no content)
 *       400:
 *         description: Invalid city ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: City not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/city/delete/:id", requireAuth, requireAdminRole, cityController.delete);

export default router;
