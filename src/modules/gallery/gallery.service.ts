import prisma from "../../config/prisma";
import { deleteImageFile } from "../../config/upload";
import { randomUUID } from "crypto";

function hasGalleryModel() {
  try {
    const m = (prisma as any).restaurantGallery;
    return !!(m && typeof m.findMany === "function");
  } catch (e) {
    return false;
  }
}

function isValidImageUrl(url: string): boolean {
  const trimmed = String(url).trim();
  return trimmed.startsWith('/') || trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

export const galleryService = {
  async getRestaurantGallery(id: string) {
    try {
      const restaurant = await prisma.restaurant.findUnique({
        where: { userId: id },
        select: { userId: true, name: true },
      });

      if (!restaurant) return null;

      let galleryRows: { id: string; imageUrl: string }[] = [];
      if (hasGalleryModel()) {
        galleryRows = await (prisma as any).restaurantGallery.findMany({
          where: { restaurantId: id },
          select: { id: true, imageUrl: true },
          orderBy: { createdAt: "asc" },
        });
      } else {
        galleryRows = (await prisma.$queryRaw`
          SELECT "id", "imageUrl"
          FROM "RestaurantGallery"
          WHERE "restaurantId" = ${id}
          ORDER BY "createdAt" ASC
        `) as { id: string; imageUrl: string }[];
      }

      const gallery = galleryRows.map((g) => ({ id: g.id, imageUrl: g.imageUrl }));

      return {
        userId: restaurant.userId,
        name: restaurant.name ?? "",
        gallery,
      };
    } catch (err) {
      console.error('[galleryService] getRestaurantGallery error:', (err as any)?.stack || err, { id });
      throw err;
    }
  },

  async addGalleryImages(id: string, imageUrls: string[]) {
    const restaurant = await prisma.restaurant.findUnique({ where: { userId: id }, select: { userId: true } });
    if (!restaurant) return null;

    if (!imageUrls || imageUrls.length === 0) return [];

    console.log('[galleryService] addGalleryImages called', { restaurantId: id, imageCount: imageUrls.length });

    try {
      // dedupe incoming URLs to avoid accidental double-inserts
      const uniqUrls = Array.from(new Set(imageUrls.map(String)));
      // filter only valid image URLs (must start with / or http://https://)
      const validUrls = uniqUrls.filter((url) => isValidImageUrl(url));
      const invalidCount = uniqUrls.length - validUrls.length;
      if (invalidCount > 0) {
        console.log('[galleryService] filtered out invalid URLs', { restaurantId: id, total: uniqUrls.length, valid: validUrls.length, invalid: invalidCount });
      }
      const createData = validUrls.map((imageUrl) => ({ restaurantId: id, imageUrl }));
      if (hasGalleryModel() && (prisma as any).restaurantGallery.createMany) {
        await (prisma as any).restaurantGallery.createMany({ data: createData });
      } else {
        // fallback to individual inserts using raw SQL
        for (const d of createData) {
          await prisma.$queryRaw`
            INSERT INTO "RestaurantGallery" ("id", "restaurantId", "imageUrl", "createdAt") VALUES (${randomUUID()}, ${d.restaurantId}, ${d.imageUrl}, now())
          `;
        }
      }
    } catch (err) {
      console.error('[galleryService] failed creating gallery rows via createMany', { restaurantId: id, error: (err as any)?.stack || err });
      // If bulk insert failed (possibly partial success), insert only missing imageUrls
      const uniqUrls = Array.from(new Set(imageUrls.map(String)));
      // filter only valid image URLs
      const validUrls = uniqUrls.filter((url) => isValidImageUrl(url));
      // find existing urls for this restaurant
      let existing: string[] = [];
      try {
        if (hasGalleryModel()) {
          const rows = await (prisma as any).restaurantGallery.findMany({ where: { restaurantId: id, imageUrl: { in: validUrls } }, select: { imageUrl: true } });
          existing = rows.map((r: any) => r.imageUrl);
        } else {
          const rows = (await prisma.$queryRaw`
            SELECT "imageUrl" FROM "RestaurantGallery" WHERE "restaurantId" = ${id} AND "imageUrl" = ANY(${validUrls})
          `) as { imageUrl: string }[] | undefined;
          existing = (rows || []).map((r) => r.imageUrl);
        }
      } catch (e) {
        console.error('[galleryService] error fetching existing urls in fallback', { restaurantId: id, error: (e as any)?.stack || e });
      }

      const toInsert = uniqUrls.filter((u) => !existing.includes(u));
      for (const imageUrl of toInsert) {
        try {
          if (hasGalleryModel() && (prisma as any).restaurantGallery.create) {
            await (prisma as any).restaurantGallery.create({ data: { restaurantId: id, imageUrl } });
          } else {
            await prisma.$queryRaw`
              INSERT INTO "RestaurantGallery" ("id", "restaurantId", "imageUrl", "createdAt") VALUES (${randomUUID()}, ${id}, ${imageUrl}, now())
            `;
          }
        } catch (innerErr) {
          console.error('[galleryService] fallback create failed', { restaurantId: id, imageUrl, error: (innerErr as any)?.stack || innerErr });
        }
      }
    }

    try {
      let all: { id: string; imageUrl: string; createdAt?: Date }[] = [];
      if (hasGalleryModel()) {
        all = await (prisma as any).restaurantGallery.findMany({
          where: { restaurantId: id },
          select: { id: true, imageUrl: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        });
      } else {
        all = (await prisma.$queryRaw`
          SELECT "id", "imageUrl", "createdAt"
          FROM "RestaurantGallery"
          WHERE "restaurantId" = ${id}
          ORDER BY "createdAt" ASC
        `) as { id: string; imageUrl: string; createdAt?: Date }[];
      }
      console.log('[galleryService] addGalleryImages done, totalRows:', all.length);
      return all;
    } catch (err) {
      console.error('[galleryService] failed fetching gallery rows after insert', { restaurantId: id, error: (err as any)?.stack || err });
      throw err;
    }
  },

  async deleteGalleryImage(restaurantId: string, galleryId: string) {
    let row: { id: string; restaurantId: string; imageUrl: string } | null = null;
    if (hasGalleryModel()) {
      row = await (prisma as any).restaurantGallery.findUnique({ where: { id: galleryId } });
    } else {
      const rows = ((await prisma.$queryRaw`
        SELECT "id", "restaurantId", "imageUrl"
        FROM "RestaurantGallery"
        WHERE "id" = ${galleryId}
      `) as unknown) as { id: string; restaurantId: string; imageUrl: string }[] | undefined;
      const first = (rows && rows.length) ? (rows[0] as { id: string; restaurantId: string; imageUrl: string }) : null;
      row = first ?? null;
    }

    if (!row) return null;
    if (row.restaurantId !== restaurantId) return null;

    if (hasGalleryModel()) {
      await (prisma as any).restaurantGallery.delete({ where: { id: galleryId } });
    } else {
      await prisma.$queryRaw`
        DELETE FROM "RestaurantGallery" WHERE "id" = ${galleryId}
      `;
    }

    if (row.imageUrl && row.imageUrl.startsWith("/uploads/")) {
      try {
        deleteImageFile(row.imageUrl);
      } catch (e) {
        // ignore
      }
    }

    return { id: row.id, restaurantId: row.restaurantId, imageUrl: row.imageUrl };
  },
};

export default galleryService;
