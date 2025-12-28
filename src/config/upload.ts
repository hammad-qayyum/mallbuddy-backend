import multer from "multer";
import path from "path";
import fs from "fs";

// Define upload directories for different image types
const uploadDirs = {
  profilePictures: path.join(process.cwd(), "uploads", "profile-pictures"),
  menuItems: path.join(process.cwd(), "uploads", "menu-items"),
  cuisineCategories: path.join(process.cwd(), "uploads", "cuisine-categories"),
  restaurants: path.join(process.cwd(), "uploads", "restaurants"),
  restaurantGallery: path.join(process.cwd(), "uploads", "restaurants", "gallery"),
  promotions: path.join(process.cwd(), "uploads", "promotions"),
  malls: path.join(process.cwd(), "uploads", "malls"),
};

// Ensure all upload directories exist
Object.values(uploadDirs).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper function to create multer storage for a specific directory
const createStorage = (destination: string) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destination);
    },
    filename: (req, file, cb) => {
      // Generate unique filename: timestamp-random-originalname
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext);
      cb(null, `${baseName}-${uniqueSuffix}${ext}`);
    },
  });
};

// File filter to accept only images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."));
  }
};

// File filter for promotion banners (PNG and JPEG only)
const promotionBannerFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png"];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PNG and JPEG images are allowed for promotion banners."));
  }
};

// Common multer configuration options
const multerOptions = {
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
};

// Configure multer for different image types
export const uploadProfilePicture = multer({
  storage: createStorage(uploadDirs.profilePictures),
  ...multerOptions,
});

export const uploadMenuItemImage = multer({
  storage: createStorage(uploadDirs.menuItems),
  ...multerOptions,
});

export const uploadCuisineCategoryImage = multer({
  storage: createStorage(uploadDirs.cuisineCategories),
  ...multerOptions,
});

export const uploadRestaurantBanner = multer({
  storage: createStorage(uploadDirs.restaurants),
  ...multerOptions,
});

export const uploadRestaurantGallery = multer({
  storage: createStorage(uploadDirs.restaurantGallery),
  ...multerOptions,
});

export const uploadMallImage = multer({
  storage: createStorage(uploadDirs.malls),
  ...multerOptions,
});

// Promotion banner upload (2MB limit, PNG/JPEG only)
export const uploadPromotionBanner = multer({
  storage: createStorage(uploadDirs.promotions),
  fileFilter: promotionBannerFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
});

// Helper functions to get URL paths for uploaded files
export const getProfilePictureUrl = (filename: string): string => {
  return `/uploads/profile-pictures/${filename}`;
};

export const getMenuItemImageUrl = (filename: string): string => {
  return `/uploads/menu-items/${filename}`;
};

export const getCuisineCategoryImageUrl = (filename: string): string => {
  return `/uploads/cuisine-categories/${filename}`;
};

export const getRestaurantBannerUrl = (filename: string): string => {
  return `/uploads/restaurants/${filename}`;
};

export const getRestaurantGalleryUrl = (filename: string): string => {
  return `/uploads/restaurants/gallery/${filename}`;
};

export const getMallImageUrl = (filename: string): string => {
  return `/uploads/malls/${filename}`;
};

export const getPromotionBannerUrl = (filename: string): string => {
  return `/uploads/promotions/${filename}`;
};

// Helper function to delete old image file
export const deleteImageFile = (imagePath: string): void => {
  if (!imagePath) return;
  
  // Check if it's a local file (starts with /uploads)
  if (imagePath.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), imagePath);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error("Error deleting image file:", error);
      }
    }
  }
};