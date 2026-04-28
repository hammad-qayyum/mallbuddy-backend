// import { PrismaClient } from "../generated/prisma/client";

// const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

// export const prisma =
//   globalForPrisma.prisma ??
//   new PrismaClient({
//     log: ["query", "error", "warn"],
//   });

// if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// export default prisma;



import { PrismaClient as PrismaClientValue } from "../generated/prisma/client";
import type { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new (PrismaClientValue as unknown as { new(options?: unknown): PrismaClient })({

    log: ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;