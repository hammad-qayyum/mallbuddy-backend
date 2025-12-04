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
            CreateCuisineRequest: {
                type: "object",
                required: ["name"],
                description: "Request to create a new cuisine category. Image can be provided as a file upload (multipart/form-data) or as a URL string.",
                properties: {
                    name: {
                        type: "string",
                        minLength: 2,
                        maxLength: 50,
                        description: "Cuisine category name (required, 2-50 characters)",
                        example: "Chinese",
                    },
                    image: {
                        type: "string",
                        description: "Image URL (optional, if not uploading a file). Can also be uploaded as a file using multipart/form-data with field name 'image'.",
                        example: "https://example.com/chinese-cuisine.jpg",
                    },
                },
            },
            UpdateCuisineRequest: {
                type: "object",
                description: "Request to update a cuisine category. All fields are optional - send only the fields you want to update. Image can be provided as a file upload (multipart/form-data) or as a URL string.",
                properties: {
                    name: {
                        type: "string",
                        minLength: 2,
                        maxLength: 50,
                        description: "Cuisine category name (optional, 2-50 characters if provided)",
                        example: "Updated Chinese",
                    },
                    image: {
                        type: "string",
                        description: "Image URL (optional, if not uploading a file). Can also be uploaded as a file using multipart/form-data with field name 'image'.",
                        example: "https://example.com/updated-chinese-cuisine.jpg",
                    },
                },
            },
            CuisineCategory: {
                type: "object",
                description: "Cuisine category response object",
                properties: {
                    id: {
                        type: "string",
                        description: "Unique cuisine category identifier",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: {
                        type: "string",
                        description: "Cuisine category name",
                        example: "Chinese",
                    },
                    image: {
                        type: "string",
                        nullable: true,
                        description: "URL to the cuisine category image (if provided)",
                        example: "/uploads/cuisine-categories/chinese-1234567890.jpg",
                    },
                    mallId: {
                        type: "string",
                        description: "Mall ID where this category belongs",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                        description: "Creation timestamp",
                        example: "2024-01-01T00:00:00.000Z",
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                        description: "Last update timestamp",
                        example: "2024-01-01T00:00:00.000Z",
                    },
                },
            },
            // Location Schemas
            CreateCountryRequest: {
                type: "object",
                required: ["name"],
                description: "Request to create a new country",
                properties: {
                    name: {
                        type: "string",
                        minLength: 1,
                        maxLength: 100,
                        description: "Country name (required, 1-100 characters)",
                        example: "United States",
                    },
                },
            },
            UpdateCountryRequest: {
                type: "object",
                description: "Request to update a country. All fields are optional.",
                properties: {
                    name: {
                        type: "string",
                        minLength: 1,
                        maxLength: 100,
                        description: "Country name (optional, 1-100 characters if provided)",
                        example: "United States of America",
                    },
                },
            },
            Country: {
                type: "object",
                description: "Country response object",
                properties: {
                    id: {
                        type: "string",
                        description: "Unique country identifier",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: {
                        type: "string",
                        description: "Country name",
                        example: "United States",
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                        description: "Creation timestamp",
                        example: "2024-01-01T00:00:00.000Z",
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                        description: "Last update timestamp",
                        example: "2024-01-01T00:00:00.000Z",
                    },
                },
            },
            CreateCityRequest: {
                type: "object",
                required: ["name", "countryId"],
                description: "Request to create a new city",
                properties: {
                    name: {
                        type: "string",
                        minLength: 1,
                        maxLength: 100,
                        description: "City name (required, 1-100 characters)",
                        example: "New York",
                    },
                    countryId: {
                        type: "string",
                        format: "uuid",
                        description: "Country ID (required, must be a valid UUID)",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                },
            },
            UpdateCityRequest: {
                type: "object",
                description: "Request to update a city. All fields are optional.",
                properties: {
                    name: {
                        type: "string",
                        minLength: 1,
                        maxLength: 100,
                        description: "City name (optional, 1-100 characters if provided)",
                        example: "New York City",
                    },
                    countryId: {
                        type: "string",
                        format: "uuid",
                        description: "Country ID (optional, must be a valid UUID if provided)",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                },
            },
            City: {
                type: "object",
                description: "City response object",
                properties: {
                    id: {
                        type: "string",
                        description: "Unique city identifier",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: {
                        type: "string",
                        description: "City name",
                        example: "New York",
                    },
                    countryId: {
                        type: "string",
                        description: "Country ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                        description: "Creation timestamp",
                        example: "2024-01-01T00:00:00.000Z",
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                        description: "Last update timestamp",
                        example: "2024-01-01T00:00:00.000Z",
                    },
                },
            },
            CreateMallRequest: {
                type: "object",
                required: ["name", "cityId"],
                description: "Request to create a new mall. Image can be provided as a file upload (multipart/form-data) or as a URL string.",
                properties: {
                    name: {
                        type: "string",
                        minLength: 1,
                        maxLength: 150,
                        description: "Mall name (required, 1-150 characters)",
                        example: "Westfield Shopping Center",
                    },
                    address: {
                        type: "string",
                        maxLength: 255,
                        description: "Mall address (optional, max 255 characters)",
                        example: "123 Main Street, New York, NY 10001",
                    },
                    cityId: {
                        type: "string",
                        minLength: 1,
                        description: "City ID (required)",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    image: {
                        type: "string",
                        description: "Image URL (optional, if not uploading a file). Can also be uploaded as a file using multipart/form-data with field name 'image'.",
                        example: "https://example.com/mall-image.jpg",
                    },
                },
            },
            UpdateMallRequest: {
                type: "object",
                description: "Request to update a mall. All fields are optional. Image can be provided as a file upload (multipart/form-data) or as a URL string.",
                properties: {
                    name: {
                        type: "string",
                        minLength: 1,
                        maxLength: 150,
                        description: "Mall name (optional, 1-150 characters if provided)",
                        example: "Westfield Shopping Center Updated",
                    },
                    address: {
                        type: "string",
                        maxLength: 255,
                        description: "Mall address (optional, max 255 characters)",
                        example: "456 Updated Street, New York, NY 10001",
                    },
                    cityId: {
                        type: "string",
                        minLength: 1,
                        description: "City ID (optional)",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    image: {
                        type: "string",
                        description: "Image URL (optional, if not uploading a file). Can also be uploaded as a file using multipart/form-data with field name 'image'.",
                        example: "https://example.com/updated-mall-image.jpg",
                    },
                },
            },
            Mall: {
                type: "object",
                description: "Mall response object",
                properties: {
                    id: {
                        type: "string",
                        description: "Unique mall identifier",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: {
                        type: "string",
                        description: "Mall name",
                        example: "Westfield Shopping Center",
                    },
                    address: {
                        type: "string",
                        nullable: true,
                        description: "Mall address",
                        example: "123 Main Street, New York, NY 10001",
                    },
                    image: {
                        type: "string",
                        nullable: true,
                        description: "URL to the mall image (if provided)",
                        example: "/uploads/malls/mall-1234567890.jpg",
                    },
                    cityId: {
                        type: "string",
                        description: "City ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                        description: "Creation timestamp",
                        example: "2024-01-01T00:00:00.000Z",
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                        description: "Last update timestamp",
                        example: "2024-01-01T00:00:00.000Z",
                    },
                },
            },
            // Restaurant Schemas
            CreateRestaurantRequest: {
                type: "object",
                required: ["userId", "mallId", "mainCategory"],
                description: "Request to create a new restaurant. Banner can be provided as a file upload (multipart/form-data) or as a URL string.",
                properties: {
                    userId: {
                        type: "string",
                        description: "User ID (required, becomes the restaurant's primary key, must be a valid user ID)",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    mallId: {
                        type: "string",
                        description: "Mall ID where the restaurant is located (required)",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    mainCategory: {
                        type: "string",
                        description: "Main cuisine category (required, e.g., 'CHINESE', 'INDIAN', 'ITALIAN')",
                        example: "CHINESE",
                    },
                    banner: {
                        type: "string",
                        description: "Banner image URL (optional, if not uploading a file). Can also be uploaded as a file using multipart/form-data with field name 'banner'.",
                        example: "https://example.com/restaurant-banner.jpg",
                    },
                    description: {
                        type: "string",
                        description: "Restaurant description (optional)",
                        example: "Authentic Chinese cuisine",
                    },
                    location: {
                        type: "string",
                        description: "Restaurant location within the mall (optional)",
                        example: "Food Court, Level 2",
                    },
                },
            },
            UpdateRestaurantRequest: {
                type: "object",
                description: "Request to update a restaurant. All fields are optional. Banner can be provided as a file upload (multipart/form-data) or as a URL string. Note: userId cannot be updated (it's the primary key).",
                properties: {
                    mallId: {
                        type: "string",
                        description: "Mall ID (optional)",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    mainCategory: {
                        type: "string",
                        description: "Main cuisine category (optional)",
                        example: "INDIAN",
                    },
                    banner: {
                        type: "string",
                        description: "Banner image URL (optional, if not uploading a file). Can also be uploaded as a file using multipart/form-data with field name 'banner'.",
                        example: "https://example.com/updated-banner.jpg",
                    },
                    description: {
                        type: "string",
                        description: "Restaurant description (optional)",
                        example: "Updated restaurant description",
                    },
                    location: {
                        type: "string",
                        description: "Restaurant location within the mall (optional)",
                        example: "Food Court, Level 3",
                    },
                },
            },
            Restaurant: {
                type: "object",
                description: "Restaurant response object",
                properties: {
                    userId: {
                        type: "string",
                        description: "User ID (primary key, same as restaurant ID)",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    mallId: {
                        type: "string",
                        description: "Mall ID where the restaurant is located",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    mainCategory: {
                        type: "string",
                        description: "Main cuisine category",
                        example: "CHINESE",
                    },
                    banner: {
                        type: "string",
                        nullable: true,
                        description: "URL to the restaurant banner (if provided)",
                        example: "/uploads/restaurants/banner-1234567890.jpg",
                    },
                    description: {
                        type: "string",
                        nullable: true,
                        description: "Restaurant description",
                        example: "Authentic Chinese cuisine",
                    },
                    location: {
                        type: "string",
                        nullable: true,
                        description: "Restaurant location within the mall",
                        example: "Food Court, Level 2",
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                        description: "Creation timestamp",
                        example: "2024-01-01T00:00:00.000Z",
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                        description: "Last update timestamp",
                        example: "2024-01-01T00:00:00.000Z",
                    },
                },
            },
            // Menu Schemas
            CreateMenuCategoryRequest: {
                type: "object",
                required: ["restaurantId", "name"],
                description: "Request to create a new menu category",
                properties: {
                    restaurantId: {
                        type: "string",
                        description: "Restaurant ID (required)",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: {
                        type: "string",
                        minLength: 2,
                        maxLength: 50,
                        description: "Menu category name (required, 2-50 characters)",
                        example: "Appetizers",
                    },
                },
            },
            UpdateMenuCategoryRequest: {
                type: "object",
                description: "Request to update a menu category. All fields are optional. Note: restaurantId cannot be updated (it's a foreign key).",
                properties: {
                    name: {
                        type: "string",
                        minLength: 2,
                        maxLength: 50,
                        description: "Menu category name (optional, 2-50 characters if provided)",
                        example: "Updated Appetizers",
                    },
                },
            },
            MenuCategory: {
                type: "object",
                description: "Menu category response object",
                properties: {
                    id: {
                        type: "string",
                        description: "Unique menu category identifier",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: {
                        type: "string",
                        description: "Menu category name",
                        example: "Appetizers",
                    },
                    restaurantId: {
                        type: "string",
                        description: "Restaurant ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                        description: "Creation timestamp",
                        example: "2024-01-01T00:00:00.000Z",
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                        description: "Last update timestamp",
                        example: "2024-01-01T00:00:00.000Z",
                    },
                },
            },
            CreateMenuItemRequest: {
                type: "object",
                required: ["menuCategoryId", "name", "price"],
                description: "Request to create a new menu item. Image can be provided as a file upload (multipart/form-data) or as a URL string.",
                properties: {
                    menuCategoryId: {
                        type: "string",
                        description: "Menu category ID (required)",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: {
                        type: "string",
                        minLength: 1,
                        description: "Item name (required, minimum 1 character)",
                        example: "Spring Rolls",
                    },
                    description: {
                        type: "string",
                        description: "Item description (optional)",
                        example: "Crispy spring rolls with vegetables",
                    },
                    price: {
                        type: "string",
                        description: "Item price (required, must be a positive number)",
                        example: 8.99,
                    },
                    preparationTime: {
                        type: "string",
                        description: "Preparation time (optional)",
                        example: "15 minutes",
                    },
                    image: {
                        type: "string",
                        description: "Image URL (optional, if not uploading a file). Can also be uploaded as a file using multipart/form-data with field name 'image'.",
                        example: "https://example.com/spring-rolls.jpg",
                    },
                },
            },
            UpdateMenuItemRequest: {
                type: "object",
                description: "Request to update a menu item. All fields are optional. Image can be provided as a file upload (multipart/form-data) or as a URL string. Note: menuCategoryId cannot be updated (it's a foreign key).",
                properties: {
                    name: {
                        type: "string",
                        minLength: 1,
                        description: "Item name (optional, minimum 1 character if provided)",
                        example: "Updated Spring Rolls",
                    },
                    description: {
                        type: "string",
                        description: "Item description (optional)",
                        example: "Updated description",
                    },
                    price: {
                        type: "number",
                        description: "Item price (optional, must be a positive number if provided)",
                        example: 9.99,
                    },
                    preparationTime: {
                        type: "string",
                        description: "Preparation time (optional)",
                        example: "20 minutes",
                    },
                    image: {
                        type: "string",
                        description: "Image URL (optional, if not uploading a file). Can also be uploaded as a file using multipart/form-data with field name 'image'.",
                        example: "https://example.com/updated-spring-rolls.jpg",
                    },
                },
            },
            MenuItem: {
                type: "object",
                description: "Menu item response object",
                properties: {
                    id: {
                        type: "string",
                        description: "Unique menu item identifier",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: {
                        type: "string",
                        description: "Item name",
                        example: "Spring Rolls",
                    },
                    description: {
                        type: "string",
                        nullable: true,
                        description: "Item description",
                        example: "Crispy spring rolls with vegetables",
                    },
                    price: {
                        type: "number",
                        description: "Item price",
                        example: 8.99,
                    },
                    preparationTime: {
                        type: "string",
                        nullable: true,
                        description: "Preparation time",
                        example: "15 minutes",
                    },
                    image: {
                        type: "string",
                        nullable: true,
                        description: "URL to the menu item image (if provided)",
                        example: "/uploads/menu-items/spring-rolls-1234567890.jpg",
                    },
                    categoryId: {
                        type: "string",
                        description: "Menu category ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                        description: "Creation timestamp",
                        example: "2024-01-01T00:00:00.000Z",
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                        description: "Last update timestamp",
                        example: "2024-01-01T00:00:00.000Z",
                    },
                },
            },
            // User Schemas
            UpdateUserMallRequest: {
                type: "object",
                required: ["mallId"],
                description: "Request to update user's selected mall",
                properties: {
                    mallId: {
                        type: "string",
                        format: "uuid",
                        description: "Mall ID (required, must be a valid UUID)",
                        example: "123e4567-e89b-12d3-a456-426614174000",
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
        {
            name: "Location",
            description: "Location management endpoints (Countries, Cities, Malls)",
        },
        {
            name: "Cuisine",
            description: "Cuisine category management endpoints",
        },
        {
            name: "Restaurants",
            description: "Restaurant management endpoints",
        },
        {
            name: "Menu",
            description: "Menu category and item management endpoints",
        },
    ],
};

const options = {
    definition: swaggerDefinition,
    apis: ["./src/routes/**/*.ts", "./src/modules/**/*.routes.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);

