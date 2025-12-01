import {Router} from "express";
import {authController} from "./auth.controller";

const router = Router();

// Custom auth routes using Better Auth API

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     description: |
 *       Register a new user account. 
 *       **Required fields:** firstName, lastName, password
 *       **Optional but required (either one):** email OR phoneNumber
 *       At least one identifier (email or phoneNumber) must be provided.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           examples:
 *             withEmail:
 *               summary: Register with email
 *               value:
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 email: "john@example.com"
 *                 password: "password123"
 *             withPhone:
 *               summary: Register with phone number
 *               value:
 *                 firstName: "Jane"
 *                 lastName: "Smith"
 *                 phoneNumber: "+1234567890"
 *                 password: "password123"
 *             withBoth:
 *               summary: Register with both email and phone
 *               value:
 *                 firstName: "Bob"
 *                 lastName: "Johnson"
 *                 email: "bob@example.com"
 *                 phoneNumber: "+1987654321"
 *                 password: "password123"
 *     responses:
 *       201:
 *         description: User registered successfully. Session cookie is automatically set.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 redirect:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                   description: Session token (also set as cookie)
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *         headers:
 *           Set-Cookie:
 *             description: Session cookie is set automatically
 *             schema:
 *               type: string
 *               example: better-auth.session_token=abc123; HttpOnly; SameSite=Lax
 *       400:
 *         description: Validation error or registration failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.post("/register", authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     description: |
 *       Login with email/phone and password.
 *       **Required fields:** password
 *       **Optional but required (either one):** email OR phoneNumber
 *       At least one identifier (email or phoneNumber) must be provided along with password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             withEmail:
 *               summary: Login with email
 *               value:
 *                 email: "john@example.com"
 *                 password: "password123"
 *             withPhone:
 *               summary: Login with phone number
 *               value:
 *                 phoneNumber: "+1234567890"
 *                 password: "password123"
 *     responses:
 *       200:
 *         description: Login successful. Session cookie is automatically set.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 redirect:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                   description: Session token (also set as cookie)
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *         headers:
 *           Set-Cookie:
 *             description: Session cookie is set automatically
 *             schema:
 *               type: string
 *               example: better-auth.session_token=abc123; HttpOnly; SameSite=Lax
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Logout the current user and invalidate their session.
 *       The session cookie is automatically cleared.
 *       **No request body required.**
 *     responses:
 *       200:
 *         description: Logout successful. Session cookie is cleared.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 *       400:
 *         description: Logout failed (e.g., no session found)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/logout", authController.logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current session
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Get the current authenticated user's session information.
 *       **No request body required.**
 *       Returns user and session data if authenticated, or null if not authenticated.
 *     responses:
 *       200:
 *         description: Current session information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               nullable: true
 *               properties:
 *                 user:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                       nullable: true
 *                     lastName:
 *                       type: string
 *                       nullable: true
 *                     phoneNumber:
 *                       type: string
 *                       nullable: true
 *                 session:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     token:
 *                       type: string
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *             examples:
 *               authenticated:
 *                 value:
 *                   user:
 *                     id: "user-id"
 *                     email: "john@example.com"
 *                     name: "John Doe"
 *                   session:
 *                     id: "session-id"
 *                     token: "session-token"
 *               notAuthenticated:
 *                 value: null
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/me", authController.me);

export default router;
