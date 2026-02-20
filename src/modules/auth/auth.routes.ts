import {Router} from "express";
import rateLimit from "express-rate-limit";
import {authController} from "./auth.controller";

const router = Router();

// Rate limiter for OTP requests (5 requests per 15 minutes per IP)
const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many OTP requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Custom auth routes using Better Auth API

/**
 * @swagger
 * /auth/user/signup/request-otp:
 *   post:
 *     summary: Request or resend OTP for user signup
 *     tags: [Authentication]
 *     description: |
 *       Request a verification code (OTP) to be sent to email or phone number for user signup.
 *       **Can be called multiple times to resend OTP** if user didn't receive it.
 *       
 *       **Flow:**
 *       1. Call this endpoint to request OTP
 *       2. User receives OTP via email/SMS
 *       3. Call `/auth/user/signup/verify-otp` with the OTP to get verificationToken
 *       4. Use verificationToken in `/auth/user/signup/complete-profile` to create account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *           examples:
 *             withEmail:
 *               value:
 *                 email: "user@example.com"
 *             withPhone:
 *               value:
 *                 phoneNumber: "+1234567890"
 *     responses:
 *       200:
 *         description: OTP sent successfully. Use the OTP in verify-otp endpoint to get verificationToken.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "OTP sent to email"
 *                 otp:
 *                   type: string
 *                   description: OTP code (only in development mode)
 *                   example: "123456"
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email/phone already registered
 *       429:
 *         description: Too many requests
 */
router.post("/user/signup/request-otp", otpRateLimiter, authController.requestUserSignupOTP);

/**
 * @swagger
 * /auth/user/signup/resend-otp:
 *   post:
 *     summary: Resend OTP for user signup
 *     tags: [Authentication]
 *     description: Resend a verification code (OTP) to email or phone number for user signup. Same as request-otp but explicitly for resending.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email/phone already registered
 *       429:
 *         description: Too many requests
 */
router.post("/user/signup/resend-otp", otpRateLimiter, authController.resendUserSignupOTP);

/**
 * @swagger
 * /auth/user/signup/verify-otp:
 *   post:
 *     summary: Verify OTP for user signup
 *     tags: [Authentication]
 *     description: |
 *       Verify the OTP code sent to email or phone number for user signup.
 *       Returns a verificationToken that must be used in the complete-profile endpoint.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *               otp:
 *                 type: string
 *                 length: 6
 *           examples:
 *             withEmail:
 *               value:
 *                 email: "user@example.com"
 *                 otp: "123456"
 *             withPhone:
 *               value:
 *                 phoneNumber: "+1234567890"
 *                 otp: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully. Returns verificationToken for use in complete-profile.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "OTP verified successfully"
 *                 verified:
 *                   type: boolean
 *                   example: true
 *                 verificationToken:
 *                   type: string
 *                   description: Token to use in complete-profile endpoint
 *                   example: "vrf_1234567890_abc123"
 *                 identifier:
 *                   type: string
 *                   description: The verified email or phone number
 *                   example: "user@example.com"
 *                 identifierType:
 *                   type: string
 *                   enum: [email, phone]
 *                   example: "email"
 *       400:
 *         description: Invalid or expired OTP
 */
router.post("/user/signup/verify-otp", authController.verifyUserSignupOTP);

