import multer from "multer";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";

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

// I2 — Magic-byte verification middleware (post-multer).
// `file.mimetype` from multer is set by the *client* and easily spoofed.
// Without checking the actual file bytes, an attacker can rename a `.html`
// or `.svg` to `.jpg` with a fake `Content-Type` and have it served from
// `/uploads`. Read the first ~12 bytes of every saved upload and reject
// (delete) anything that isn't a real JPEG / PNG / GIF / WebP.
const IMAGE_MAGIC = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  gif87: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
  gif89: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
};

function startsWith(buf: Buffer, sig: number[]): boolean {
  if (buf.length < sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (buf[i] !== sig[i]) return false;
  return true;
}

function isImageBytes(buf: Buffer): boolean {
  if (startsWith(buf, IMAGE_MAGIC.jpeg)) return true;
  if (startsWith(buf, IMAGE_MAGIC.png)) return true;
  if (startsWith(buf, IMAGE_MAGIC.gif87) || startsWith(buf, IMAGE_MAGIC.gif89)) return true;
  // WebP: bytes 0..3 = "RIFF", bytes 8..11 = "WEBP"
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return true;
  return false;
}

function readHead(filePath: string): Buffer {
  const fd = fs.openSync(filePath, "r");
  try {
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    return buf;
  } finally {
    fs.closeSync(fd);
  }
}

function safeUnlink(filePath: string) {
  try { fs.unlinkSync(filePath); } catch { /* best-effort */ }
}

/**
 * Use this AFTER any multer upload middleware. Verifies that each saved file
 * actually has image magic bytes; deletes spoofed files and returns 400.
 */
export function verifyUploadedImagesAreReal(req: Request, res: Response, next: NextFunction) {
  const files: Express.Multer.File[] = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  else if (req.files && typeof req.files === "object") {
    for (const key of Object.keys(req.files)) {
      const v = (req.files as any)[key];
      if (Array.isArray(v)) files.push(...v);
    }
  }

  for (const f of files) {
    try {
      const head = readHead(f.path);
      if (!isImageBytes(head)) {
        // Wipe the spoofed file before responding so it can't be linked.
        safeUnlink(f.path);
        return res.status(400).json({
          success: false,
          error: "Uploaded file is not a valid image",
        });
      }
    } catch (err) {
      // If we can't even read the file, refuse it.
      safeUnlink(f.path);
      return res.status(400).json({
        success: false,
        error: "Could not verify uploaded file",
      });
    }
  }

  next();
}

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