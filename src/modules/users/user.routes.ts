import {Router} from "express";
import {userController} from "./user.controller";
import {requireAuth, requireUserRole} from "../../middlewares/role.middleware";
import { uploadProfilePicture } from "../../config/upload";

const router = Router();

// All these routes require USER role (requireAuth is applied globally)

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Get the complete profile information for the currently authenticated user.
 *       **No request body required.**
 *       Returns all user profile fields including id, name, email, phoneNumber, firstName, lastName, image, role, etc.
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Unique user identifier
 *                 name:
 *                   type: string
 *                   nullable: true
 *                   description: Full name (used by Better Auth, auto-generated from firstName + lastName)
 *                 email:
 *                   type: string
 *                   description: User's email address
 *                 phoneNumber:
 *                   type: string
 *                   nullable: true
 *                   description: User's phone number (normalized, digits only)
 *                 firstName:
 *                   type: string
 *                   nullable: true
 *                   description: User's first name
 *                 lastName:
 *                   type: string
 *                   nullable: true
 *                   description: User's last name
 *                 image:
 *                   type: string
 *                   nullable: true
 *                   description: URL to user's profile image
 *                 role:
 *                   type: string
 *                   enum: [USER, ADMIN, VENDOR, DELIVERY_PERSON]
 *                   description: User's role
 *                 userVerified:
 *                   type: boolean
 *                   description: Whether the user is verified
 *                 emailVerified:
 *                   type: boolean
 *                   nullable: true
 *                   description: Whether the email is verified (Better Auth field)
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: Account creation timestamp
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   description: Last update timestamp
 *       401:
 *         description: Unauthorized - user not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/me", userController.getMyProfile);

