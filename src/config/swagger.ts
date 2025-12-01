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
                // Match Zod: firstName, lastName, password are required;
                // email or phoneNumber must be present (handled by Zod refine).
                required: ["firstName", "lastName", "password"],
                properties: {
                    firstName: {
                        type: "string",
                        minLength: 1,
                        example: "John",
                    },
                    lastName: {
                        type: "string",
                        minLength: 1,
                        example: "Doe",
                    },
                    email: {
                        type: "string",
                        format: "email",
                        example: "john@example.com",
                    },
                    phoneNumber: {
                        type: "string",
                        pattern: "^\\+?[1-9]\\d{9,14}$",
                        example: "+1234567890",
                    },
                    password: {
                        type: "string",
                        minLength: 6,
                        example: "password123",
                    },
                },
            },
            LoginRequest: {
                type: "object",
                required: ["password"],
                properties: {
                    email: {
                        type: "string",
                        format: "email",
                        example: "john@example.com",
                    },
                    phoneNumber: {
                        type: "string",
                        pattern: "^\\+?[1-9]\\d{9,14}$",
                        example: "+1234567890",
                    },
                    password: {
                        type: "string",
                        minLength: 6,
                        example: "password123",
                    },
                },
            },
            UpdateProfileRequest: {
                type: "object",
                properties: {
                    firstName: {
                        type: "string",
                        example: "John",
                    },
                    lastName: {
                        type: "string",
                        example: "Doe",
                    },
                    email: {
                        type: "string",
                        format: "email",
                        example: "john.doe@example.com",
                    },
                    phoneNumber: {
                        type: "string",
                        minLength: 11,
                        example: "12345678901",
                    },
                    image: {
                        type: "string",
                        format: "uri",
                        example: "https://example.com/image.jpg",
                    },
                },
            },
            ChangePasswordRequest: {
                type: "object",
                required: ["currentPassword", "newPassword"],
                properties: {
                    currentPassword: {
                        type: "string",
                        minLength: 6,
                        example: "oldpassword123",
                    },
                    newPassword: {
                        type: "string",
                        minLength: 6,
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

