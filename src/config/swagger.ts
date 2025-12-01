import swaggerJsdoc from "swagger-jsdoc";

const swaggerDefinition = {
    openapi: "3.0.0",
    info: {
        title: "Mall Food Delivery API",
        version: "1.0.0",
        description: "API documentation for Mall Food Delivery Application",
        contact: {
            name: "API Support",
        },
    },
    servers: [
        {
            url: "http://localhost:5000/api",
            description: "Development server",
        },
    ],
    components: {
        securitySchemes: {
            cookieAuth: {
                type: "apiKey",
                in: "cookie",
                name: "better-auth.session_token",
                description: "Session token stored in cookie after login",
            },
        },
        schemas: {
            RegisterRequest: {
                type: "object",
                required: ["firstName", "lastName", "password"],
                description: "User registration request. Either email OR phoneNumber must be provided (at least one is required).",
                properties: {
                    firstName: {
                        type: "string",
                        minLength: 1,
                        description: "User's first name (required)",
                        example: "John",
                    },
                    lastName: {
                        type: "string",
                        minLength: 1,
                        description: "User's last name (required)",
                        example: "Doe",
                    },
                    email: {
                        type: "string",
                        format: "email",
                        description: "User's email address (optional, but either email or phoneNumber must be provided)",
                        example: "john@example.com",
                    },
                    phoneNumber: {
                        type: "string",
                        pattern: "^\\+?[1-9]\\d{9,14}$",
                        description: "User's phone number in international format (optional, but either email or phoneNumber must be provided). Must match pattern: +?[1-9]\\d{9,14}",
                        example: "+1234567890",
                    },
                    password: {
                        type: "string",
                        minLength: 6,
                        description: "User's password (required, minimum 6 characters)",
                        example: "password123",
                    },
                },
            },
            LoginRequest: {
                type: "object",
                required: ["password"],
                description: "User login request. Either email OR phoneNumber must be provided along with password.",
                properties: {
                    email: {
                        type: "string",
                        format: "email",
                        description: "User's email address (optional, but either email or phoneNumber must be provided)",
                        example: "john@example.com",
                    },
                    phoneNumber: {
                        type: "string",
                        pattern: "^\\+?[1-9]\\d{9,14}$",
                        description: "User's phone number in international format (optional, but either email or phoneNumber must be provided). Must match pattern: +?[1-9]\\d{9,14}",
                        example: "+1234567890",
                    },
                    password: {
                        type: "string",
                        minLength: 6,
                        description: "User's password (required, minimum 6 characters)",
                        example: "password123",
                    },
                },
            },
            UpdateProfileRequest: {
                type: "object",
                description: "Update user profile. All fields are optional - send only the fields you want to update.",
                properties: {
                    firstName: {
                        type: "string",
                        minLength: 1,
                        description: "User's first name (optional, minimum 1 character if provided)",
                        example: "John",
                    },
                    lastName: {
                        type: "string",
                        minLength: 1,
                        description: "User's last name (optional, minimum 1 character if provided)",
                        example: "Doe",
                    },
                    email: {
                        type: "string",
                        format: "email",
                        description: "User's email address (optional, must be valid email format if provided)",
                        example: "john.doe@example.com",
                    },
                    phoneNumber: {
                        type: "string",
                        minLength: 11,
                        description: "User's phone number (optional, minimum 11 digits if provided). Will be normalized to digits only.",
                        example: "12345678901",
                    },
                    image: {
                        type: "string",
                        format: "uri",
                        description: "User's profile image URL (optional, must be valid URL format if provided)",
                        example: "https://example.com/image.jpg",
                    },
                },
            },
            ChangePasswordRequest: {
                type: "object",
                required: ["currentPassword", "newPassword"],
                description: "Change user password. Both current and new passwords are required.",
                properties: {
                    currentPassword: {
                        type: "string",
                        minLength: 6,
                        description: "User's current password (required, minimum 6 characters)",
                        example: "oldpassword123",
                    },
                    newPassword: {
                        type: "string",
                        minLength: 6,
                        description: "User's new password (required, minimum 6 characters)",
                        example: "newpassword123",
                    },
                },
            },
            Error: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        example: "Error message",
                    },
                },
            },
            ValidationError: {
                type: "object",
                properties: {
                    fieldErrors: {
                        type: "object",
                        additionalProperties: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                        },
                    },
                },
            },
        },
    },
    tags: [
        {
            name: "Health",
            description: "Health check endpoints",
        },
        {
            name: "Authentication",
            description: "User authentication endpoints",
        },
        {
            name: "Users",
            description: "User profile management endpoints",
        },
    ],
};

const options = {
    definition: swaggerDefinition,
    apis: ["./src/routes/**/*.ts", "./src/modules/**/*.routes.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);

