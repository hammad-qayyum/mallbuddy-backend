import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "../config/prisma";
export const auth = betterAuth({
  basePath: "/api/auth/better-auth",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
  },

  advanced: {
    cookies: {
      sessionToken: {
        attributes: {
          httpOnly: true,
          secure: false,
          sameSite: "none",
          path: "/",
        },
      },
    },
  },
});