import { Router } from "express";
import { adminPromoCodeController } from "./promo-code.controller";

const router = Router();

/**
 * @swagger
 * /admin/promo-codes:
 *   post:
 *     summary: Create a new promo code
 *     tags: [Admin - Promo Codes]
 *     description: |
 *       Create a new promo code for a specific mall and restaurant.
 *       
 *       **Testing Example:**
 *       POST /admin/promo-codes
 *       ```json
 *       {
 *         "mallId": "mall-123",
 *         "restaurantId": "rest-456",
 *         "code": "SUMMER2025",
 *         "discountPercentage": 20,
 *         "startDate": "2025-06-01T00:00:00Z",
 *         "endDate": "2025-08-31T23:59:59Z"
 *       }
 *       ```
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mallId
 *               - restaurantId
 *               - code
 *               - discountPercentage
 *               - startDate
 *               - endDate
 *             properties:
 *               mallId:
 *                 type: string
 *                 description: Mall ID
 *                 example: "mall-123"
 *               restaurantId:
 *                 type: string
 *                 description: Restaurant ID
 *                 example: "rest-456"
 *               code:
 *                 type: string
 *                 minLength: 3
 *                 description: Promo code (will be converted to uppercase)
 *                 example: "SUMMER2025"
 *               discountPercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Discount percentage (0-100)
 *                 example: 20
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Promo code start date
 *                 example: "2025-06-01T00:00:00Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Promo code end date
 *                 example: "2025-08-31T23:59:59Z"
 *     responses:
 *       201:
 *         description: Promo code created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Promo code created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     mallId:
 *                       type: string
 *                     restaurantId:
 *                       type: string
 *                     code:
 *                       type: string
 *                     discountPercentage:
 *                       type: number
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to create promo code
 */
router.post("/", adminPromoCodeController.createPromoCode);

/**
 * @swagger
 * /admin/promo-codes:
 *   get:
 *     summary: Get all promo codes
 *     tags: [Admin - Promo Codes]
 *     description: |
 *       Retrieve all promo codes with mall and restaurant details.
 *       
 *       **Testing:** Simply call GET /admin/promo-codes
 *     responses:
 *       200:
 *         description: List of all promo codes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       mallId:
 *                         type: string
 *                       restaurantId:
 *                         type: string
 *                       code:
 *                         type: string
 *                       discountPercentage:
 *                         type: number
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                       mall:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                       restaurant:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           name:
 *                             type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: integer
 *       500:
 *         description: Failed to fetch promo codes
 */
router.get("/", adminPromoCodeController.getAllPromoCodes);

/**
 * @swagger
 * /admin/promo-codes/{id}:
 *   get:
 *     summary: Get promo code by ID
 *     tags: [Admin - Promo Codes]
 *     description: Retrieve a specific promo code with mall and restaurant details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Promo code ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Promo code details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       404:
 *         description: Promo code not found
 *       500:
 *         description: Failed to fetch promo code
 */
router.get("/:id", adminPromoCodeController.getPromoCodeById);

/**
 * @swagger
 * /admin/promo-codes/{id}:
 *   put:
 *     summary: Update a promo code
 *     tags: [Admin - Promo Codes]
 *     description: |
 *       Update an existing promo code. All fields are optional.
 *       
 *       **Testing Example:**
 *       PUT /admin/promo-codes/{id}
 *       ```json
 *       {
 *         "discountPercentage": 30,
 *         "endDate": "2025-09-30T23:59:59Z"
 *       }
 *       ```
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Promo code ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mallId:
 *                 type: string
 *               restaurantId:
 *                 type: string
 *               code:
 *                 type: string
 *                 minLength: 3
 *               discountPercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Promo code updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Promo code updated successfully"
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error
 *       404:
 *         description: Promo code not found
 *       500:
 *         description: Failed to update promo code
 */
router.put("/:id", adminPromoCodeController.updatePromoCode);

/**
 * @swagger
 * /admin/promo-codes/{id}:
 *   delete:
 *     summary: Delete a promo code
 *     tags: [Admin - Promo Codes]
 *     description: Permanently delete a promo code
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Promo code ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Promo code deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Promo code deleted successfully"
 *       404:
 *         description: Promo code not found
 *       500:
 *         description: Failed to delete promo code
 */
router.delete("/:id", adminPromoCodeController.deletePromoCode);

export default router;
