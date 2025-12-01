# Mall Food Delivery API

A RESTful API for a Mall Food Delivery Application built with Express.js, TypeScript, Prisma, and Better Auth.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [API Endpoints](#api-endpoints)
- [Postman Testing Guide](#postman-testing-guide)
- [Project Structure](#project-structure)

## ✨ Features

- User authentication (register, login, logout)
- User profile management
- Password change functionality
- Session management with Better Auth
- Swagger API documentation
- Type-safe with TypeScript
- Input validation with Zod

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (via Prisma)
- **Authentication**: Better Auth
- **Validation**: Zod
- **Documentation**: Swagger/OpenAPI

## 📦 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

## 🚀 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mall_food_delivery_app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see [Environment Variables](#environment-variables))

4. Set up the database:
```bash
npx prisma generate
npx prisma migrate dev
```

5. Start the development server:
```bash
npm run dev
```

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mall_food_delivery"
PORT=5000
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:5000"
```

## 🏃 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

The server will run on `http://localhost:5000` (or the PORT specified in your `.env` file).

## 📚 API Documentation

### Swagger UI

Once the server is running, access the interactive API documentation at:
```
http://localhost:5000/api-docs
```

The Swagger UI provides:
- Complete API endpoint documentation
- Request/response schemas
- Try-it-out functionality
- Authentication testing

## 🔌 API Endpoints

### Base URL
```
http://localhost:5000/api
```

### Health Check
- **GET** `/` - Check if API is running

### Authentication Endpoints
- **POST** `/auth/register` - Register a new user
- **POST** `/auth/login` - Login user
- **POST** `/auth/logout` - Logout user
- **GET** `/auth/me` - Get current session

### User Endpoints (Protected)
- **GET** `/users/me` - Get current user profile
- **PATCH** `/users/me` - Update user profile
- **PATCH** `/users/me/password` - Change password
- **DELETE** `/users/me` - Delete user profile

## 📮 Postman Testing Guide

### Setup

1. **Import Postman Collection** (Optional)
   - Create a new collection in Postman named "Mall Food Delivery API"
   - Set base URL as environment variable: `{{baseUrl}}` = `http://localhost:5000/api`

2. **Enable Cookie Handling**
   - Go to Postman Settings → General
   - Enable "Automatically follow redirects"
   - Cookies are automatically handled by Postman

### Testing Endpoints

#### 1. Health Check

**Request:**
- **Method**: `GET`
- **URL**: `http://localhost:5000/api/`
- **Headers**: None
- **Body**: None

**Expected Response:**
```json
{
  "message": "Mall Delivery Backend API is running"
}
```

---

#### 2. Register User (with Email)

**Request:**
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/auth/register`
- **Headers**: 
  ```
  Content-Type: application/json
  ```
- **Body** (raw JSON):
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Expected Response (201):**
```json
{
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "session": {
    "id": "session-id",
    "userId": "user-id"
  }
}
```

**Alternative: Register with Phone Number**
```json
{
  "name": "Jane Smith",
  "phoneNumber": "+1234567890",
  "password": "password123"
}
```

**Note**: After registration, Postman will automatically save the session cookie for subsequent requests.

---

#### 3. Login User (with Email)

**Request:**
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/auth/login`
- **Headers**: 
  ```
  Content-Type: application/json
  ```
- **Body** (raw JSON):
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Expected Response (200):**
```json
{
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "session": {
    "id": "session-id",
    "userId": "user-id"
  }
}
```

**Alternative: Login with Phone Number**
```json
{
  "phoneNumber": "+1234567890",
  "password": "password123"
}
```

**Important**: After login, Postman automatically saves the session cookie. This cookie will be sent with all subsequent requests.

---

#### 4. Get Current Session

**Request:**
- **Method**: `GET`
- **URL**: `http://localhost:5000/api/auth/me`
- **Headers**: None (cookie is sent automatically)
- **Body**: None

**Expected Response (200):**
```json
{
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "session": {
    "id": "session-id",
    "userId": "user-id"
  }
}
```

**Error Response (401):**
```json
{
  "message": "Not authenticated"
}
```

---

#### 5. Get Current User Profile (Protected)

**Request:**
- **Method**: `GET`
- **URL**: `http://localhost:5000/api/users/me`
- **Headers**: None (cookie is sent automatically)
- **Body**: None

**Expected Response (200):**
```json
{
  "id": "user-id",
  "name": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "firstName": null,
  "lastName": null,
  "image": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Response (401):**
```json
{
  "message": "Unauthorized"
}
```

---

#### 6. Update User Profile (Protected)

**Request:**
- **Method**: `PATCH`
- **URL**: `http://localhost:5000/api/users/me`
- **Headers**: 
  ```
  Content-Type: application/json
  ```
- **Body** (raw JSON):
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "12345678901",
  "image": "https://example.com/profile.jpg"
}
```

**Note**: All fields are optional. You can update any combination of fields.

**Expected Response (200):**
```json
{
  "id": "user-id",
  "name": "John Doe",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "12345678901",
  "image": "https://example.com/profile.jpg",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Response (400) - Validation Error:**
```json
{
  "fieldErrors": {
    "firstName": ["First name is required"],
    "image": ["Image must be a valid URL"]
  }
}
```

---

#### 7. Change Password (Protected)

**Request:**
- **Method**: `PATCH`
- **URL**: `http://localhost:5000/api/users/me/password`
- **Headers**: 
  ```
  Content-Type: application/json
  ```
- **Body** (raw JSON):
```json
{
  "currentPassword": "password123",
  "newPassword": "newpassword123"
}
```

**Expected Response (200):**
```json
{
  "message": "Password updated successfully"
}
```

**Error Response (400) - Wrong Current Password:**
```json
{
  "message": "Current password is incorrect"
}
```

**Error Response (400) - Validation Error:**
```json
{
  "fieldErrors": {
    "currentPassword": ["Current password is required"],
    "newPassword": ["New password must be atleast 6 characters"]
  }
}
```

---

#### 8. Logout User

**Request:**
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/auth/logout`
- **Headers**: None (cookie is sent automatically)
- **Body**: None

**Expected Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**Note**: After logout, the session cookie is cleared. You'll need to login again to access protected routes.

---

#### 9. Delete User Profile (Protected)

**Request:**
- **Method**: `DELETE`
- **URL**: `http://localhost:5000/api/users/me`
- **Headers**: None (cookie is sent automatically)
- **Body**: None

**Expected Response (204):**
- No content (empty response)

**Note**: This permanently deletes the user account and all associated data.

---

### Testing Workflow

**Recommended Testing Order:**

1. ✅ **Health Check** - Verify API is running
2. ✅ **Register User** - Create a new account
3. ✅ **Login User** - Login with credentials (cookie saved automatically)
4. ✅ **Get Current Session** - Verify authentication works
5. ✅ **Get User Profile** - Test protected route
6. ✅ **Update Profile** - Modify user information
7. ✅ **Change Password** - Update password
8. ✅ **Get User Profile** - Verify changes
9. ✅ **Logout** - Clear session
10. ✅ **Try Protected Route** - Should return 401 Unauthorized

### Common Issues & Solutions

#### Issue: Getting 401 Unauthorized on Protected Routes

**Solution:**
1. Make sure you've logged in first (POST `/auth/login`)
2. Check that Postman is sending cookies (Settings → General → Enable cookies)
3. Verify the session cookie is present in the Cookies tab
4. Try logging in again to refresh the session

#### Issue: Validation Errors

**Solution:**
- Check the request body matches the schema exactly
- Ensure required fields are present
- Verify field formats (email format, phone number pattern, etc.)
- Check minimum length requirements

#### Issue: Cookie Not Being Sent

**Solution:**
1. In Postman, go to the request
2. Click on the "Cookies" link below the URL bar
3. Manually add the cookie if needed:
   - Name: `better-auth.session_token`
   - Value: (from login response)
   - Domain: `localhost`

### Postman Collection Variables

Create environment variables in Postman:

| Variable | Value | Description |
|----------|-------|-------------|
| `baseUrl` | `http://localhost:5000/api` | Base API URL |
| `email` | `john@example.com` | Test user email |
| `password` | `password123` | Test user password |

Then use in requests: `{{baseUrl}}/auth/login`

## 📁 Project Structure

```
mall_food_delivery_app/
├── src/
│   ├── config/
│   │   ├── env.ts          # Environment configuration
│   │   ├── prisma.ts       # Prisma client
│   │   └── swagger.ts      # Swagger configuration
│   ├── libs/
│   │   └── betterauth.ts   # Better Auth setup
│   ├── middlewares/
│   │   ├── attach-auth.middleware.ts  # Attach auth to request
│   │   ├── auth.middleware.ts         # Require auth middleware
│   │   └── error.middleware.ts        # Error handling
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts    # Auth controllers
│   │   │   ├── auth.routes.ts        # Auth routes
│   │   │   ├── auth.schema.ts        # Auth validation schemas
│   │   │   ├── auth.service.ts       # Auth business logic
│   │   │   └── betterauth.routes.ts  # Better Auth routes
│   │   ├── users/
│   │   │   ├── user.controller.ts    # User controllers
│   │   │   ├── user.routes.ts        # User routes
│   │   │   ├── user.schema.ts        # User validation schemas
│   │   │   └── user.service.ts       # User business logic
│   │   └── common/
│   │       ├── errors.ts             # Error definitions
│   │       ├── types.ts              # Common types
│   │       └── utils.ts              # Utility functions
│   ├── routes/
│   │   └── index.ts                  # Main router
│   ├── app.ts                        # Express app setup
│   └── server.ts                     # Server entry point
├── prisma/
│   └── schema.prisma                 # Database schema
├── .env                              # Environment variables
├── package.json                      # Dependencies
└── README.md                         # This file
```

## 📝 Notes

- All protected routes require authentication via session cookie
- Session cookies are automatically managed by Better Auth
- Password must be at least 6 characters
- Phone numbers must match pattern: `^\+?[1-9]\d{9,14}$`
- Email or phone number is required for registration/login (at least one)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

---

**Happy Coding! 🚀**