/**
 * @swagger
 * /auth/user/signup/complete-profile:
 *   post:
 *     summary: Complete user profile and create account
 *     tags: [Authentication]
 *     description: Complete user profile and create account after OTP verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, verificationToken]
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: User's first name
 *               lastName:
 *                 type: string
 *                 description: User's last name
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Optional - password for account. If not provided, user must set password later via /auth/set-password
 *               verificationToken:
 *                 type: string
 *                 description: Verification token received from verify-otp endpoint. Automatically contains the verified identifier (email or phone).
 *                 example: "vrf_1234567890_abc123"
 *               phoneNumber:
 *                 type: string
 *                 description: |
 *                   Optional - add phone number if you verified with **email**.
 *                   The verified email will be used as primary identifier, and this phone will be added as secondary (unverified).
 *                   Format: E.164 (e.g., +1234567890)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: |
 *                   Optional - add email if you verified with **phone number**.
 *                   The verified phone will be used as primary identifier, and this email will be added as secondary (unverified).
 *           examples:
 *             verifiedWithEmail:
 *               summary: Verified with email - can add phone
 *               value:
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 password: "password123"
 *                 verificationToken: "vrf_1234567890_abc123"
 *                 phoneNumber: "+1234567890"
 *               description: User verified email via OTP, now adding phone number
 *             verifiedWithPhone:
 *               summary: Verified with phone - can add email
 *               value:
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 password: "password123"
 *                 verificationToken: "vrf_1234567890_abc123"
 *                 email: "user@example.com"
 *               description: User verified phone via OTP, now adding email
 *             withPassword:
 *               summary: Complete profile with password (no additional identifier)
 *               value:
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 password: "password123"
 *                 verificationToken: "vrf_1234567890_abc123"
 *             withoutPassword:
 *               summary: Complete profile without password (set later)
 *               value:
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 verificationToken: "vrf_1234567890_abc123"
 *     responses:
 *       201:
 *         description: Account created successfully. Returns user data and indicates if password needs to be set.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Account created successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                 requiresPassword:
 *                   type: boolean
 *                   description: True if password was not provided and needs to be set
 *                   example: false
 *             examples:
 *               withPassword:
 *                 value:
 *                   message: "Account created successfully"
 *                   user:
 *                     id: "user-id"
 *                     email: "user@example.com"
 *                     name: "John Doe"
 *               withoutPassword:
 *                 value:
 *                   message: "Account created successfully. Please set your password using /auth/set-password endpoint."
 *                   user:
 *                     id: "user-id"
 *                     email: "user@example.com"
 *                     name: "John Doe"
 *                   requiresPassword: true
 *       400:
 *         description: Validation error or account creation failed
 *       409:
 *         description: Account already exists
 */
router.post("/user/signup/complete-profile", authController.completeUserProfile);

/**
 * @swagger
 * /auth/restaurant/signup/request-otp:
 *   post:
 *     summary: Request or resend OTP for restaurant signup
 *     tags: [Authentication]
 *     description: |
 *       Request a verification code (OTP) to be sent to email or phone number for restaurant signup.
 *       **Can be called multiple times to resend OTP** if user didn't receive it.
 *       
 *       **Flow:**
 *       1. Call this endpoint to request OTP
 *       2. User receives OTP via email/SMS
 *       3. Call `/auth/restaurant/signup/verify-otp` with the OTP to get verificationToken
 *       4. Use verificationToken in `/auth/restaurant/signup/complete-profile` to create account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent successfully. Use the OTP in verify-otp endpoint to get verificationToken.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "OTP sent to email"
 *                 otp:
 *                   type: string
 *                   description: OTP code (only in development mode)
 *                   example: "123456"
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email/phone already registered as restaurant
 *       429:
 *         description: Too many requests
 */
router.post("/restaurant/signup/request-otp", otpRateLimiter, authController.requestRestaurantSignupOTP);

/**
 * @swagger
 * /auth/restaurant/signup/resend-otp:
 *   post:
 *     summary: Resend OTP for restaurant signup
 *     tags: [Authentication]
 *     description: Resend a verification code (OTP) to email or phone number for restaurant signup. Same as request-otp but explicitly for resending.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email/phone already registered
 *       429:
 *         description: Too many requests
 */
router.post("/restaurant/signup/resend-otp", otpRateLimiter, authController.resendRestaurantSignupOTP);

/**
 * @swagger
 * /auth/restaurant/signup/verify-otp:
 *   post:
 *     summary: Verify OTP for restaurant signup
 *     tags: [Authentication]
 *     description: |
 *       Verify the OTP code sent to email or phone number for restaurant signup.
 *       Returns a verificationToken that must be used in the complete-profile endpoint.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *               otp:
 *                 type: string
 *                 length: 6
 *           examples:
 *             withEmail:
 *               value:
 *                 email: "restaurant@example.com"
 *                 otp: "123456"
 *             withPhone:
 *               value:
 *                 phoneNumber: "+1234567890"
 *                 otp: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully. Returns verificationToken for use in complete-profile.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "OTP verified successfully"
 *                 verified:
 *                   type: boolean
 *                   example: true
 *                 verificationToken:
 *                   type: string
 *                   description: Token to use in complete-profile endpoint
 *                   example: "vrf_1234567890_abc123"
 *                 identifier:
 *                   type: string
 *                   description: The verified email or phone number
 *                   example: "restaurant@example.com"
 *                 identifierType:
 *                   type: string
 *                   enum: [email, phone]
 *                   example: "email"
 *       400:
 *         description: Invalid or expired OTP
 */