/**
 * @swagger
 * /users/me:
 *   patch:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Update user profile information. You can either upload an image file or provide an image URL.
 *       **All fields are optional** - send only the fields you want to update.
 *       You can update any combination of: firstName, lastName, email, phoneNumber, image
 *       **Image upload:** Use multipart/form-data with field name "image" to upload a file.
 *       If both file and URL are provided, the uploaded file takes priority.
 *       **Accepted image formats:** JPEG, PNG, GIF, WebP
 *       **Maximum file size:** 5MB
 *       Note: When updating firstName or lastName, the Better Auth `name` field is automatically updated.
 *       Phone numbers are automatically normalized (non-digit characters removed).
 *       If updating image, old local images are automatically deleted.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 1
 *                 description: User's first name (optional)
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 minLength: 1
 *                 description: User's last name (optional)
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address (optional)
 *                 example: "john.doe@example.com"
 *               phoneNumber:
 *                 type: string
 *                 minLength: 11
 *                 description: User's phone number (optional, will be normalized)
 *                 example: "12345678901"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file (optional, JPEG, PNG, GIF, or WebP, max 5MB)
 *           examples:
 *             updateName:
 *               summary: Update only name fields
 *               value:
 *                 firstName: "John"
 *                 lastName: "Doe"
 *             updateEmail:
 *               summary: Update only email
 *               value:
 *                 email: "newemail@example.com"
 *             updatePhone:
 *               summary: Update only phone number
 *               value:
 *                 phoneNumber: "+12345678901"
 *             updateWithImageFile:
 *               summary: Update with image file upload
 *               value:
 *                 firstName: "John"
 *                 image: "<file>"
 *             updateWithImageUrl:
 *               summary: Update with image URL
 *               value:
 *                 image: "https://example.com/profile.jpg"
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *           examples:
 *             updateName:
 *               summary: Update only name fields
 *               value:
 *                 firstName: "John"
 *                 lastName: "Doe"
 *             updateEmail:
 *               summary: Update only email
 *               value:
 *                 email: "newemail@example.com"
 *             updatePhone:
 *               summary: Update only phone number
 *               value:
 *                 phoneNumber: "+12345678901"
 *             updateImage:
 *               summary: Update only profile image
 *               value:
 *                 image: "https://example.com/profile.jpg"
 *             updateAll:
 *               summary: Update multiple fields
 *               value:
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 email: "john.doe@example.com"
 *                 phoneNumber: "12345678901"
 *                 image: "https://example.com/profile.jpg"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 email:
 *                   type: string
 *                 phoneNumber:
 *                   type: string
 *                 image:
 *                   type: string
 *                 name:
 *                   type: string
 *                   description: Better Auth name field (auto-updated when firstName/lastName changes)
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/me", uploadProfilePicture.single("image"), userController.updateProfile);

/**
 * @swagger
 * /users/me/password:
 *   patch:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Change user password. 
 *       **Required fields:** currentPassword, newPassword
 *       Both passwords must be at least 6 characters long.
 *       The current password is verified using Better Auth's authentication system.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *           example:
 *             currentPassword: "oldpassword123"
 *             newPassword: "newpassword123"
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password updated successfully
 *       400:
 *         description: Validation error or incorrect current password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               validationError:
 *                 value:
 *                   message: "Current password is required"
 *               incorrectPassword:
 *                 value:
 *                   message: "Current password is incorrect"
 *               noPasswordFound:
 *                 value:
 *                   message: "No password found for this user"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/me/password", userController.changePassword);

/**
 * @swagger
 * /users/me:
 *   delete:
 *     summary: Delete current user profile
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     description: Permanently delete the current user's account and all associated data. This action cannot be undone.
 *     responses:
 *       204:
 *         description: User profile deleted successfully (no content)
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/me", userController.deleteMyProfile);

/**
 * @swagger
 * /users/me/profile-picture:
 *   post:
 *     summary: Upload profile picture
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Upload a profile picture for the current user.
 *       **Required:** multipart/form-data with a file field named "profilePicture"
 *       **Accepted formats:** JPEG, PNG, GIF, WebP
 *       **Maximum file size:** 5MB
 *       The uploaded file will be stored in the uploads/profile-pictures folder and its URL will be saved in the database.
 *       If the user already has a profile picture, the old one will be automatically deleted.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - profilePicture
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *                 description: Profile picture image file (JPEG, PNG, GIF, or WebP)
 *     responses:
 *       200:
 *         description: Profile picture uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profile picture uploaded successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     image:
 *                       type: string
 *                       description: URL to the uploaded profile picture
 *                       example: /uploads/profile-pictures/profile-1234567890-123456789.jpg
 *       400:
 *         description: Validation error or upload failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     noFile:
 *                       value: "No file uploaded. Please provide a profile picture."
 *                     invalidType:
 *                       value: "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
 *                     fileTooLarge:
 *                       value: "File too large. Maximum size is 5MB."
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/me/profile-picture", uploadProfilePicture.single("profilePicture"), userController.uploadProfilePicture);

/**
 * @swagger
 * /users/me/mall:
 *   patch:
 *     summary: Update user's selected mall
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Update the current user's selected mall preference.
 *       **Required fields:** mallId (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mallId]
 *             properties:
 *               mallId:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the mall to select
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *           example:
 *             mallId: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Mall selected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Mall selected successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     selectedMallId:
 *                       type: string
 *                     mall:
 *                       type: object
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
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Mall not found
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch(
    "/me/mall",
    userController.updateMyMall
  );

/**
 * @swagger
 * /users/me/country:
 *   patch:
 *     summary: Update user's selected country
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Update the current user's selected country preference.
 *       **Required fields:** countryId (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [countryId]
 *             properties:
 *               countryId:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the country to select
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *           example:
 *             countryId: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Country selected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Country selected successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     selectedCountryId:
 *                       type: string
 *                     country:
 *                       type: object
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
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Country not found
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch(
    "/me/country",
    userController.updateMyCountry
  );

/**
 * @swagger
 * /users/me/city:
 *   patch:
 *     summary: Update user's selected city
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Update the current user's selected city preference.
 *       **Required fields:** cityId (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cityId]
 *             properties:
 *               cityId:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the city to select
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *           example:
 *             cityId: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: City selected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: City selected successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     selectedCityId:
 *                       type: string
 *                     city:
 *                       type: object
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
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: City not found
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch(
    "/me/city",
    userController.updateMyCity
  );

/**
 * @swagger
 * /users/create-stripe-customer:
 *   post:
 *     summary: Create Stripe customer for current user
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Create a Stripe customer account for the authenticated user.
 *       This is required before adding payment methods.
 *       If the user already has a Stripe customer ID, the existing customer is returned.
 *       **No request body required.**
 *     responses:
 *       201:
 *         description: Stripe customer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Stripe customer created successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                     stripeCustomerId:
 *                       type: string
 *                       description: Stripe customer ID (e.g., cus_xxx)
 *                       example: "cus_ABC123def456GHI"
 *                     name:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: Unauthorized - user not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/create-stripe-customer",
  userController.createStripeCustomer
);

export default router;
