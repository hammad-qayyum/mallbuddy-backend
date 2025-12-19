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
            // The application mounts API routes under `/api` in `app.ts`.
            // Point Swagger requests to the mounted API so "Try it" calls hit the correct paths.
            url: "http://localhost:5000/api",
            description: "Development server (API root)",
        },
    ],
    paths: {
        "/restaurant/{restaurantId}/gallery": {
            post: {
                tags: ["Restaurants"],
                summary: "Upload gallery images for a restaurant",
                parameters: [
                    {
                        name: "restaurantId",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "Restaurant (user) id",
                    },
                ],
                requestBody: {
                    required: false,
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                properties: {
                                    images: {
                                        type: "array",
                                        items: { type: "string", format: "binary" },
                                        description: "One or more image files",
                                    },
                                    imageUrls: {
                                        type: "string",
                                        description: "Optional comma-separated image URLs or JSON array string",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Gallery images added",
                        content: {
                            "application/json": {
                                schema: { type: "array", items: { $ref: "#/components/schemas/RestaurantGallery" } },
                            },
                        },
                    },
                    "400": { description: "Bad request", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                },
                security: [{ cookieAuth: [] }],
            },
        },
        "/restaurant/{restaurantId}/gallery/{galleryId}": {
            delete: {
                tags: ["Restaurants"],
                summary: "Delete a gallery image",
                parameters: [
                    { name: "restaurantId", in: "path", required: true, schema: { type: "string" } },
                    { name: "galleryId", in: "path", required: true, schema: { type: "string" } },
                ],
                responses: {
                    "200": { description: "Deleted gallery image", content: { "application/json": { schema: { $ref: "#/components/schemas/RestaurantGallery" } } } },
                    "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                },
                security: [{ cookieAuth: [] }],
            },
        },
        "/restaurant/test/{restaurantId}": {
            get: {
                tags: ["Restaurants"],
                summary: "Get test bundle for a restaurant (details + explore + gallery + story)",
                parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Test bundle", content: { "application/json": { schema: { $ref: "#/components/schemas/TestRestaurantBundle" } } } },
                },
            },
        },
        "/explore/restaurants": {
            get: {
                tags: ["Restaurants"],
                summary: "Get explore restaurants (cards)",
                responses: {
                    "200": { description: "List of explore restaurants", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/ExploreRestaurantSummary" } } } } },
                },
            },
        },
        "/explore/restaurants/{restaurantId}": {
            get: {
                tags: ["Restaurants"],
                summary: "Get explore restaurant detail",
                parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Explore restaurant detail", content: { "application/json": { schema: { $ref: "#/components/schemas/ExploreRestaurantDetail" } } } },
                },
            },
        },
        "/explore/restaurants/{restaurantId}/gallery": {
            get: {
                tags: ["Restaurants"],
                summary: "Get only gallery images for an explore restaurant",
                parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Gallery images", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/RestaurantGallery" } } } } },
                },
            },
        },
        "/explore/restaurants/{restaurantId}/story": {
            get: {
                tags: ["Restaurants"],
                summary: "Get only story for an explore restaurant",
                parameters: [{ name: "restaurantId", in: "path", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Story text", content: { "application/json": { schema: { type: "object", properties: { story: { type: "string", nullable: true } } } } } },
                },
            },
        },
        "/search": {
            get: {
                tags: ["Search"],
                summary: "Search restaurants or foods by query string",
                parameters: [
                    { name: "q", in: "query", required: true, schema: { type: "string" }, description: "Search query string" }
                ],
                responses: {
                    "200": {
                        description: "Search results (restaurants list)",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean" },
                                        totalResults: { type: "integer" },
                                        data: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    id: { type: "string" },
                                                    name: { type: "string" },
                                                    image: { type: "string", nullable: true },
                                                    location: { type: "string", nullable: true },
                                                    isFavorite: { type: "boolean" },
                                                    cuisine: { type: "string", nullable: true },
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "404": { description: "No restaurant results found - returns 'Sorry Not found'" },
                    "400": { description: "Invalid request" },
                }
            }
        },
    },
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
                    cuisineCategoryId: {
                        type: "string",
                        description: "Optional cuisine category id (references CuisineCategory)",
                        example: "123e4567-e89b-12d3-a456-426614174000",
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
                    cuisineCategoryId: {
                        type: "string",
                        description: "Optional cuisine category id (references CuisineCategory)",
                        example: "123e4567-e89b-12d3-a456-426614174000",
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
                    name: {
                        type: "string",
                        description: "Restaurant name",
                        example: "John's Noodles",
                    },
                    cuisineCategoryId: {
                        type: "string",
                        nullable: true,
                        description: "Cuisine category id assigned to this restaurant (nullable)",
                        example: "123e4567-e89b-12d3-a456-426614174000",
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
                    gallery: {
                        type: "array",
                        description: "List of gallery images for this restaurant (if any)",
                        items: {
                            $ref: "#/components/schemas/RestaurantGallery",
                        },
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
            RestaurantGallery: {
                type: "object",
                description: "Single gallery image entry for a restaurant",
                properties: {
                    id: {
                        type: "string",
                        description: "Gallery image id",
                        example: "gallery-001",
                    },
                    imageUrl: {
                        type: "string",
                        description: "Image path or URL",
                        example: "/uploads/restaurants/gallery-001.jpg",
                    },
                },
            },
            ExploreRestaurantSummary: {
                type: "object",
                description: "Minimal restaurant card used in Explore lists",
                properties: {
                    userId: { type: "string" },
                    name: { type: "string" },
                    banner: { type: "string", nullable: true },
                    mainCategory: { type: "string" },
                    cuisineCategoryId: { type: "string", nullable: true },
                    description: { type: "string", nullable: true },
                    location: { type: "string", nullable: true },
                },
            },
            ExploreRestaurantDetail: {
                type: "object",
                description: "Detailed explore response for a single restaurant",
                properties: {
                    restaurant: { $ref: "#/components/schemas/Restaurant" },
                    story: { type: "string", nullable: true },
                    gallery: { type: "array", items: { $ref: "#/components/schemas/RestaurantGallery" } },
                },
            },
            TestRestaurantBundle: {
                type: "object",
                description: "Combined bundle for testing: details, explore-format data, gallery and story",
                properties: {
                    details: { $ref: "#/components/schemas/Restaurant" },
                    explore: { $ref: "#/components/schemas/ExploreRestaurantSummary" },
                    gallery: { type: "array", items: { $ref: "#/components/schemas/RestaurantGallery" } },
                    story: { type: "string", nullable: true },
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
                        type: "number",
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
            UpdateUserCountryRequest: {
                type: "object",
                required: ["countryId"],
                description: "Request to update user's selected country",
                properties: {
                    countryId: {
                        type: "string",
                        format: "uuid",
                        description: "Country ID (required, must be a valid UUID)",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                },
            },
            UpdateUserCityRequest: {
                type: "object",
                required: ["cityId"],
                description: "Request to update user's selected city",
                properties: {
                    cityId: {
                        type: "string",
                        format: "uuid",
                        description: "City ID (required, must be a valid UUID)",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                },
            },
            User: {
                type: "object",
                description: "User response object with profile information",
                properties: {
                    id: {
                        type: "string",
                        format: "uuid",
                        description: "Unique user identifier",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    email: {
                        type: "string",
                        format: "email",
                        description: "User's email address",
                        example: "john.doe@example.com",
                    },
                    firstName: {
                        type: "string",
                        nullable: true,
                        description: "User's first name",
                        example: "John",
                    },
                    lastName: {
                        type: "string",
                        nullable: true,
                        description: "User's last name",
                        example: "Doe",
                    },
                    name: {
                        type: "string",
                        nullable: true,
                        description: "Full name (auto-generated from firstName + lastName)",
                        example: "John Doe",
                    },
                    phoneNumber: {
                        type: "string",
                        nullable: true,
                        description: "User's phone number (normalized, digits only)",
                        example: "12345678901",
                    },
                    image: {
                        type: "string",
                        nullable: true,
                        description: "URL to user's profile image",
                        example: "/uploads/profile-pictures/profile-1234567890.jpg",
                    },
                    role: {
                        type: "string",
                        enum: ["USER", "ADMIN", "VENDOR", "DELIVERY_PERSON"],
                        description: "User's role",
                        example: "USER",
                    },
                    selectedCountryId: {
                        type: "string",
                        format: "uuid",
                        nullable: true,
                        description: "Selected country ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    selectedCityId: {
                        type: "string",
                        format: "uuid",
                        nullable: true,
                        description: "Selected city ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    selectedMallId: {
                        type: "string",
                        format: "uuid",
                        nullable: true,
                        description: "Selected mall ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    country: {
                        type: "object",
                        nullable: true,
                        description: "Selected country details",
                        properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                        },
                    },
                    city: {
                        type: "object",
                        nullable: true,
                        description: "Selected city details",
                        properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                        },
                    },
                    mall: {
                        type: "object",
                        nullable: true,
                        description: "Selected mall details",
                        properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                        },
                    },
                    userVerified: {
                        type: "boolean",
                        description: "Whether the user is verified",
                        example: false,
                    },
                    emailVerified: {
                        type: "boolean",
                        nullable: true,
                        description: "Whether the email is verified",
                        example: false,
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                        description: "Account creation timestamp",
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
            // Product Detail Schemas
            ProductDetail: {
                type: "object",
                description: "Complete product detail with variations and add-ons",
                properties: {
                    id: {
                        type: "string",
                        description: "Product ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: {
                        type: "string",
                        description: "Product name",
                        example: "Smoky bacon & halloumi flatbread",
                    },
                    description: {
                        type: "string",
                        nullable: true,
                        description: "Product description",
                        example: "Delicious flatbread with smoky bacon and halloumi cheese",
                    },
                    price: {
                        type: "number",
                        description: "Base price",
                        example: 4.40,
                    },
                    image: {
                        type: "string",
                        nullable: true,
                        description: "Product image URL",
                        example: "/uploads/menu-items/flatbread.jpg",
                    },
                    preparationTime: {
                        type: "string",
                        nullable: true,
                        description: "Estimated preparation time",
                        example: "15-20 minutes",
                    },
                    category: {
                        type: "object",
                        description: "Category information",
                        properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            restaurant: {
                                type: "object",
                                properties: {
                                    userId: { type: "string" },
                                    mainCategory: { type: "string" },
                                },
                            },
                        },
                    },
                    variations: {
                        type: "array",
                        description: "Product variations (e.g., Size, Crust Type)",
                        items: {
                            $ref: "#/components/schemas/ProductVariation",
                        },
                    },
                    addOns: {
                        type: "array",
                        description: "Product add-ons (e.g., Extra Toppings)",
                        items: {
                            $ref: "#/components/schemas/ProductAddOn",
                        },
                    },
                },
            },
            CreateProductVariationRequest: {
                type: "object",
                required: ["menuItemId", "name", "type"],
                description: "Request to create a product variation",
                properties: {
                    menuItemId: {
                        type: "string",
                        format: "uuid",
                        description: "Menu item ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: {
                        type: "string",
                        description: "Variation name (e.g., 'Size', 'Crust Type')",
                        example: "Size",
                    },
                    type: {
                        type: "string",
                        enum: ["RADIO", "CHECKBOX"],
                        description: "Selection type: RADIO (single) or CHECKBOX (multiple)",
                        example: "RADIO",
                    },
                    isRequired: {
                        type: "boolean",
                        default: true,
                        description: "Is this variation required",
                    },
                    displayOrder: {
                        type: "integer",
                        default: 0,
                        description: "Display order",
                    },
                },
            },
            UpdateProductVariationRequest: {
                type: "object",
                description: "Request to update a product variation",
                properties: {
                    name: {
                        type: "string",
                        description: "Variation name",
                        example: "Updated Size",
                    },
                    type: {
                        type: "string",
                        enum: ["RADIO", "CHECKBOX"],
                        description: "Selection type",
                    },
                    isRequired: {
                        type: "boolean",
                        description: "Is this variation required",
                    },
                    displayOrder: {
                        type: "integer",
                        description: "Display order",
                    },
                },
            },
            ProductVariation: {
                type: "object",
                description: "Product variation response",
                properties: {
                    id: {
                        type: "string",
                        description: "Variation ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    menuItemId: {
                        type: "string",
                        description: "Menu item ID",
                    },
                    name: {
                        type: "string",
                        description: "Variation name",
                        example: "Size",
                    },
                    type: {
                        type: "string",
                        enum: ["RADIO", "CHECKBOX"],
                        description: "Selection type",
                    },
                    isRequired: {
                        type: "boolean",
                        description: "Is required",
                    },
                    displayOrder: {
                        type: "integer",
                        description: "Display order",
                    },
                    options: {
                        type: "array",
                        description: "Variation options",
                        items: {
                            $ref: "#/components/schemas/VariationOption",
                        },
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                    },
                },
            },
            CreateVariationOptionRequest: {
                type: "object",
                required: ["variationId", "name", "priceModifier"],
                description: "Request to create a variation option",
                properties: {
                    variationId: {
                        type: "string",
                        format: "uuid",
                        description: "Variation ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: {
                        type: "string",
                        description: "Option name (e.g., 'Small', 'Large')",
                        example: "Large",
                    },
                    priceModifier: {
                        type: "number",
                        description: "Additional price for this option",
                        example: 2.50,
                    },
                    displayOrder: {
                        type: "integer",
                        default: 0,
                        description: "Display order",
                    },
                },
            },
            UpdateVariationOptionRequest: {
                type: "object",
                description: "Request to update a variation option",
                properties: {
                    name: {
                        type: "string",
                        description: "Option name",
                        example: "Extra Large",
                    },
                    priceModifier: {
                        type: "number",
                        description: "Price modifier",
                        example: 3.00,
                    },
                    displayOrder: {
                        type: "integer",
                        description: "Display order",
                    },
                },
            },
            VariationOption: {
                type: "object",
                description: "Variation option response",
                properties: {
                    id: {
                        type: "string",
                        description: "Option ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    variationId: {
                        type: "string",
                        description: "Variation ID",
                    },
                    name: {
                        type: "string",
                        description: "Option name",
                        example: "Large",
                    },
                    priceModifier: {
                        type: "number",
                        description: "Price modifier",
                        example: 2.50,
                    },
                    displayOrder: {
                        type: "integer",
                        description: "Display order",
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                    },
                },
            },
            CreateProductAddOnRequest: {
                type: "object",
                required: ["menuItemId", "name"],
                description: "Request to create a product add-on",
                properties: {
                    menuItemId: {
                        type: "string",
                        format: "uuid",
                        description: "Menu item ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: {
                        type: "string",
                        description: "Add-on name (e.g., 'Extra Toppings', 'Additional Sauce')",
                        example: "Choose your extra topping for scope",
                    },
                    isRequired: {
                        type: "boolean",
                        default: false,
                        description: "Is this add-on required",
                    },
                    maxSelection: {
                        type: "integer",
                        default: 1,
                        description: "Maximum number of options to select",
                    },
                    displayOrder: {
                        type: "integer",
                        default: 0,
                        description: "Display order",
                    },
                },
            },
            UpdateProductAddOnRequest: {
                type: "object",
                description: "Request to update a product add-on",
                properties: {
                    name: {
                        type: "string",
                        description: "Add-on name",
                        example: "Updated Extra Toppings",
                    },
                    isRequired: {
                        type: "boolean",
                        description: "Is required",
                    },
                    maxSelection: {
                        type: "integer",
                        description: "Maximum selections",
                    },
                    displayOrder: {
                        type: "integer",
                        description: "Display order",
                    },
                },
            },
            ProductAddOn: {
                type: "object",
                description: "Product add-on response",
                properties: {
                    id: {
                        type: "string",
                        description: "Add-on ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    menuItemId: {
                        type: "string",
                        description: "Menu item ID",
                    },
                    name: {
                        type: "string",
                        description: "Add-on name",
                        example: "Extra Toppings",
                    },
                    isRequired: {
                        type: "boolean",
                        description: "Is required",
                    },
                    maxSelection: {
                        type: "integer",
                        description: "Maximum selections",
                    },
                    displayOrder: {
                        type: "integer",
                        description: "Display order",
                    },
                    options: {
                        type: "array",
                        description: "Add-on options",
                        items: {
                            $ref: "#/components/schemas/AddOnOption",
                        },
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                    },
                },
            },
            CreateAddOnOptionRequest: {
                type: "object",
                required: ["addOnId", "name", "price"],
                description: "Request to create an add-on option",
                properties: {
                    addOnId: {
                        type: "string",
                        format: "uuid",
                        description: "Add-on ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: {
                        type: "string",
                        description: "Option name (e.g., 'Pickled red cabbage', 'Hummus')",
                        example: "Pickled red cabbage",
                    },
                    price: {
                        type: "number",
                        description: "Price of this add-on option",
                        example: 0.40,
                    },
                    displayOrder: {
                        type: "integer",
                        default: 0,
                        description: "Display order",
                    },
                },
            },
            UpdateAddOnOptionRequest: {
                type: "object",
                description: "Request to update an add-on option",
                properties: {
                    name: {
                        type: "string",
                        description: "Option name",
                        example: "Updated Hummus",
                    },
                    price: {
                        type: "number",
                        description: "Price",
                        example: 0.50,
                    },
                    displayOrder: {
                        type: "integer",
                        description: "Display order",
                    },
                },
            },
            AddOnOption: {
                type: "object",
                description: "Add-on option response",
                properties: {
                    id: {
                        type: "string",
                        description: "Option ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    addOnId: {
                        type: "string",
                        description: "Add-on ID",
                    },
                    name: {
                        type: "string",
                        description: "Option name",
                        example: "Pickled red cabbage",
                    },
                    price: {
                        type: "number",
                        description: "Price",
                        example: 0.40,
                    },
                    displayOrder: {
                        type: "integer",
                        description: "Display order",
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                    },
                },
            },
            // Cart Schemas
            AddToCartRequest: {
                type: "object",
                required: ["userId", "menuItemId", "restaurantId"],
                description: "Request to add item to cart",
                properties: {
                    userId: {
                        type: "string",
                        format: "uuid",
                        description: "User ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    menuItemId: {
                        type: "string",
                        format: "uuid",
                        description: "Menu item ID",
                        example: "550e8400-e29b-41d4-a716-446655440000",
                    },
                    restaurantId: {
                        type: "string",
                        format: "uuid",
                        description: "Restaurant ID (user ID of restaurant owner)",
                        example: "660e8400-e29b-41d4-a716-446655440000",
                    },
                    quantity: {
                        type: "integer",
                        default: 1,
                        description: "Quantity to add",
                        example: 1,
                    },
                    specialNotes: {
                        type: "string",
                        description: "Special notes/requests",
                        example: "Extra spicy, no onions",
                    },
                },
            },
            UpdateCartItemRequest: {
                type: "object",
                description: "Request to update cart item",
                properties: {
                    userId: {
                        type: "string",
                        format: "uuid",
                        description: "User ID (required for verification)",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    quantity: {
                        type: "integer",
                        description: "New quantity",
                        example: 2,
                    },
                    specialNotes: {
                        type: "string",
                        description: "Updated special notes",
                        example: "Extra spicy",
                    },
                },
            },
            Cart: {
                type: "object",
                description: "Cart response",
                properties: {
                    id: {
                        type: "string",
                        description: "Cart ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    userId: {
                        type: "string",
                        description: "User ID",
                    },
                    items: {
                        type: "array",
                        description: "Cart items",
                        items: {
                            $ref: "#/components/schemas/CartItem",
                        },
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                    },
                },
            },
            CartItem: {
                type: "object",
                description: "Cart item response",
                properties: {
                    id: {
                        type: "string",
                        description: "Cart item ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    cartId: {
                        type: "string",
                        description: "Cart ID",
                    },
                    restaurantId: {
                        type: "string",
                        description: "Restaurant ID",
                    },
                    menuItemId: {
                        type: "string",
                        description: "Menu item ID",
                    },
                    quantity: {
                        type: "integer",
                        description: "Quantity",
                        example: 1,
                    },
                    specialNotes: {
                        type: "string",
                        nullable: true,
                        description: "Special notes",
                        example: "Extra spicy",
                    },
                    menuItem: {
                        type: "object",
                        description: "Menu item details",
                        properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            price: { type: "number" },
                            image: { type: "string", nullable: true },
                        },
                    },
                    restaurant: {
                        type: "object",
                        description: "Restaurant details",
                        properties: {
                            userId: { type: "string" },
                            mainCategory: { type: "string" },
                            user: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                },
                            },
                        },
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                    },
                },
            },
            CartSummary: {
                type: "object",
                description: "Cart summary response",
                properties: {
                    cartId: {
                        type: "string",
                        description: "Cart ID",
                    },
                    totalItems: {
                        type: "integer",
                        description: "Total number of items",
                        example: 3,
                    },
                    totalPrice: {
                        type: "number",
                        description: "Total price",
                        example: 13.20,
                    },
                    restaurants: {
                        type: "array",
                        description: "Items grouped by restaurant",
                        items: {
                            type: "object",
                            properties: {
                                restaurantId: { type: "string" },
                                restaurantName: { type: "string", example: "Rozna restaurant" },
                                subtotal: { type: "number", example: 8.80 },
                                items: {
                                    type: "array",
                                    items: { type: "object" },
                                },
                            },
                        },
                    },
                },
            },
            ClearCartRequest: {
                type: "object",
                required: ["userId"],
                description: "Request to clear cart",
                properties: {
                    userId: {
                        type: "string",
                        format: "uuid",
                        description: "User ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                },
            },
            RemoveCartItemRequest: {
                type: "object",
                required: ["userId"],
                description: "Request to remove cart item",
                properties: {
                    userId: {
                        type: "string",
                        format: "uuid",
                        description: "User ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                },
            },
            // Favourite Cart Schemas
            CreateFavouriteCartRequest: {
                type: "object",
                required: ["name"],
                description: "Request to create a favourite cart",
                properties: {
                    userId: {
                        type: "string",
                        format: "uuid",
                        description: "User ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: {
                        type: "string",
                        description: "Name of the favourite cart",
                        example: "My Daily Order",
                    },
                    description: {
                        type: "string",
                        description: "Optional description",
                        example: "My regular breakfast order",
                    },
                },
            },
            UpdateFavouriteCartRequest: {
                type: "object",
                description: "Request to update a favourite cart",
                properties: {
                    name: {
                        type: "string",
                        description: "Updated name",
                        example: "Updated Name",
                    },
                    description: {
                        type: "string",
                        description: "Updated description",
                        example: "Updated description",
                    },
                },
            },
            FavouriteCart: {
                type: "object",
                description: "Favourite cart response",
                properties: {
                    id: {
                        type: "string",
                        description: "Favourite cart ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    userId: {
                        type: "string",
                        description: "User ID",
                    },
                    name: {
                        type: "string",
                        description: "Cart name",
                        example: "My Daily Order",
                    },
                    description: {
                        type: "string",
                        nullable: true,
                        description: "Cart description",
                    },
                    items: {
                        type: "array",
                        description: "Cart items",
                        items: {
                            $ref: "#/components/schemas/FavouriteCartItem",
                        },
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                    },
                },
            },
            AddToFavouriteCartRequest: {
                type: "object",
                required: ["menuItemId", "restaurantId"],
                description: "Request to add item to favourite cart",
                properties: {
                    menuItemId: {
                        type: "string",
                        format: "uuid",
                        description: "Menu item ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    restaurantId: {
                        type: "string",
                        format: "uuid",
                        description: "Restaurant ID",
                        example: "660e8400-e29b-41d4-a716-446655440000",
                    },
                    quantity: {
                        type: "integer",
                        default: 1,
                        description: "Quantity",
                        example: 1,
                    },
                    specialNotes: {
                        type: "string",
                        description: "Special notes",
                        example: "Extra spicy",
                    },
                },
            },
            UpdateFavouriteCartItemRequest: {
                type: "object",
                description: "Request to update favourite cart item",
                properties: {
                    quantity: {
                        type: "integer",
                        description: "New quantity",
                        example: 2,
                    },
                    specialNotes: {
                        type: "string",
                        description: "Updated special notes",
                        example: "Extra spicy",
                    },
                },
            },
            FavouriteCartItem: {
                type: "object",
                description: "Favourite cart item response",
                properties: {
                    id: {
                        type: "string",
                        description: "Item ID",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    favouriteCartId: {
                        type: "string",
                        description: "Favourite cart ID",
                    },
                    restaurantId: {
                        type: "string",
                        description: "Restaurant ID",
                    },
                    menuItemId: {
                        type: "string",
                        description: "Menu item ID",
                    },
                    quantity: {
                        type: "integer",
                        description: "Quantity",
                        example: 1,
                    },
                    specialNotes: {
                        type: "string",
                        nullable: true,
                        description: "Special notes",
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                    },
                },
            },
            RestoreFavouriteCartRequest: {
                type: "object",
                description: "Request to restore favourite cart to current cart",
                properties: {
                    replaceCurrent: {
                        type: "boolean",
                        default: false,
                        description: "If true, clear current cart before adding. If false, add to current cart",
                    },
                },
            },
            FavouriteCartSummary: {
                type: "object",
                description: "Favourite cart summary response",
                properties: {
                    favouriteCartId: {
                        type: "string",
                        description: "Favourite cart ID",
                    },
                    totalItems: {
                        type: "integer",
                        description: "Total number of items",
                        example: 3,
                    },
                    totalPrice: {
                        type: "number",
                        description: "Total price",
                        example: 13.20,
                    },
                    restaurants: {
                        type: "array",
                        description: "Items grouped by restaurant",
                        items: {
                            type: "object",
                            properties: {
                                restaurantId: { type: "string" },
                                restaurantName: { type: "string" },
                                subtotal: { type: "number" },
                                items: {
                                    type: "array",
                                    items: { type: "object" },
                                },
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
        {
            name: "Product Detail",
            description: "Product detail, variations, and add-ons management endpoints",
        },
        {
            name: "Product Detail - Variations",
            description: "Product variation management endpoints",
        },
        {
            name: "Product Detail - Variation Options",
            description: "Variation option management endpoints",
        },
        {
            name: "Product Detail - Add-Ons",
            description: "Product add-on management endpoints",
        },
        {
            name: "Product Detail - Add-On Options",
            description: "Add-on option management endpoints",
        },
        {
            name: "Cart",
            description: "Shopping cart management endpoints",
        },
        {
            name: "Favourite Cart",
            description: "Favourite cart management endpoints for saved orders",
        },
    ],
};

const options = {
    definition: swaggerDefinition,
    apis: ["./src/routes/**/*.ts", "./src/modules/**/*.routes.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);

