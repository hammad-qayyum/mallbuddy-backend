import { Router } from "express";
import { deliveryAddressController } from "./delivery-address.controller";
import { requireAuth, requireUserRole } from "../../middlewares/role.middleware";

const router = Router();

// Apply user role to all delivery address routes (requireAuth is applied globally)
router.use(requireUserRole);

/**
 * @swagger
 * /delivery-addresses/address/create:
 *   post:
 *     summary: Create a new delivery address
 *     tags: [Delivery Address]
 *     description: |
 *       Create a new delivery address for a user.
 *       **Required fields:** address
 *       **Optional fields:** label, city, postalCode, isDefault (default: false)
 *       If isDefault is set to true, all other addresses for the user will be unset as default.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               label:
 *                 type: string
 *                 description: Label for the address (e.g., "Home", "Office")
 *                 example: "Home"
 *               address:
 *                 type: string
 *                 description: Full address
 *                 example: "123 Main Street, Apartment 4B"
 *               city:
 *                 type: string
 *                 description: City name
 *                 example: "New York"
 *               postalCode:
 *                 type: string
 *                 description: Postal/ZIP code
 *                 example: "10001"
 *               isDefault:
 *                 type: boolean
 *                 description: Set as default address
 *                 default: false
 *                 example: true
 *     responses:
 *       201:
 *         description: Delivery address created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 userId:
 *                   type: string
 *                 label:
 *                   type: string
 *                   nullable: true
 *                 address:
 *                   type: string
 *                 city:
 *                   type: string
 *                   nullable: true
 *                 postalCode:
 *                   type: string
 *                   nullable: true
 *                 isDefault:
 *                   type: boolean
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid request body or missing required fields
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post("/address/create", deliveryAddressController.createDeliveryAddress);

/**
 * @swagger
 * /delivery-addresses/address/get-all:
 *   get:
 *     summary: Get all delivery addresses for user
 *     tags: [Delivery Address]
 *     description: |
 *       Retrieve all delivery addresses for a user, ordered by default address first, then by creation date.
 *       **No request body required.**
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Delivery addresses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   userId:
 *                     type: string
 *                   label:
 *                     type: string
 *                     nullable: true
 *                   address:
 *                     type: string
 *                   city:
 *                     type: string
 *                     nullable: true
 *                   postalCode:
 *                     type: string
 *                     nullable: true
 *                   isDefault:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       400:
 *         description: User ID is required
 *       500:
 *         description: Server error
 */
router.get("/address/get-all", deliveryAddressController.getDeliveryAddresses);

/**
 * @swagger
 * /delivery-addresses/address/get/{addressId}:
 *   get:
 *     summary: Get a single delivery address
 *     tags: [Delivery Address]
 *     description: |
 *       Retrieve a specific delivery address by ID.
 *       **No request body required.**
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Delivery address ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Delivery address retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 userId:
 *                   type: string
 *                 label:
 *                   type: string
 *                   nullable: true
 *                 address:
 *                   type: string
 *                 city:
 *                   type: string
 *                   nullable: true
 *                 postalCode:
 *                   type: string
 *                   nullable: true
 *                 isDefault:
 *                   type: boolean
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: Delivery address not found
 *       500:
 *         description: Server error
 */
router.get("/address/get/:addressId", deliveryAddressController.getDeliveryAddress);

/**
 * @swagger
 * /delivery-addresses/address/update/{addressId}:
 *   put:
 *     summary: Update a delivery address
 *     tags: [Delivery Address]
 *     description: |
 *       Update a delivery address. All fields are optional.
 *       If isDefault is set to true, all other addresses for the user will be unset as default.
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Delivery address ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label:
 *                 type: string
 *                 description: Updated label
 *                 example: "Office"
 *               address:
 *                 type: string
 *                 description: Updated address
 *                 example: "456 Business Ave, Suite 200"
 *               city:
 *                 type: string
 *                 description: Updated city
 *                 example: "Los Angeles"
 *               postalCode:
 *                 type: string
 *                 description: Updated postal code
 *                 example: "90001"
 *               isDefault:
 *                 type: boolean
 *                 description: Set as default address
 *                 example: true
 *     responses:
 *       200:
 *         description: Delivery address updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 userId:
 *                   type: string
 *                 label:
 *                   type: string
 *                   nullable: true
 *                 address:
 *                   type: string
 *                 city:
 *                   type: string
 *                   nullable: true
 *                 postalCode:
 *                   type: string
 *                   nullable: true
 *                 isDefault:
 *                   type: boolean
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Delivery address not found
 *       500:
 *         description: Server error
 */
router.put("/address/update/:addressId", deliveryAddressController.updateDeliveryAddress);

/**
 * @swagger
 * /delivery-addresses/address/delete/{addressId}:
 *   delete:
 *     summary: Delete a delivery address
 *     tags: [Delivery Address]
 *     description: |
 *       Delete a delivery address. Addresses that are associated with existing orders cannot be deleted.
 *       **No request body required.**
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Delivery address ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Delivery address deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Delivery address deleted successfully"
 *       400:
 *         description: Missing required parameters or address is associated with orders
 *       404:
 *         description: Delivery address not found
 *       500:
 *         description: Server error
 */
router.delete("/address/delete/:addressId", deliveryAddressController.deleteDeliveryAddress);

/**
 * @swagger
 * /delivery-addresses/address/set-default/{addressId}:
 *   put:
 *     summary: Set an address as default
 *     tags: [Delivery Address]
 *     description: |
 *       Set a delivery address as the default address for the user.
 *       All other addresses for the user will be unset as default.
 *       **No request body required.**
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Delivery address ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Address set as default successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 userId:
 *                   type: string
 *                 label:
 *                   type: string
 *                   nullable: true
 *                 address:
 *                   type: string
 *                 city:
 *                   type: string
 *                   nullable: true
 *                 postalCode:
 *                   type: string
 *                   nullable: true
 *                 isDefault:
 *                   type: boolean
 *                   example: true
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: Delivery address not found
 *       500:
 *         description: Server error
 */
router.put("/address/set-default/:addressId", deliveryAddressController.setDefaultAddress);

export default router;