router.post("/restaurant/signup/verify-otp", authController.verifyRestaurantSignupOTP);

/**
 * @swagger
 * /auth/restaurant/signup/complete-profile:
 *   post:
 *     summary: Complete restaurant profile and create account
 *     tags: [Authentication]
 *     description: Complete restaurant profile and create account after OTP verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [verificationToken, name, location, description, phoneNumber, mallId]
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: Restaurant owner's first name (optional)
 *               lastName:
 *                 type: string
 *                 description: Restaurant owner's last name (optional)
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Optional - password for account. If not provided, user must set password later via /auth/set-password
 *               verificationToken:
 *                 type: string
 *                 description: Verification token received from verify-otp endpoint. Automatically contains the verified identifier (email or phone).
 *                 example: "vrf_1234567890_abc123"
 *               phoneNumber:
 *                 type: string
 *                 description: |
 *                   Required field for restaurant. If you verified with **email**, provide your phone number here (will be marked as unverified).
 *                   If you verified with **phone**, this should match your verified phone or can be omitted (will use verified phone).
 *                   Format: E.164 (e.g., +1234567890)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: |
 *                   Optional - add email if you verified with **phone number**.
 *                   The verified phone will be used as primary identifier, and this email will be added as secondary (unverified).
 *               name:
 *                 type: string
 *               location:
 *                 type: string
 *               description:
 *                 type: string
 *               mallId:
 *                 type: string
 *               mainCategory:
 *                 type: string
 *               cuisineCategoryId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Restaurant account created successfully. Returns user and restaurant data, and indicates if password needs to be set.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Restaurant account created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                           example: "RESTAURANT"
 *                     restaurant:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: string
 *                         name:
 *                           type: string
 *                         mallId:
 *                           type: string
 *                 requiresPassword:
 *                   type: boolean
 *                   description: True if password was not provided and needs to be set
 *                   example: false
 *             examples:
 *               withPassword:
 *                 value:
 *                   message: "Restaurant account created successfully"
 *                   data:
 *                     user:
 *                       id: "user-id"
 *                       email: "restaurant@example.com"
 *                       role: "RESTAURANT"
 *                     restaurant:
 *                       userId: "user-id"
 *                       name: "My Restaurant"
 *               withoutPassword:
 *                 value:
 *                   message: "Restaurant account created successfully. Please set your password using /auth/set-password endpoint."
 *                   data:
 *                     user:
 *                       id: "user-id"
 *                       email: "restaurant@example.com"
 *                       role: "RESTAURANT"
 *                     restaurant:
 *                       userId: "user-id"
 *                       name: "My Restaurant"
 *                   requiresPassword: true
 *       400:
 *         description: Validation error or account creation failed
 *       409:
 *         description: Account already exists
 */
router.post("/restaurant/signup/complete-profile", authController.completeRestaurantProfile);

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
 *       
 *       **Note:** If user has both email and phone number in their account, they can login with **either** one.
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

