import { Router } from "express";
import { countryController } from "./country.controller";
import { requireAuth, requireAdminRole } from "../../../middlewares/role.middleware";

const router = Router();

/**
 * @swagger
 * /countries/country/create:
 *   post:
 *     summary: Create a new country
 *     tags: [Location]
 *     description: |
 *       Create a new country.
 *       **Required fields:** name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: "Country name (required, 1-100 characters)"
 *                 example: "United States"
 *           example:
 *             name: "United States"
 *     responses:
 *       201:
 *         description: Country created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
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
// Admin-only routes for country management
router.post("/country/create", requireAuth, requireAdminRole, countryController.create);

/**
 * @swagger
 * /countries/country/get-all:
 *   get:
 *     summary: Get all countries
 *     tags: [Location]
 *     description: |
 *       Get all countries, sorted alphabetically by name.
 *       **No request body required.**
 *     responses:
 *       200:
 *         description: List of countries
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
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 */
router.get("/country/get-all", countryController.getAll);

/**
 * @swagger
 * /countries/country/get/{id}:
 *   get:
 *     summary: Get a country by ID
 *     tags: [Location]
 *     description: |
 *       Get a single country by its ID.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Country ID"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Country retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
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
 *         description: Invalid country ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Country not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/country/get/:id", countryController.getById);

/**
 * @swagger
 * /countries/country/update/{id}:
 *   patch:
 *     summary: Update a country
 *     tags: [Location]
 *     description: |
 *       Update a country.
 *       **All fields are optional** - send only the fields you want to update.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Country ID"
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
 *                 description: "Country name (optional, 1-100 characters if provided)"
 *                 example: "Updated Country Name"
 *           example:
 *             name: "United States of America"
 *     responses:
 *       200:
 *         description: Country updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Country not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/country/update/:id", requireAuth, requireAdminRole, countryController.update);

/**
 * @swagger
 * /countries/country/delete/{id}:
 *   delete:
 *     summary: Delete a country
 *     tags: [Location]
 *     description: |
 *       Delete a country. This will cascade delete all associated cities and malls.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Country ID"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       204:
 *         description: Country deleted successfully (no content)
 *       400:
 *         description: Invalid country ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Country not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/country/delete/:id", requireAuth, requireAdminRole, countryController.delete);

export default router;