/**
 * @swagger
 * /auth/restaurant/signup:
 *   post:
 *     summary: Restaurant owner signup
 *     tags: [Authentication]
 *     description: |
 *       Restaurant owner self-signup. Creates a new User with role RESTAURANT and a Restaurant profile atomically.
 *       Returns user, restaurant, and session for immediate login.
 *       **Required fields:** email, password, name, location, description, phoneNumber
 *       **Optional fields:** firstName, lastName, mallId, mainCategory, cuisineCategoryId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name, location, description, phoneNumber]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Restaurant owner email
 *                 example: "rozna.restaurant@gmail.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Password (minimum 8 characters)
 *               phoneNumber:
 *                 type: string
 *                 description: Restaurant phone number
 *                 example: "+968-24-857392"
 *               name:
 *                 type: string
 *                 description: Restaurant name
 *                 example: "Rozna Restaurant"
 *               location:
 *                 type: string
 *                 description: Restaurant address/location
 *                 example: "Food Court, Level 2, Mall Name"
 *               description:
 *                 type: string
 *                 description: Restaurant details/description
 *                 example: "Authentic Chinese cuisine with family recipes"
 *               firstName:
 *                 type: string
 *                 description: Restaurant owner first name (optional)
 *               lastName:
 *                 type: string
 *                 description: Restaurant owner last name (optional)
 *               mallId:
 *                 type: string
 *                 description: Mall ID where restaurant is located (optional, can be set later)
 *               mainCategory:
 *                 type: string
 *                 description: Main cuisine category (optional)
 *               cuisineCategoryId:
 *                 type: string
 *                 description: Cuisine category ID (optional)
 *           examples:
 *             basic:
 *               summary: Basic restaurant signup
 *               value:
 *                 email: "rozna.restaurant@gmail.com"
 *                 password: "password123"
 *                 name: "Rozna Restaurant"
 *                 location: "Food Court, Level 2"
 *                 description: "Authentic Chinese cuisine"
 *                 phoneNumber: "+968-24-857392"
 *             complete:
 *               summary: Complete restaurant signup
 *               value:
 *                 email: "rozna.restaurant@gmail.com"
 *                 password: "password123"
 *                 phoneNumber: "+968-24-857392"
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 name: "Rozna Restaurant"
 *                 location: "Food Court, Level 2, Central Mall"
 *                 description: "Authentic Chinese cuisine with family recipes since 1990"
 *                 mallId: "123e4567-e89b-12d3-a456-426614174000"
 *                 mainCategory: "CHINESE"
 *     responses:
 *       201:
 *         description: Restaurant account created successfully. Session cookie is automatically set.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                           example: "RESTAURANT"
 *                     restaurant:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: string
 *                         mallId:
 *                           type: string
 *                         name:
 *                           type: string
 *                         onboardingCompleted:
 *                           type: boolean
 *                           example: false
 *         headers:
 *           Set-Cookie:
 *             description: Session cookie is set automatically
 *       400:
 *         description: Validation error or signup failed
 *       409:
 *         description: Email already registered
 */
router.post("/restaurant/signup", authController.restaurantSignup);

/**
 * @swagger
 * /auth/set-password:
 *   post:
 *     summary: Set password for authenticated user
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Set password for user account if not already set.
 *       **Required:** User must be authenticated
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password set successfully
 *       400:
 *         description: Password already set or validation error
 *       401:
 *         description: Not authenticated
 */
router.post("/set-password", authController.setPassword);

/**
 * @swagger
 * /auth/password/reset/request-otp:
 *   post:
 *     summary: Request OTP for password reset
 *     tags: [Authentication]
 *     description: Request a verification code (OTP) to reset password. User must provide email or phone number associated with their account.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *           examples:
 *             withEmail:
 *               value:
 *                 email: "user@example.com"
 *             withPhone:
 *               value:
 *                 phoneNumber: "+1234567890"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: No account found with this email/phone
 *       429:
 *         description: Too many requests
 */
router.post("/password/reset/request-otp", otpRateLimiter, authController.requestPasswordReset);

/**
 * @swagger
 * /auth/password/reset/verify-otp:
 *   post:
 *     summary: Verify OTP for password reset
 *     tags: [Authentication]
 *     description: Verify the OTP code sent for password reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp]
 *             properties:
 *               email:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               otp:
 *                 type: string
 *                 length: 6
 *     responses:
 *       200:
 *         description: OTP verified successfully, returns verification token
 *       400:
 *         description: Invalid or expired OTP
 */
router.post("/password/reset/verify-otp", authController.verifyPasswordResetOTP);

/**
 * @swagger
 * /auth/password/reset:
 *   post:
 *     summary: Reset password using verification token
 *     tags: [Authentication]
 *     description: Reset password using the verification token received from verify-otp endpoint
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [verificationToken, newPassword]
 *             properties:
 *               verificationToken:
 *                 type: string
 *                 description: Token received from verify-otp endpoint
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid token or validation error
 *       404:
 *         description: User not found
 */
router.post("/password/reset", authController.resetPassword);



export default router;
